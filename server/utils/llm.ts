import { Mistral } from '@mistralai/mistralai'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { AgentId, type DayPlan, type LlmProvider } from '../../app/utils/schemas'

export const QUALITY_MODEL = 'mistral-large-latest'
export const MINIMAX_MODEL = 'MiniMax-M2.5'
const DEFAULT_MODEL = QUALITY_MODEL
const DEFAULT_MAX_TOKENS = 8000
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

export type LlmCallOptions = {
  provider?: LlmProvider
  model?: string
  maxTokens?: number
  tag?: string
  maxRetries?: number
}

function getMinimaxApiKey(): string {
  const config = useRuntimeConfig()
  const apiKey = config.minimaxApiKey || process.env.NUXT_MINIMAX_API_KEY

  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'BLOCKER: NUXT_MINIMAX_API_KEY is not configured. Set it in .env.',
    })
  }

  return String(apiKey)
}

function getMinimaxBaseUrl(): string {
  const config = useRuntimeConfig()
  const fromConfig = String(config.minimaxBaseUrl || process.env.NUXT_MINIMAX_BASE_URL || '').trim()
  if (!fromConfig) {
    return 'https://api.minimax.io/v1'
  }

  return fromConfig.replace(/\/+$/, '')
}

async function callMinimaxChatCompletion(
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userPrompt: string,
): Promise<unknown> {
  const apiKey = getMinimaxApiKey()
  const baseUrl = getMinimaxBaseUrl()
  const response = await $fetch<{
    choices?: Array<{
      message?: {
        content?: unknown
      }
    }>
  }>(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model,
      max_tokens: maxTokens,
      max_completion_tokens: maxTokens,
      reasoning_split: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
  })

  return response?.choices?.[0]?.message?.content
}

function stripThinkTags(value: string): string {
  return value.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function isFatalLlmError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  if ('statusCode' in error && (error as { statusCode?: number }).statusCode === 503) {
    const message = String((error as { message?: unknown }).message ?? '')
    return message.includes('BLOCKER:')
  }

  if ('status' in error) {
    const status = (error as { status?: number }).status
    if (status === 401 || status === 403) {
      return true
    }
  }

  return false
}

function isLikelyJsonParseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()

  return (
    message.includes('unexpected token')
    || message.includes('unexpected end')
    || message.includes('not valid json')
    || message.includes('after property value')
    || message.includes('after array element')
  )
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === 'string') {
          return chunk
        }

        if (chunk && typeof chunk === 'object' && 'text' in chunk) {
          return String((chunk as { text?: unknown }).text ?? '')
        }

        return ''
      })
      .join('')
      .trim()
  }

  if (content && typeof content === 'object' && 'text' in content) {
    return String((content as { text?: unknown }).text ?? '').trim()
  }

  return ''
}

function extractBalancedJsonCandidate(raw: string): string | null {
  const startObject = raw.indexOf('{')
  const startArray = raw.indexOf('[')
  let start = -1

  if (startObject === -1) {
    start = startArray
  }
  else if (startArray === -1) {
    start = startObject
  }
  else {
    start = Math.min(startObject, startArray)
  }

  if (start < 0) {
    return null
  }

  const opening = raw[start]
  const closing = opening === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }

      if (ch === '\\') {
        escaped = true
        continue
      }

      if (ch === '"') {
        inString = false
      }

      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === opening) {
      depth++
      continue
    }

    if (ch === closing) {
      depth--
      if (depth === 0) {
        return raw.slice(start, i + 1).trim()
      }
    }
  }

  return null
}

function extractFirstToLastBracketCandidate(raw: string): string | null {
  const starts = [raw.indexOf('{'), raw.indexOf('[')].filter(idx => idx >= 0)
  if (starts.length === 0) {
    return null
  }

  const ends = [raw.lastIndexOf('}'), raw.lastIndexOf(']')].filter(idx => idx >= 0)
  if (ends.length === 0) {
    return null
  }

  const start = Math.min(...starts)
  const end = Math.max(...ends)
  if (end <= start) {
    return null
  }

  return raw.slice(start, end + 1).trim()
}

