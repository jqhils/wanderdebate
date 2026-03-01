import { useDebateStore } from '~/stores/debate'
import { useOrchestrator } from '~/composables/useOrchestrator'
import { useSession } from '~/composables/useSession'

export function useSessionPage() {
  const route = useRoute()
  const store = useDebateStore()
  const { startDebate } = useOrchestrator()
  const { loadSession, subscribeToRealtime, unsubscribeFromRealtime, loading, error } = useSession()
  const toast = useToast()

  const sessionId = computed(() => {
    const params = route.params
    return (params.id as string) ?? ''
  })

  const initialized = ref(false)

  async function init() {
    if (initialized.value || !sessionId.value) return
    initialized.value = true
    store.reset()
    await loadSession(sessionId.value)
    if (error.value) {
      toast.add({ title: 'Failed to load session', description: error.value, color: 'error' })
      return
    }
    subscribeToRealtime(sessionId.value)

    // Start generation only after initial versions are loaded from DB.
    if (store.session?.status === 'debating' && store.versions.length === 0 && !store.isDebating) {
      await startDebate()
    }
  }

  function cleanup() {
    unsubscribeFromRealtime()
    store.reset()
    initialized.value = false
  }

  return { sessionId, loading, error, init, cleanup }
}
