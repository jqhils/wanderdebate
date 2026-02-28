import { Mistral } from '@mistralai/mistralai'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { AgentId, type DayPlan } from '../../app/utils/schemas'

const MODEL = 'mistral-large-latest'
const MAX_TOKENS = 8192
const MAX_RETRIES = 2

let _client: Mistral | null = null

/**
 * Singleton Mistral client. Fails fast if API key is missing.
 */
export function getMistralClient(): Mistral {
  if (_client) return _client

  const config = useRuntimeConfig()
  const apiKey = config.mistralApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'BLOCKER: NUXT_MISTRAL_API_KEY is not configured. Set it in .env.',
    })
  }

  _client = new Mistral({ apiKey })
  return _client
}

/**
 * Zod schema for LLM output — activity `id` is optional since LLMs
 * are unreliable UUID generators. We assign IDs server-side.
 */
const LlmActivitySchema = z.object({
  id: z.string().optional(),
  timeBlock: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  durationMinutes: z.number().int().positive(),
  category: z.enum([
    'landmark',
    'food',
    'culture',
    'nature',
    'nightlife',
    'transit',
    'free-roam',
  ]),
  agentOrigin: AgentId,
  agentLogic: z.string(),
})

const LlmDayPlanSchema = z.object({
  dayNumber: z.number().int().positive(),
  theme: z.string().optional(),
  activities: z.array(LlmActivitySchema),
})

export const LlmResponseSchema = z.object({
  commentary: z.string(),
  days: z.array(LlmDayPlanSchema),
})

export type LlmResponse = z.infer<typeof LlmResponseSchema>

/**
 * Extract JSON from LLM output — tries fenced JSON first, then raw JSON.
 * Validates against the provided Zod schema.
 */
export function extractAndValidate<T>(raw: string, schema: z.ZodType<T>): T {
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)\s*```/i)
  const candidate = fenceMatch ? fenceMatch[1] : raw.trim()
  const parsed = JSON.parse(candidate)
  return schema.parse(parsed)
}

/**
 * Call Mistral chat completion with retry logic.
 * Retries up to MAX_RETRIES times on parse/validation failure (3 total attempts).
 */
export async function callAgentWithRetry<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const client = getMistralClient()
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await client.chat.complete({
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const content = result.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        throw new Error('No text content in LLM response')
      }

      return extractAndValidate(content, schema)
    }
    catch (err) {
      lastError = err
      console.warn(`[LLM] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, err instanceof Error ? err.message : err)
    }
  }

  throw createError({
    statusCode: 502,
    message: `LLM call failed after ${MAX_RETRIES + 1} attempts: ${lastError instanceof Error ? lastError.message : 'unknown error'}`,
  })
}

/**
 * Assign UUIDs to any activities missing an `id` field.
 */
export function assignActivityIds(days: LlmResponse['days']): DayPlan[] {
  return days.map(day => ({
    ...day,
    activities: day.activities.map(activity => ({
      ...activity,
      id: activity.id || randomUUID(),
    })),
  }))
}

/**
 * Compute a changes summary by comparing activity titles between two versions.
 */
export function computeChangesSummary(
  previousDays: DayPlan[],
  currentDays: DayPlan[],
) {
  const prevTitles = new Set(
    previousDays.flatMap(d => d.activities.map(a => a.title)),
  )
  const currActivities = currentDays.flatMap(d => d.activities)
  const currTitles = new Set(currActivities.map(a => a.title))

  const dropped = previousDays
    .flatMap(d => d.activities)
    .filter(a => !currTitles.has(a.title))
    .map(a => ({ title: a.title, timeBlock: a.timeBlock }))

  const added = currActivities
    .filter(a => !prevTitles.has(a.title))
    .map(a => ({ title: a.title, timeBlock: a.timeBlock, agentOrigin: a.agentOrigin }))

  return { dropped, added }
}
