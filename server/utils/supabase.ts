import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

let _client: ReturnType<typeof createClient> | null = null

export function useServerSupabase(_event?: H3Event) {
  if (_client) return _client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('BLOCKER: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env')
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  return _client
}

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
