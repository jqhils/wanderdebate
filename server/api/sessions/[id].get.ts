import { useServerSupabase, rowToSession, rowToVersion, rowToMessage } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Session ID is required' })
  }

  const client = useServerSupabase(event)
  const user = await requireAuthUser(event)
  const sessionResult = await client
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (sessionResult.error || !sessionResult.data) {
    throw createError({
      statusCode: 404,
      message: `Session not found: ${sessionResult.error?.message ?? 'unknown'}`,
    })
  }

  // Load versions and messages only after ownership check succeeds.
  const [versionsResult, messagesResult] = await Promise.all([
    client.from('itinerary_versions').select('*').eq('session_id', id).order('version_number', { ascending: true }),
    client.from('chat_messages').select('*').eq('session_id', id).order('created_at', { ascending: true }),
  ])

  return {
    session: rowToSession(sessionResult.data),
    versions: (versionsResult.data ?? []).map(rowToVersion),
    messages: (messagesResult.data ?? []).map(rowToMessage),
  }
})
