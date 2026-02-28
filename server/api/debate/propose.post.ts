import { z } from 'zod'
import { useServerSupabase, rowToVersion, rowToMessage } from '../../utils/supabase'
import { LlmResponseSchema, assignActivityIds, callAgentWithRetry } from '../../utils/llm'
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
  const { data: sessionRow, error: sessionError } = await client
    .from('sessions')
    .select('destination, duration_hours')
    .eq('id', body.sessionId)
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

  console.log('[Propose] Starting for', body.agentId, 'version', body.versionNumber)

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
  )

  const days = assignActivityIds(llmResponse.days)
  const changesSummary = null

  // Insert version
  const { data: versionRow, error: versionError } = await client
    .from('itinerary_versions')
    .upsert({
      session_id: body.sessionId,
      version_number: body.versionNumber,
      agent_id: body.agentId,
      commentary: llmResponse.commentary,
      days,
      changes_summary: changesSummary,
    }, { onConflict: 'session_id,version_number' })
    .select()
    .single()

  if (versionError || !versionRow) {
    console.error('[Propose] VERSION SAVE FAILED:', versionError)
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
    console.error('[Propose] MESSAGE SAVE FAILED:', messageError)
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
