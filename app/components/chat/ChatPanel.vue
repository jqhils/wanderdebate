<script setup lang="ts">
import { vAutoAnimate } from '@formkit/auto-animate'
import type { ChatMessage } from '~/utils/schemas'

const props = defineProps<{
  messages: ChatMessage[]
  isDebating?: boolean
  selectedVersionId?: string | null
  selectedMessageId?: string | null
}>()

const emit = defineEmits<{
  send: [message: string]
  continueDebate: []
  selectVersion: [payload: { versionId: string, messageId: string }]
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
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--wd-border)]">
      <h2 class="text-lg font-semibold text-[var(--wd-ink)]">Debate</h2>
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
    <div v-if="messages.length === 0" class="flex-1 flex items-center justify-center p-6 sm:p-8">
      <div v-if="isDebating" class="duel-stage w-full max-w-2xl" aria-live="polite" aria-atomic="true">
        <div class="duel-chip">
          <UIcon name="i-lucide-swords" class="size-3.5" />
          Debate Live
        </div>

        <div class="duel-arena">
          <div class="duel-lane duel-lane--flaneur">
            <ChatAgentAvatar agent-id="flaneur" />
            <div class="duel-agent-text">
              <p class="duel-agent-title">The Flaneur</p>
              <p class="duel-agent-subtitle">Opening argument in progress</p>
            </div>
          </div>

          <div class="duel-vs" aria-hidden="true">VS</div>

          <div class="duel-lane duel-lane--completionist">
            <ChatAgentAvatar agent-id="completionist" />
            <div class="duel-agent-text">
              <p class="duel-agent-title">The Completionist</p>
              <p class="duel-agent-subtitle">Opening argument in progress</p>
            </div>
          </div>
        </div>

        <div class="duel-progress" aria-hidden="true">
          <span class="duel-progress-shimmer" />
        </div>

        <p class="duel-copy-primary">The floor is open. Arguments incoming...</p>
        <p class="duel-copy-secondary">Both agents are building opening proposals.</p>
      </div>

      <div v-else class="text-center">
        <UIcon name="i-lucide-message-circle" class="size-10 text-[var(--wd-ink-3)] mx-auto mb-3" />
        <p class="text-sm text-[var(--wd-ink-3)]">
          The debate will appear here
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
        :selected-version-id="selectedVersionId ?? null"
        :selected-message-id="selectedMessageId ?? null"
        @select-version="emit('selectVersion', $event)"
      />

      <!-- Typing indicator when debating -->
      <div v-if="isDebating" class="flex gap-3 max-w-[85%]">
        <div class="rounded-full size-9 bg-[var(--wd-surface-card)] flex items-center justify-center animate-pulse">
          <UIcon name="i-lucide-bot" class="size-5 text-[var(--wd-ink-3)]" />
        </div>
        <div class="rounded-2xl rounded-tl-sm bg-[var(--wd-surface-card)] px-4 py-3">
          <div class="flex gap-1">
            <span class="size-2 rounded-full bg-[var(--wd-ink-3)] animate-bounce" style="animation-delay: 0ms" />
            <span class="size-2 rounded-full bg-[var(--wd-ink-3)] animate-bounce" style="animation-delay: 150ms" />
            <span class="size-2 rounded-full bg-[var(--wd-ink-3)] animate-bounce" style="animation-delay: 300ms" />
          </div>
        </div>
      </div>
    </div>

    <ChatInput @send="(m: string) => emit('send', m)" />
  </div>
</template>

<style scoped>
.duel-stage {
  border: 1px solid var(--wd-border-strong);
  border-radius: 1rem;
  padding: 1rem;
  background:
    radial-gradient(circle at 12% 16%, rgba(45, 212, 191, 0.1), transparent 42%),
    radial-gradient(circle at 88% 14%, rgba(245, 158, 11, 0.1), transparent 48%),
    var(--wd-surface-raised);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.35);
}

.duel-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 9999px;
  border: 1px solid rgba(45, 212, 191, 0.35);
  background: var(--wd-surface);
  color: var(--wd-teal);
  padding: 0.28rem 0.65rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.duel-arena {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.6rem;
}

.duel-lane {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border-radius: 0.85rem;
  border: 1px solid var(--wd-border);
  background: var(--wd-surface);
  padding: 0.65rem;
  animation: slideIn 650ms ease both;
}

.duel-lane--completionist {
  animation-delay: 120ms;
}

.duel-vs {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--wd-ink-2);
  border: 1px solid var(--wd-border-strong);
  background: var(--wd-surface-card);
  animation: pulseGlow 1.8s ease-in-out infinite;
}

.duel-agent-title {
  color: var(--wd-ink);
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.2;
}

.duel-agent-subtitle {
  margin-top: 0.12rem;
  color: var(--wd-ink-3);
  font-size: 0.66rem;
  line-height: 1.2;
}

.duel-progress {
  margin-top: 0.85rem;
  height: 0.36rem;
  border-radius: 9999px;
  background: var(--wd-border);
  overflow: hidden;
}

.duel-progress-shimmer {
  display: block;
  width: 48%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(45, 212, 191, 0.15),
    var(--wd-teal),
    rgba(45, 212, 191, 0.15)
  );
  animation: shimmer 1.2s linear infinite;
}

.duel-copy-primary {
  margin-top: 0.82rem;
  color: var(--wd-ink);
  font-size: 0.95rem;
  font-weight: 700;
}

.duel-copy-secondary {
  margin-top: 0.24rem;
  color: var(--wd-ink-3);
  font-size: 0.8rem;
}

@keyframes slideIn {
  from {
    transform: translateY(6px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-140%);
  }
  100% {
    transform: translateX(320%);
  }
}

@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.2);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(45, 212, 191, 0.02);
    transform: scale(1.04);
  }
}

@media (max-width: 640px) {
  .duel-arena {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }

  .duel-vs {
    margin-inline: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .duel-lane,
  .duel-vs,
  .duel-progress-shimmer {
    animation: none;
  }
}
</style>
