<script setup lang="ts">
import { useDebateStore } from '~/stores/debate'
import { useOrchestrator } from '~/composables/useOrchestrator'
import { useSession } from '~/composables/useSession'

definePageMeta({ layout: 'session' })

const store = useDebateStore()
const { continueDebate } = useOrchestrator()
const { sendUserMessage } = useSession()
const route = useRoute()
const sessionId = computed(() => route.params.id as string)
const selectedMessageId = ref<string | null>(null)
const selectedFromChatVersionId = ref<string | null>(null)

function handleSend(content: string) {
  if (!sessionId.value) return
  sendUserMessage(sessionId.value, content)
}

function handleSelectVersionFromMessage(payload: { versionId: string, messageId: string }) {
  const index = store.versions.findIndex(version => version.id === payload.versionId)
  if (index < 0) return

  selectedMessageId.value = payload.messageId
  selectedFromChatVersionId.value = payload.versionId
  store.setCurrentVersion(index)
}

watch(
  () => store.currentVersion?.id ?? null,
  (currentVersionId) => {
    if (!selectedFromChatVersionId.value) return
    if (currentVersionId === selectedFromChatVersionId.value) return
    selectedMessageId.value = null
    selectedFromChatVersionId.value = null
  },
)

const chips = ['More local food', 'Less walking', 'Add photo ops', 'Skip bars', 'More free time', 'Kid-friendly', 'Budget-conscious', 'Hidden gems only']
</script>

<template>
  <div class="h-full min-h-0 flex">
    <div class="w-full lg:w-1/2 lg:border-r lg:border-gray-800 flex flex-col">
      <ChatPanel
        :messages="store.messagesForDisplay"
        :is-debating="store.isDebating"
        :selected-version-id="store.currentVersion?.id ?? null"
        :selected-message-id="selectedMessageId"
        @send="handleSend"
        @continue-debate="continueDebate"
        @select-version="handleSelectVersionFromMessage"
      />
      <div  class="px-4 pb-3 flex flex-wrap gap-2 shrink-0 border-t border-gray-800 pt-3">
        <button v-for="chip in chips" :key="chip"
          class="px-3 py-1.5 text-xs rounded-full border border-gray-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
          @click="handleSend(chip)">
          {{ chip }}
        </button>
      </div>
    </div>
    <div class="hidden lg:flex lg:w-1/2 min-h-0">
      <ItineraryPanel
        class="h-full w-full"
        :versions="store.versions"
        :current-index="store.currentVersionIndex"
        @update:current-index="store.setCurrentVersion($event)"
      />
    </div>
  </div>
</template>
