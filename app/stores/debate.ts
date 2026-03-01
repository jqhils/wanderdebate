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

  const messagesForDisplay = computed(() => {
    const versionNumberById = new Map(
      versions.value.map(version => [version.id, version.versionNumber]),
    )

    const debateRoles = new Set(['proposal', 'merge', 'critique'])
    const resolveDebateVersionNumber = (message: ChatMessage): number | null => {
      if (!message.relatedVersionId) return null
      if (!debateRoles.has(message.role)) return null
      return versionNumberById.get(message.relatedVersionId) ?? null
    }

    const sorted = [...messages.value].sort((a, b) => {
      const aVersionNumber = resolveDebateVersionNumber(a)
      const bVersionNumber = resolveDebateVersionNumber(b)

      // Keep debate messages aligned to itinerary turn/version order.
      if (aVersionNumber !== null && bVersionNumber !== null && aVersionNumber !== bVersionNumber) {
        return aVersionNumber - bVersionNumber
      }

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    // Dedupe accidental duplicate debate messages (same role/agent/version tuple).
    const seenDebateKeys = new Set<string>()
    return sorted.filter((message) => {
      if (!message.relatedVersionId) return true
      if (!['proposal', 'merge', 'critique'].includes(message.role)) return true

      const key = `${message.role}:${message.agentId}:${message.relatedVersionId}`
      if (seenDebateKeys.has(key)) {
        return false
      }
      seenDebateKeys.add(key)
      return true
    })
  })

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
    if (messages.value.some(existing => existing.id === msg.id)) {
      return
    }
    messages.value.push(msg)
  }

  function addVersion(version: ItineraryVersion) {
    const existingById = versions.value.findIndex(v => v.id === version.id)
    if (existingById >= 0) {
      versions.value[existingById] = version
    }
    else {
      const existingByNumber = versions.value.findIndex(v => v.versionNumber === version.versionNumber)
      if (existingByNumber >= 0) {
        versions.value[existingByNumber] = version
      }
      else {
        versions.value.push(version)
      }
    }
    versions.value.sort((a, b) => a.versionNumber - b.versionNumber)
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