function normalizeFenceArtifacts(input: string): string {
  return input
    .replace(/^[\uFEFF]/, '')
    .replace(/^[`'"“”‘’\s]+json\b[:\s-]*/i, '')
    .replace(/^[`'"“”‘’\s]+/, '')
    .replace(/[`'"“”‘’\s]+$/, '')
}

/**
 * Extract JSON from LLM output — tries fenced JSON first, then raw JSON.
 * Validates against the provided Zod schema.
 */
export function extractAndValidate<T>(raw: string, schema: z.ZodType<T>): T {
  const trimmed = raw.trim()
  const candidates: string[] = []

  for (const regex of [
    /`{3,}\s*json\s*([\s\S]*?)\s*`{3,}/ig,
    /`{2,}\s*json\s*([\s\S]*?)\s*`{2,}/ig,
    /`{3,}\s*([\s\S]*?)\s*`{3,}/ig,
  ]) {
    let match: RegExpExecArray | null = null
    do {
      match = regex.exec(trimmed)
      if (match?.[1]) {
        candidates.push(match[1].trim())
      }
    } while (match)
  }

  const strippedLeadingFence = trimmed.replace(/^`{2,}\s*json\s*/i, '').trim()
  if (strippedLeadingFence !== trimmed) {
    candidates.push(strippedLeadingFence)
  }

  const normalized = normalizeFenceArtifacts(trimmed)
  if (normalized !== trimmed) {
    candidates.push(normalized)
  }

  const balanced = extractBalancedJsonCandidate(trimmed)
  if (balanced) {
    candidates.push(balanced)
  }

  const firstToLast = extractFirstToLastBracketCandidate(trimmed)
  if (firstToLast) {
    candidates.push(firstToLast)
  }

  candidates.push(trimmed)

  let lastError: unknown = null
  const seen = new Set<string>()

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue
    }
    seen.add(candidate)

    const parseVariants = [candidate]
    const normalizedCandidate = normalizeFenceArtifacts(candidate)
    if (normalizedCandidate !== candidate) {
      parseVariants.push(normalizedCandidate)
    }

    const balancedCandidate = extractBalancedJsonCandidate(candidate)
    if (balancedCandidate && balancedCandidate !== candidate) {
      parseVariants.push(balancedCandidate)
    }

    const firstToLastCandidate = extractFirstToLastBracketCandidate(candidate)
    if (firstToLastCandidate && firstToLastCandidate !== candidate) {
      parseVariants.push(firstToLastCandidate)
    }

    const uniqueVariants = Array.from(new Set(parseVariants))

    for (const variant of uniqueVariants) {
      try {
        const parsed = JSON.parse(variant)
        return schema.parse(parsed)
      }
      catch (error) {
        lastError = error
      }
    }
  }

  if (lastError instanceof Error) {
    console.warn('[LLM] Failed to parse response. First 180 chars:', trimmed.slice(0, 180))
    console.warn('[LLM] Failed to parse response. Last 180 chars:', trimmed.slice(-180))
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to parse JSON from LLM response')
}

/**
 * Call selected LLM provider with retry logic.
 * Retries up to MAX_RETRIES times on parse/validation failure (3 total attempts).
 */
export async function callAgentWithRetry<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  options: LlmCallOptions = {},
): Promise<T> {
  const provider = options.provider ?? 'mistral'
  const client = provider === 'mistral' ? getMistralClient() : null
  let model = options.model ?? (provider === 'minimax' ? MINIMAX_MODEL : DEFAULT_MODEL)
  let maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
  const tag = options.tag ?? 'agent'
  const promptChars = systemPrompt.length + userPrompt.length
  const promptTokensEstimate = Math.ceil(promptChars / 4)
  const maxRetries = options.maxRetries ?? MAX_RETRIES
  let lastError: unknown

  console.info(`[LLM:${tag}] start provider=${provider} model=${model} maxTokens=${maxTokens} retries=${maxRetries + 1} promptChars=${promptChars} estPromptTokens~${promptTokensEstimate}`)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStarted = Date.now()

    try {
      const providerContent = provider === 'minimax'
        ? await callMinimaxChatCompletion(model, maxTokens, systemPrompt, userPrompt)
        : (await client!.chat.complete({
            model,
            maxTokens,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          })).choices?.[0]?.message?.content

      const content = stripThinkTags(contentToText(providerContent))
      if (!content) {
        throw new Error('No text content in LLM response')
      }

      const parsed = extractAndValidate(content, schema)
      const elapsedMs = Date.now() - attemptStarted
      console.info(`[LLM:${tag}] attempt ${attempt + 1}/${maxRetries + 1} succeeded in ${elapsedMs}ms`)
      return parsed
    }
    catch (err) {
      if (isFatalLlmError(err)) {
        throw err
      }

      lastError = err
      const elapsedMs = Date.now() - attemptStarted
      console.warn(
        `[LLM:${tag}] attempt ${attempt + 1}/${maxRetries + 1} failed in ${elapsedMs}ms:`,
        err instanceof Error ? err.message : err,
      )

      if (
        provider === 'minimax'
        && attempt < maxRetries
        && isLikelyJsonParseError(err)
        && maxTokens < 6500
      ) {
        maxTokens = Math.min(6500, maxTokens + 1200)
        console.warn(`[LLM:${tag}] increasing minimax maxTokens to ${maxTokens} for retry`)
      }
    }
  }

  throw createError({
    statusCode: 502,
    message: `LLM call failed after ${maxRetries + 1} attempts: ${lastError instanceof Error ? lastError.message : 'unknown error'}`,
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
