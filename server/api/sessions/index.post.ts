import { z } from 'zod'
import { useServerSupabase, rowToSession } from '../../utils/supabase'

const CreateSessionBody = z.object({
  destination: z.string().min(1),
  durationHours: z.number().positive(),
  agents: z.array(z.enum(['flaneur', 'completionist', 'master'])).min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, CreateSessionBody.parse)
  const client = useServerSupabase(event)

  const { data, error } = await client
    .from('sessions')
    .insert({
      destination: body.destination,
      duration_hours: body.durationHours,
      agents: body.agents,
      status: 'debating',
    })
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      message: `Failed to create session: ${error?.message ?? 'unknown error'}`,
    })
  }

  return rowToSession(data)
})
