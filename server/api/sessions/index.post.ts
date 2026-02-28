import { z } from 'zod'
import { useServerSupabase, rowToSession } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/auth'

const CreateSessionBody = z.object({
  destination: z.string().min(1),
  durationHours: z.number().positive(),
  agents: z.array(z.enum(['flaneur', 'completionist', 'master'])).min(1),
  llmProvider: z.enum(['mistral', 'minimax']).default('mistral'),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, CreateSessionBody.parse)
  const config = useRuntimeConfig()
  const client = useServerSupabase(event)
  const user = await requireAuthUser(event)

  if (config.dailyItineraryLimitEnabled) {
    const utcDayStart = new Date()
    utcDayStart.setUTCHours(0, 0, 0, 0)

    const { count, error: countError } = await client
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', utcDayStart.toISOString())

    if (countError) {
      throw createError({
        statusCode: 500,
        message: `Failed to evaluate daily itinerary limit: ${countError.message}`,
      })
    }

    if ((count ?? 0) >= 3) {
      throw createError({
        statusCode: 429,
        message: 'Daily itinerary limit reached (3 per UTC day). Please try again tomorrow.',
      })
    }
  }

  const { data, error } = await client
    .from('sessions')
    .insert({
      user_id: user.id,
      destination: body.destination,
      duration_hours: body.durationHours,
      agents: body.agents,
      llm_provider: body.llmProvider,
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
