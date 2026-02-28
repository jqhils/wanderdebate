import { useDebateStore } from '~/stores/debate'
import type { Session, ItineraryVersion, ChatMessage } from '~/utils/schemas'

/**
 * Composable for session CRUD and Supabase Realtime subscriptions.
 * Pushes new messages/versions reactively into the Pinia store.
 */
export function useSession() {
  const store = useDebateStore()
  const supabase = useSupabaseClient()
  const loading = ref(false)
  const error = ref<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeChannel = ref<any>(null)

  /**
   * Load a session and all its data from the server.
   */
  async function loadSession(sessionId: string) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<{
        session: Session
        versions: ItineraryVersion[]
        messages: ChatMessage[]
      }>(`/api/sessions/${sessionId}`)

      store.setSession(data.session)

      // Load versions in order
      for (const version of data.versions) {
        store.addVersion(version)
      }

      // Load messages
      for (const msg of data.messages) {
        store.addMessage(msg)
      }
    }
    catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load session'
      error.value = message
      console.error('[useSession] Load error:', err)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Create a new session via the server API.
   */
  async function createSession(params: {
    destination: string
    durationHours: number
    agents: string[]
  }): Promise<Session | null> {
    loading.value = true
    error.value = null

    try {
      const session = await $fetch<Session>('/api/sessions', {
        method: 'POST',
        body: params,
      })
      return session
    }
    catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create session'
      error.value = message
      console.error('[useSession] Create error:', err)
      return null
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Subscribe to Realtime changes for a session.
   * New messages and versions are pushed into the Pinia store.
   */
  function subscribeToRealtime(sessionId: string) {
    // Clean up any existing subscription
    unsubscribeFromRealtime()

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const msg: ChatMessage = {
            id: row.id as string,
            sessionId: row.session_id as string,
            agentId: row.agent_id as string as ChatMessage['agentId'],
            role: row.role as ChatMessage['role'],
            content: row.content as string,
            relatedVersionId: (row.related_version_id as string | null) ?? undefined,
            createdAt: row.created_at as string,
          }

          // Avoid duplicates — check if message already exists
          const exists = store.messages.some(m => m.id === msg.id)
          if (!exists) {
            store.addMessage(msg)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'itinerary_versions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const version: ItineraryVersion = {
            id: row.id as string,
            sessionId: row.session_id as string,
            versionNumber: row.version_number as number,
            agentId: row.agent_id as string as ItineraryVersion['agentId'],
            commentary: row.commentary as string,
            days: row.days as ItineraryVersion['days'],
            changesSummary: row.changes_summary as ItineraryVersion['changesSummary'],
            createdAt: row.created_at as string,
          }

          // Avoid duplicates
          const exists = store.versions.some(v => v.id === version.id)
          if (!exists) {
            store.addVersion(version)
          }
        },
      )
      .subscribe()

    realtimeChannel.value = channel
  }

  /**
   * Unsubscribe from Realtime channel.
   */
  function unsubscribeFromRealtime() {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
  }

  /**
   * Send a user message to the server and add to pending queue.
   */
  async function sendUserMessage(sessionId: string, content: string) {
    try {
      await $fetch('/api/debate/user-input', {
        method: 'POST',
        body: { sessionId, content },
      })
      // Message will arrive via Realtime subscription
      // Also add to pending queue in store for orchestrator consumption
      store.pendingUserMessages.push({
        id: crypto.randomUUID(),
        sessionId,
        agentId: 'user',
        role: 'user-input',
        content,
        createdAt: new Date().toISOString(),
      })
    }
    catch (err) {
      console.error('[useSession] Failed to send user message:', err)
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    loadSession,
    createSession,
    subscribeToRealtime,
    unsubscribeFromRealtime,
    sendUserMessage,
  }
}
