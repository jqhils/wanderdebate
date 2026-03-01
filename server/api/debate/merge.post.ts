import { z } from 'zod'

import { useServerSupabase, rowToVersion, rowToMessage } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/auth'
import {
  MINIMAX_MODEL,
  QUALITY_MODEL,
  LlmResponseSchema,
  assignActivityIds,
  callAgentWithRetry,
  computeChangesSummary,
} from '../../utils/llm'
import {
  buildMergePrompt,
  fetchUserConstraints,
  getSystemPrompt,
} from '../../utils/agentPrompts'

const MergeBody = z.object({
  sessionId: z.string().uuid(),
  versionNumber: z.number().int().nonnegative(),
})

export default defineEventHandler(async (event) => {
  console.log("[Merge] Starting merge")
  const body = await readValidatedBody(event, MergeBody.parse)
  const client = useServerSupabase(event)
  const user = await requireAuthUser(event)
  const [sessionResult, flaneurResult, completionistResult] = await Promise.all([
    client
      .from('sessions')
      .select('destination, duration_hours, llm_provider')
      .eq('id', body.sessionId)
      .eq('user_id', user.id)
      .single(),
    client
      .from('itinerary_versions')
      .select('agent_id, version_number, commentary, days')
      .eq('session_id', body.sessionId)
      .eq('version_number', 0)
      .single(),
    client
      .from('itinerary_versions')
      .select('agent_id, version_number, commentary, days')
      .eq('session_id', body.sessionId)
      .eq('version_number', 1)
      .single(),
  ])

  if (sessionResult.error || !sessionResult.data) {
    throw createError({
      statusCode: 404,
      message: `Session not found: ${sessionResult.error?.message ?? 'unknown'}`,
    })
  }

  if (flaneurResult.error || !flaneurResult.data) {
    throw createError({
      statusCode: 404,
      message: `Flaneur proposal (version 0) not found: ${flaneurResult.error?.message ?? 'unknown'}`,
    })
  }

  if (completionistResult.error || !completionistResult.data) {
    throw createError({
      statusCode: 404,
      message: `Completionist proposal (version 1) not found: ${completionistResult.error?.message ?? 'unknown'}`,
    })
  }

  const userConstraints = await fetchUserConstraints(client, body.sessionId)
  const durationHours = Number(sessionResult.data.duration_hours)
  const provider = sessionResult.data.llm_provider === 'minimax' ? 'minimax' : 'mistral'

  const llmResponse = await callAgentWithRetry(
    getSystemPrompt('master', 'merge'),
    buildMergePrompt(
      {
        agentId: flaneurResult.data.agent_id as 'flaneur' | 'completionist' | 'master',
        versionNumber: Number(flaneurResult.data.version_number),
        commentary: String(flaneurResult.data.commentary),
        days: flaneurResult.data.days,
      },
      {
        agentId: completionistResult.data.agent_id as 'flaneur' | 'completionist' | 'master',
        versionNumber: Number(completionistResult.data.version_number),
        commentary: String(completionistResult.data.commentary),
        days: completionistResult.data.days,
      },
      String(sessionResult.data.destination),
      durationHours,
      userConstraints,
    ),
    LlmResponseSchema,
    {
      tag: `merge:v${body.versionNumber}`,
      provider,
      model: provider === 'minimax' ? MINIMAX_MODEL : QUALITY_MODEL,
      maxTokens: provider === 'minimax' ? 4200 : 2600,
      maxRetries: provider === 'minimax' ? 1 : 2,
    },
  )

  const days = assignActivityIds(llmResponse.days)
  let changesSummary = null

  if (body.versionNumber > 0) {
    const { data: previousRow, error: previousError } = await client
      .from('itinerary_versions')
      .select('days')
      .eq('session_id', body.sessionId)
      .eq('version_number', body.versionNumber - 1)
      .single()

    if (previousError || !previousRow) {
      throw createError({
        statusCode: 404,
        message: `Previous version not found: ${previousError?.message ?? 'unknown'}`,
      })
    }

    changesSummary = computeChangesSummary(previousRow.days as typeof days, days)
  }

  const { data: versionRow, error: versionError } = await client
    .from('itinerary_versions')
    .upsert({
      session_id: body.sessionId,
      version_number: body.versionNumber,
      agent_id: 'master',
      commentary: llmResponse.commentary,
      days,
      changes_summary: changesSummary,
    })
    .select()
    .single()

  if (versionError || !versionRow) {
    throw createError({
      statusCode: 500,
      message: `Failed to create merge version: ${versionError?.message ?? 'unknown'}`,
    })
  }

  const { data: messageRow, error: messageError } = await client
    .from('chat_messages')
    .insert({
      session_id: body.sessionId,
      agent_id: 'master',
      role: 'merge',
      content: llmResponse.commentary,
      related_version_id: versionRow.id,
    })
    .select()
    .single()

  if (messageError || !messageRow) {
    throw createError({
      statusCode: 500,
      message: `Failed to create merge message: ${messageError?.message ?? 'unknown'}`,
    })
  }

  return {
    version: rowToVersion(versionRow),
    message: rowToMessage(messageRow),
  }
})
