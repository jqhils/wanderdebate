import { useServerSupabase, rowToSession } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const client = useServerSupabase(event)
  const user = await requireAuthUser(event)

  const { data, error } = await client
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to load sessions: ${error.message}`,
    })
  }

  return (data ?? []).map(rowToSession)
})
