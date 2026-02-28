import { z } from 'zod'
import { useServerSupabase, rowToVersion, rowToMessage } from '../../utils/supabase'
import {
  MINIMAX_MODEL,
  QUALITY_MODEL,
  LlmResponseSchema,
  assignActivityIds,
  callAgentWithRetry,
} from '../../utils/llm'
import { requireAuthUser } from '../../utils/auth'
import {
  buildProposePrompt,
  fetchUserConstraints,
  getSystemPrompt,
} from '../../utils/agentPrompts'

const ProposeBody = z.object({
  sessionId: z.string().uuid(),
  agentId: z.enum(['flaneur', 'completionist']),
  versionNumber: z.number().int().nonnegative(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, ProposeBody.parse)
  const client = useServerSupabase(event)
  const user = await requireAuthUser(event)
  const { data: sessionRow, error: sessionError } = await client
    .from('sessions')
    .select('destination, duration_hours, llm_provider')
    .eq('id', body.sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !sessionRow) {
    throw createError({
      statusCode: 404,
      message: `Session not found: ${sessionError?.message ?? 'unknown'}`,
    })
  }

  const userConstraints = await fetchUserConstraints(client, body.sessionId)
  const durationHours = Number(sessionRow.duration_hours)
  const numDays = Math.max(1, Math.ceil(durationHours / 24))
  const provider = sessionRow.llm_provider === 'minimax' ? 'minimax' : 'mistral'

  const llmResponse = await callAgentWithRetry(
    getSystemPrompt(body.agentId, 'propose'),
    buildProposePrompt(
      String(sessionRow.destination),
      durationHours,
      numDays,
      body.agentId,
      userConstraints,
    ),
    LlmResponseSchema,
    {
      tag: `propose:${body.agentId}:v${body.versionNumber}`,
      provider,
      model: provider === 'minimax' ? MINIMAX_MODEL : QUALITY_MODEL,
      maxTokens: 3200,
    },
  )

  const days = assignActivityIds(llmResponse.days)
  const changesSummary = null

  // Insert version
  const { data: versionRow, error: versionError } = await client
    .from('itinerary_versions')
    .insert({
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
    throw createError({
      statusCode: 500,
      message: `Failed to create version: ${versionError?.message ?? 'unknown'}`,
    })
  }

  // Insert corresponding chat message
  const { data: messageRow, error: messageError } = await client
    .from('chat_messages')
    .insert({
      session_id: body.sessionId,
      agent_id: body.agentId,
      role: 'proposal',
      content: llmResponse.commentary,
      related_version_id: versionRow.id,
    })
    .select()
    .single()

  if (messageError || !messageRow) {
    throw createError({
      statusCode: 500,
      message: `Failed to create message: ${messageError?.message ?? 'unknown'}`,
    })
  }

  return {
    version: rowToVersion(versionRow),
    message: rowToMessage(messageRow),
  }
})
