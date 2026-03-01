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
  buildCritiquePrompt,
  fetchUserConstraints,
  getCritiqueSystemPrompt,
} from '../../utils/agentPrompts'

const CritiqueBody = z.object({
  sessionId: z.string().uuid(),
  agentId: z.enum(['flaneur', 'completionist']),
  versionNumber: z.number().int().nonnegative(),
})

export default defineEventHandler(async (event) => {
  console.log("[Critique] Starting critique")
  const body = await readValidatedBody(event, CritiqueBody.parse)
  const client = useServerSupabase(event)
  const user = await requireAuthUser(event)

  if (body.versionNumber === 0) {
    throw createError({
      statusCode: 400,
      message: 'Critique turn requires versionNumber > 0.',
    })
  }

  const [sessionResult, previousVersionResult] = await Promise.all([
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
      .eq('version_number', body.versionNumber - 1)
      .single(),
  ])

  if (sessionResult.error || !sessionResult.data) {
    throw createError({
      statusCode: 404,
      message: `Session not found: ${sessionResult.error?.message ?? 'unknown'}`,
    })
  }

  if (previousVersionResult.error || !previousVersionResult.data) {
    throw createError({
      statusCode: 404,
      message: `Previous version not found: ${previousVersionResult.error?.message ?? 'unknown'}`,
    })
  }

  const userConstraints = await fetchUserConstraints(client, body.sessionId)
  const durationHours = Number(sessionResult.data.duration_hours)
  const provider = sessionResult.data.llm_provider === 'minimax' ? 'minimax' : 'mistral'

  const llmResponse = await callAgentWithRetry(
    getCritiqueSystemPrompt(body.agentId),
    buildCritiquePrompt(
      {
        agentId: previousVersionResult.data.agent_id as 'flaneur' | 'completionist' | 'master',
        versionNumber: Number(previousVersionResult.data.version_number),
        commentary: String(previousVersionResult.data.commentary),
        days: previousVersionResult.data.days,
      },
      body.agentId,
      String(sessionResult.data.destination),
      durationHours,
      userConstraints,
    ),
    LlmResponseSchema,
    {
      tag: `critique:${body.agentId}:v${body.versionNumber}`,
      provider,
      model: provider === 'minimax' ? MINIMAX_MODEL : QUALITY_MODEL,
      maxTokens: 3200,
    },
  )

  const days = assignActivityIds(llmResponse.days)
  const changesSummary = computeChangesSummary(previousVersionResult.data.days as typeof days, days)

  const { data: versionRow, error: versionError } = await client
    .from('itinerary_versions')
    .upsert({
      session_id: body.sessionId,
      version_number: body.versionNumber,
      agent_id: body.agentId,
      commentary: llmResponse.commentary,
      days,
      changes_summary: changesSummary,
    })
    .select()
    .single()

  if (versionError || !versionRow) {
    console.error('[Critique] VERSION SAVE FAILED:', versionError)
    throw createError({
      statusCode: 500,
      message: `Failed to create critique version: ${versionError?.message ?? 'unknown'}`,
    })
  }

  const { data: messageRow, error: messageError } = await client
    .from('chat_messages')
    .insert({
      session_id: body.sessionId,
      agent_id: body.agentId,
      role: 'critique',
      content: llmResponse.commentary,
      related_version_id: versionRow.id,
    })
    .select()
    .single()

  if (messageError || !messageRow) {
    console.error('[Critique] MESSAGE SAVE FAILED:', messageError)
    throw createError({
      statusCode: 500,
      message: `Failed to create critique message: ${messageError?.message ?? 'unknown'}`,
    })
  }

  return {
    version: rowToVersion(versionRow),
    message: rowToMessage(messageRow),
  }
})
