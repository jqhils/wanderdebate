import { z } from 'zod'
import { useServerSupabase, rowToMessage } from '../../utils/supabase'

const UserInputBody = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, UserInputBody.parse)
  const client = useServerSupabase(event)

  const { data: messageRow, error } = await client
    .from('chat_messages')
    .insert({
      session_id: body.sessionId,
      agent_id: 'user',
      role: 'user-input',
      content: body.content,
    })
    .select()
    .single()

  if (error || !messageRow) {
    throw createError({
      statusCode: 500,
      message: `Failed to store user message: ${error?.message ?? 'unknown'}`,
    })
  }

  return rowToMessage(messageRow)
})
