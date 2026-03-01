import { useDebateStore } from '~/stores/debate'
import type { ChatMessage, ItineraryVersion } from '~/utils/schemas'

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

  function hasVersionForTurn(turnIndex: number): boolean {
    return store.versions.some(v => v.versionNumber === turnIndex)
  }

  async function executeTurn(turnIndex: number): Promise<boolean> {
    const turn = TURN_SEQUENCE[turnIndex]
    if (!turn) return false

    const sessionId = store.session?.id
    if (!sessionId) return false

    if (hasVersionForTurn(turnIndex)) {
      console.info(`[Orchestrator] Turn ${turnIndex} already exists, skipping`)
      return true
    }

    try {
      const startedAt = performance.now()
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

      const result = await $fetch<{ version: ItineraryVersion, message: ChatMessage }>(endpoint, {
        method: 'POST',
        body,
        signal: abortController.value?.signal,
      })

      if (!store.versions.some(v => v.id === result.version.id)) {
        store.addVersion(result.version)
      }
      if (!store.messages.some(m => m.id === result.message.id)) {
        store.addMessage(result.message)
      }

      const elapsedMs = Math.round(performance.now() - startedAt)
      console.info(`[Orchestrator] Turn ${turnIndex} (${turn.type}) completed in ${elapsedMs}ms`)
      return true
    }
    catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false
      }

      console.error(`[Orchestrator] Turn ${turnIndex} failed:`, err)
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

  async function startDebate() {
    if (store.isDebating || running.value) return
    if (!store.session) return

    running.value = true
    abortController.value = new AbortController()
    store.isDebating = true

    try {
      const startIndex = currentTurnIndex.value
      if (startIndex === 0) {
        const parallelStartedAt = performance.now()
        const [flaneurOk, completionistOk] = await Promise.all([
          executeTurn(0),
          executeTurn(1),
        ])
        const elapsedMs = Math.round(performance.now() - parallelStartedAt)
        console.info(`[Orchestrator] Parallel propose phase completed in ${elapsedMs}ms`)

        if (!flaneurOk || !completionistOk) {
          if (!hasVersionForTurn(0)) {
            currentTurnIndex.value = 0
          }
          else if (!hasVersionForTurn(1)) {
            currentTurnIndex.value = 1
          }
          else {
            currentTurnIndex.value = 2
          }

          if (store.session) {
            store.session.status = 'debating'
          }
          return
        }

        currentTurnIndex.value = 2
      }

      for (let i = currentTurnIndex.value; i < TURN_SEQUENCE.length; i++) {
        if (abortController.value.signal.aborted) break

        currentTurnIndex.value = i
        const success = await executeTurn(i)
        if (!success) break

        await new Promise(resolve => setTimeout(resolve, 2000))
        currentTurnIndex.value = i + 1
      }

      const lastVersion = currentTurnIndex.value - 1
      if (store.session?.id && lastVersion >= 0) {
        $fetch('/api/debate/ground', {
          method: 'POST',
          body: { sessionId: store.session.id, versionNumber: lastVersion },
        }).catch(err => console.warn('[Grounding] Failed:', err))
      }

      if (store.session) {
        store.session.status = currentTurnIndex.value >= TURN_SEQUENCE.length ? 'paused' : 'debating'
      }
      store.debateRound++
    }
    finally {
      store.isDebating = false
      running.value = false
    }
  }

  async function continueDebate() {
    if (store.isDebating) return
    if (currentTurnIndex.value < TURN_SEQUENCE.length) {
      await startDebate()
      return
    }

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

  function stopDebate() {
    abortController.value?.abort()
    store.isDebating = false
    running.value = false
  }

  return {
    startDebate,
    continueDebate,
    stopDebate,
    currentTurnIndex: readonly(currentTurnIndex),
  }
}
