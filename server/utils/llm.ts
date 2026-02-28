import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { AgentId, type DayPlan } from '../../app/utils/schemas'

const MODEL = 'mistral-small-latest'
const MAX_TOKENS = 4096
const MAX_RETRIES = 3

export const LlmActivitySchema = z.object({
  id: z.string().optional(),
  timeBlock: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  durationMinutes: z.number().int().positive(),
  category: z.string().transform((val) => {
    const valid = ['landmark', 'food', 'culture', 'nature', 'nightlife', 'transit', 'free-roam'] as const
    const lower = val.toLowerCase().replace(/\s+/g, '-')
    if ((valid as readonly string[]).includes(lower)) return lower
    const map: Record<string, string> = {
      shopping: 'landmark', entertainment: 'culture', experience: 'culture',
      observation: 'landmark', dining: 'food', restaurant: 'food', cafe: 'food',
      temple: 'landmark', shrine: 'landmark', museum: 'culture',
      park: 'nature', garden: 'nature', bar: 'nightlife',
      transport: 'transit', walk: 'free-roam', exploration: 'free-roam', sightseeing: 'landmark',
    }
    return map[lower] ?? 'culture'
  }),
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

export function extractAndValidate<T>(raw: string, schema: z.ZodType<T>): T {
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)\s*```/i)
  const candidate = fenceMatch ? fenceMatch[1] : raw.trim()
  const parsed = JSON.parse(candidate)
  return schema.parse(parsed)
}

export async function callAgentWithRetry<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const config = useRuntimeConfig()
  const apiKey = config.mistralApiKey
  if (!apiKey) throw createError({ statusCode: 503, message: 'MISTRAL_API_KEY not set' })

  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45000)

      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        const text = await res.text()
        throw new Error('Mistral API ' + res.status + ': ' + text.slice(0, 200))
      }

      const data = await res.json() as any
      const txt = data.choices?.[0]?.message?.content
      if (typeof txt !== 'string') throw new Error('No text content in LLM response')

      console.log('[LLM] Got response, length:', txt.length)
      return extractAndValidate(txt, schema)
    }
    catch (err: any) {
      lastError = err
      const msg = err.name === 'AbortError' ? 'Timeout after 45s' : (err.message ?? err)
      console.warn('[LLM] Attempt ' + (attempt + 1) + '/' + (MAX_RETRIES + 1) + ' failed:', msg)
    }
  }

  throw createError({
    statusCode: 502,
    message: 'LLM failed after ' + (MAX_RETRIES + 1) + ' attempts: ' + (lastError instanceof Error ? lastError.message : 'unknown'),
  })
}

export function assignActivityIds(days: LlmResponse['days']): DayPlan[] {
  return days.map(day => ({
    ...day,
    activities: day.activities.map(activity => ({
      ...activity,
      id: activity.id || randomUUID(),
    })),
  }))
}

export function computeChangesSummary(previousDays: DayPlan[], currentDays: DayPlan[]) {
  const prevTitles = new Set(previousDays.flatMap(d => d.activities.map(a => a.title)))
  const currActivities = currentDays.flatMap(d => d.activities)
  const currTitles = new Set(currActivities.map(a => a.title))
  const dropped = previousDays.flatMap(d => d.activities).filter(a => !currTitles.has(a.title)).map(a => ({ title: a.title, timeBlock: a.timeBlock }))
  const added = currActivities.filter(a => !prevTitles.has(a.title)).map(a => ({ title: a.title, timeBlock: a.timeBlock, agentOrigin: a.agentOrigin }))
  return { dropped, added }
}
