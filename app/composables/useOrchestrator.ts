import { useDebateStore } from '~/stores/debate'
import type { ChatMessage, ItineraryVersion } from '~/utils/schemas'

/**
 * Orchestration flow:
 *   0. Flaneur proposal   → version 0
 *   1. Completionist proposal → version 1
 *   2. Master merge        → version 2
 *   3. Flaneur critique    → version 3
 *   4. Completionist critique → version 4
 *   — HARD STOP —
 */
interface Turn {
  type: 'propose' | 'merge' | 'critique'
}

const TURN_SEQUENCE: Turn[] = [
  { type: 'propose' },
  { type: 'propose' },
  { type: 'merge' },
  { type: 'critique' },
  { type: 'critique' },
]

export function useOrchestrator() {
  const store = useDebateStore()
  const currentTurnIndex = ref(0)
  const abortController = ref<AbortController | null>(null)
  const running = ref(false)

  /**
   * Execute a single turn by calling the appropriate server API route.
   * Server routes generate itinerary content via LLM and persistence.
   */
  async function executeTurn(turnIndex: number): Promise<boolean> {
    const turn = TURN_SEQUENCE[turnIndex]
    if (!turn) return false

    const sessionId = store.session?.id
    if (!sessionId) return false

    try {
      console.log('[Orchestrator] Turn', turnIndex, turn.type)
      const endpoint = `/api/debate/${turn.type}`
      const body: Record<string, unknown> = {
        sessionId,
        versionNumber: turnIndex,
      }

      if (turn.type === 'propose') {
        body.agentId = turnIndex === 0 ? 'flaneur' : 'completionist'
      }
      else if (turn.type === 'critique') {
        body.agentId = turnIndex === 3 ? 'flaneur' : 'completionist'
      }

      const result = await $fetch<{ version: ItineraryVersion; message: ChatMessage }>(endpoint, {
        method: 'POST',
        body,
      })

      // The data will arrive via Realtime subscription (useSession),
      // but we also add directly to the store for immediate UI feedback.
      // The Realtime handler deduplicates by ID.
      if (!store.versions.some(v => v.id === result.version.id)) {
        store.addVersion(result.version)
      }
      if (!store.messages.some(m => m.id === result.message.id)) {
        store.addMessage(result.message)
      }

      return true
    }
    catch (err) {
      console.error(`[Orchestrator] Turn ${turnIndex} failed:`, err)

      // Add error system message
      store.addMessage({
        id: crypto.randomUUID(),
        sessionId,
        agentId: 'master',
        role: 'system',
        content: 'The agent stumbled and needs a moment. Please try continuing the debate.',
        createdAt: new Date().toISOString(),
      })

      return false
    }
  }

  /**
   * Run the full debate sequence from the current turn to the end.
   */
  async function startDebate() {
    if (store.isDebating || running.value) return
    running.value = true
    if (!store.session) return

    abortController.value = new AbortController()
    store.isDebating = true

    const startIndex = currentTurnIndex.value
    for (let i = startIndex; i < TURN_SEQUENCE.length; i++) {
      if (abortController.value.signal.aborted) break

      currentTurnIndex.value = i
      const success = await executeTurn(i)
      if (!success) break

      // Brief pause between turns to avoid Mistral rate limits
      await new Promise(r => setTimeout(r, 2000))



      currentTurnIndex.value = i + 1
    }

    // Ground the final version
    const lastVersion = currentTurnIndex.value - 1
    if (store.session?.id && lastVersion >= 0) {
      $fetch('/api/debate/ground', {
        method: 'POST',
        body: { sessionId: store.session.id, versionNumber: lastVersion },
      }).catch(err => console.warn('[Grounding] Failed:', err))
    }

    // Debate finished (hard stop)
    store.isDebating = false
    running.value = false
    if (store.session) {
      store.session.status = currentTurnIndex.value >= TURN_SEQUENCE.length ? 'paused' : 'debating'
    }
    store.debateRound++
  }

  /**
   * Continue debate after hard stop.
   */
  async function continueDebate() {
    if (store.isDebating) return
    if (currentTurnIndex.value < TURN_SEQUENCE.length) {
      await startDebate()
    }
    else {
      // All turns exhausted — mark as complete
      if (store.session) {
        store.session.status = 'complete'
      }
      store.addMessage({
        id: crypto.randomUUID(),
        sessionId: store.session?.id ?? '',
        agentId: 'master',
        role: 'system',
        content: 'The debate has concluded. All agents have had their say. The final itinerary is ready for your review!',
        createdAt: new Date().toISOString(),
      })
    }
  }

  function stopDebate() {
    abortController.value?.abort()
    store.isDebating = false
  }

  return {
    startDebate,
    continueDebate,
    stopDebate,
    currentTurnIndex: readonly(currentTurnIndex),
  }
}
