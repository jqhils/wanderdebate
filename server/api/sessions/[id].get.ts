import { useServerSupabase, rowToSession, rowToVersion, rowToMessage } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Session ID is required' })
  }

  const client = useServerSupabase(event)

  // Load session, versions, and messages in parallel
  const [sessionResult, versionsResult, messagesResult] = await Promise.all([
    client.from('sessions').select('*').eq('id', id).single(),
    client.from('itinerary_versions').select('*').eq('session_id', id).order('version_number', { ascending: true }),
    client.from('chat_messages').select('*').eq('session_id', id).order('created_at', { ascending: true }),
  ])

  if (sessionResult.error || !sessionResult.data) {
    throw createError({
      statusCode: 404,
      message: `Session not found: ${sessionResult.error?.message ?? 'unknown'}`,
    })
  }

  return {
    session: rowToSession(sessionResult.data),
    versions: (versionsResult.data ?? []).map(rowToVersion),
    messages: (messagesResult.data ?? []).map(rowToMessage),
  }
})
