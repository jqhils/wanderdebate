<script setup lang="ts">
import { vAutoAnimate } from '@formkit/auto-animate'
import type { ChatMessage } from '~/utils/schemas'

const props = defineProps<{
  messages: ChatMessage[]
  isDebating?: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
  continueDebate: []
}>()

const messagesContainer = useTemplateRef('messagesContainer')

function scrollToBottom() {
  nextTick(() => {
    const el = messagesContainer.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

// Scroll to bottom when new messages arrive
watch(() => props.messages.length, scrollToBottom)

// Also scroll on mount
onMounted(scrollToBottom)
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold">Debate</h2>
      <UButton
        variant="outline"
        size="xs"
        icon="i-lucide-message-square-plus"
        :disabled="isDebating"
        @click="emit('continueDebate')"
      >
        Continue Debate
      </UButton>
    </div>

    <!-- Empty state -->
    <div v-if="messages.length === 0" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center">
        <UIcon name="i-lucide-message-circle" class="size-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ isDebating ? 'Agents are warming up...' : 'The debate will appear here' }}
        </p>
      </div>
    </div>

    <div
      v-else
      ref="messagesContainer"
      v-auto-animate
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />

      <!-- Typing indicator when debating -->
      <div v-if="isDebating" class="flex gap-3 max-w-[85%]">
        <div class="relative rounded-full size-9 bg-gray-800 flex items-center justify-center">
          <UIcon name="i-lucide-bot" class="size-5 text-gray-400" />
          <span class="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div class="rounded-2xl rounded-tl-sm bg-gray-800 border border-gray-700 px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="flex gap-1">
              <span class="size-2 rounded-full bg-amber-400 animate-bounce" style="animation-delay: 0ms" />
              <span class="size-2 rounded-full bg-amber-400 animate-bounce" style="animation-delay: 150ms" />
              <span class="size-2 rounded-full bg-amber-400 animate-bounce" style="animation-delay: 300ms" />
            </div>

          </div>
        </div>
      </div>
    </div>

    <ChatInput @send="(m: string) => emit('send', m)" />
  </div>
</template>
