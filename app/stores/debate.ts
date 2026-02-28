import { defineStore } from 'pinia'
import type { Session, ChatMessage, ItineraryVersion } from '~/utils/schemas'

export const useDebateStore = defineStore('debate', () => {
  // --- State ---
  const session = ref<Session | null>(null)
  const messages = ref<ChatMessage[]>([])
  const versions = ref<ItineraryVersion[]>([])
  const currentVersionIndex = ref(0)
  const isDebating = ref(false)
  const debateRound = ref(0)
  const pendingUserMessages = ref<ChatMessage[]>([])

  // --- Getters ---
  const currentVersion = computed(() =>
    versions.value[currentVersionIndex.value] ?? null,
  )

  const messagesForDisplay = computed(() =>
    [...messages.value].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  )

  const currentChangesSummary = computed(() =>
    currentVersion.value?.changesSummary ?? null,
  )

  // --- Actions ---
  function setSession(s: Session) {
    session.value = s
  }

  function setCurrentVersion(index: number) {
    if (index >= 0 && index < versions.value.length) {
      currentVersionIndex.value = index
    }
  }

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
  }

  function addVersion(version: ItineraryVersion) {
    versions.value.push(version)
    // Auto-advance to latest version
    currentVersionIndex.value = versions.value.length - 1
  }

  function sendUserMessage(content: string) {
    if (!session.value) return

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: session.value.id,
      agentId: 'user',
      role: 'user-input',
      content,
      createdAt: new Date().toISOString(),
    }

    // Add to display messages and pending queue
    messages.value.push(msg)
    pendingUserMessages.value.push(msg)
  }

  function consumePendingUserMessages(): ChatMessage[] {
    const consumed = [...pendingUserMessages.value]
    pendingUserMessages.value = []
    return consumed
  }

  function reset() {
    session.value = null
    messages.value = []
    versions.value = []
    currentVersionIndex.value = 0
    isDebating.value = false
    debateRound.value = 0
    pendingUserMessages.value = []
  }

  return {
    // State
    session,
    messages,
    versions,
    currentVersionIndex,
    isDebating,
    debateRound,
    pendingUserMessages,
    // Getters
    currentVersion,
    messagesForDisplay,
    currentChangesSummary,
    // Actions
    setSession,
    setCurrentVersion,
    addMessage,
    addVersion,
    sendUserMessage,
    consumePendingUserMessages,
    reset,
  }
})
