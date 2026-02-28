import { useDebateStore } from '~/stores/debate'
import { useSession } from '~/composables/useSession'

export function useSessionPage() {
  const route = useRoute()
  const store = useDebateStore()
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
  }

  function cleanup() {
    unsubscribeFromRealtime()
    store.reset()
    initialized.value = false
  }

  return { sessionId, loading, error, init, cleanup }
}
