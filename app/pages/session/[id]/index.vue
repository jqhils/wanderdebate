<script setup lang="ts">
import { useDebateStore } from '~/stores/debate'
import { useOrchestrator } from '~/composables/useOrchestrator'
import { useSession } from '~/composables/useSession'

definePageMeta({ layout: 'session' })

const store = useDebateStore()
const { startDebate, continueDebate } = useOrchestrator()
const { sendUserMessage } = useSession()
const route = useRoute()
const sessionId = computed(() => route.params.id as string)

watch(() => store.session?.status, (status) => {
  if (status === 'debating' && store.versions.length === 0) startDebate()
}, { immediate: true })

function handleSend(content: string) {
  if (!sessionId.value) return
  sendUserMessage(sessionId.value, content)
}

const chips = ['More local food', 'Less walking', 'Add photo ops', 'Skip bars', 'More free time', 'Kid-friendly', 'Budget-conscious', 'Hidden gems only']
</script>

<template>
  <div class="h-full flex">
    <div class="w-full lg:w-1/2 lg:border-r lg:border-gray-800 flex flex-col">
      <ChatPanel
        :messages="store.messagesForDisplay"
        :is-debating="store.isDebating"
        @send="handleSend"
        @continue-debate="continueDebate"
      />
      <div  class="px-4 pb-3 flex flex-wrap gap-2 shrink-0 border-t border-gray-800 pt-3">
        <button v-for="chip in chips" :key="chip"
          class="px-3 py-1.5 text-xs rounded-full border border-gray-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
          @click="handleSend(chip)">
          {{ chip }}
        </button>
      </div>
    </div>
    <div class="hidden lg:block lg:w-1/2">
      <ItineraryPanel :versions="store.versions" :current-index="store.currentVersionIndex" @update:current-index="store.currentVersionIndex = $event" />
    </div>
  </div>
</template>
