import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

/**
 * Get a Supabase client with service role privileges for server-side operations.
 * Throws a clear error if Supabase env vars are not configured.
 */
export function useServerSupabase(event: H3Event) {
  const config = useRuntimeConfig(event)
  const supabaseUrl
    = (config.public as Record<string, unknown>)?.supabase && typeof (config.public as { supabase?: { url?: unknown } }).supabase?.url === 'string'
      ? (config.public as { supabase?: { url?: string } }).supabase?.url
      : undefined

  const serverKey
    = config.supabase?.secretKey
      || config.supabase?.serviceKey
      || process.env.SUPABASE_SECRET_KEY
      || process.env.SUPABASE_SERVICE_KEY
      || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl && !process.env.SUPABASE_URL) {
    throw createError({
      statusCode: 503,
      message: 'BLOCKER: SUPABASE_URL is not configured. Set it in .env or nuxt.config.ts.',
    })
  }

  if (!serverKey) {
    throw createError({
      statusCode: 503,
      message: 'BLOCKER: Missing Supabase server key. Set SUPABASE_SECRET_KEY (recommended), SUPABASE_SERVICE_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env.',
    })
  }

  if ((supabaseUrl || process.env.SUPABASE_URL || '').includes('your-project.supabase.co') || String(serverKey).includes('your-service-key')) {
    throw createError({
      statusCode: 503,
      message: 'BLOCKER: Supabase credentials are placeholders. Replace SUPABASE_URL and server key values in .env with real project credentials.',
    })
  }

  return serverSupabaseServiceRole(event)
}

/**
 * Converts a snake_case database row to camelCase for the client.
 */
export function rowToSession(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    destination: row.destination as string,
    durationHours: Number(row.duration_hours),
    agents: row.agents as string[],
    status: row.status as string,
    createdAt: (row.created_at as string),
  }
}

export function rowToVersion(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    versionNumber: row.version_number as number,
    agentId: row.agent_id as string,
    commentary: row.commentary as string,
    days: row.days as unknown[],
    changesSummary: row.changes_summary as Record<string, unknown> | null,
    createdAt: (row.created_at as string),
  }
}

export function rowToMessage(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    agentId: row.agent_id as string,
    role: row.role as string,
    content: row.content as string,
    relatedVersionId: (row.related_version_id as string | null) ?? undefined,
    createdAt: (row.created_at as string),
  }
}
