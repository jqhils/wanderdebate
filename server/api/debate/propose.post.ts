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

  // Idempotency: if this version already exists, return it with its existing message.
  const { data: existingVersionRow, error: existingVersionError } = await client
    .from('itinerary_versions')
    .select('*')
    .eq('session_id', body.sessionId)
    .eq('version_number', body.versionNumber)
    .maybeSingle()

  if (existingVersionError) {
    throw createError({
      statusCode: 500,
      message: `Failed to check existing proposal version: ${existingVersionError.message}`,
    })
  }

  if (existingVersionRow) {
    if (existingVersionRow.agent_id !== body.agentId) {
      throw createError({
        statusCode: 409,
        message: `Version ${body.versionNumber} already exists for agent ${existingVersionRow.agent_id}, not ${body.agentId}.`,
      })
    }

    const { data: existingMessageRow, error: existingMessageError } = await client
      .from('chat_messages')
      .select('*')
      .eq('session_id', body.sessionId)
      .eq('related_version_id', existingVersionRow.id)
      .eq('role', 'proposal')
      .eq('agent_id', body.agentId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingMessageError) {
      throw createError({
        statusCode: 500,
        message: `Failed to load existing proposal message: ${existingMessageError.message}`,
      })
    }

    if (existingMessageRow) {
      return {
        version: rowToVersion(existingVersionRow),
        message: rowToMessage(existingMessageRow),
      }
    }

    // Backfill missing message for an existing version.
    const { data: backfilledMessageRow, error: backfilledMessageError } = await client
      .from('chat_messages')
      .insert({
        id: existingVersionRow.id,
        session_id: body.sessionId,
        agent_id: body.agentId,
        role: 'proposal',
        content: String(existingVersionRow.commentary ?? ''),
        related_version_id: existingVersionRow.id,
      })
      .select()
      .single()

    if (backfilledMessageError || !backfilledMessageRow) {
      throw createError({
        statusCode: 500,
        message: `Failed to backfill proposal message: ${backfilledMessageError?.message ?? 'unknown'}`,
      })
    }

    return {
      version: rowToVersion(existingVersionRow),
      message: rowToMessage(backfilledMessageRow),
    }
  }

  const userConstraints = await fetchUserConstraints(client, body.sessionId)
  const durationHours = Number(sessionRow.duration_hours)
  const numDays = Math.max(1, Math.ceil(durationHours / 24))
  const provider = sessionRow.llm_provider === 'minimax' ? 'minimax' : 'mistral'

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
      id: versionRow.id,
      session_id: body.sessionId,
      agent_id: body.agentId,
      role: 'proposal',
      content: llmResponse.commentary,
      related_version_id: versionRow.id,
    })
    .select()
    .single()

  if (messageError || !messageRow) {
    // Handle a race where another caller already inserted the proposal message.
    if (messageError?.code === '23505') {
      const { data: racedMessageRow, error: racedMessageError } = await client
        .from('chat_messages')
        .select('*')
        .eq('id', versionRow.id)
        .maybeSingle()

      if (!racedMessageError && racedMessageRow) {
        return {
          version: rowToVersion(versionRow),
          message: rowToMessage(racedMessageRow),
        }
      }
    }

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
