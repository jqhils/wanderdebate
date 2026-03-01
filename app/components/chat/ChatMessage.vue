<script setup lang="ts">
import type { ChatMessage } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = defineProps<{
  message: ChatMessage
  selectedVersionId?: string | null
  selectedMessageId?: string | null
}>()

const emit = defineEmits<{
  selectVersion: [payload: { versionId: string, messageId: string }]
}>()

const config = computed(() => getAgentConfig(props.message.agentId))
const isUser = computed(() => props.message.agentId === 'user')

const isLinkedToVersion = computed(() => Boolean(props.message.relatedVersionId))
const isSelectable = computed(() => !isUser.value && isLinkedToVersion.value)
const isSelected = computed(() =>
  isSelectable.value
  && Boolean(props.selectedMessageId)
  && props.message.id === props.selectedMessageId,
)

/** Parse KEPT / CHANGED / ADDED / DROPPED into structured items */
const parsedActions = computed(() => {
  const text = props.message.content
  const actions: { type: string; text: string }[] = []
  const parts = text.split(/(KEPT|CHANGED|ADDED|DROPPED)\s+/)
  for (let i = 1; i < parts.length; i += 2) {
    const type = parts[i]
    let body = (parts[i + 1] || '').trim()
      .replace(/\.\s*$/, '')
      .replace(/[🔥⚔️🎆💥🗺️🏯🌸]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (body && body.length > 3) {
      if (body.length > 200) body = body.slice(0, 197) + '…'
      actions.push({ type, text: body })
    }
  }
  return actions
})

const hasActions = computed(() =>
  parsedActions.value.length > 0
  && !isUser.value
  && props.message.role !== 'system',
)

const alignment = computed(() => {
  if (isUser.value) return 'right'
  if (props.message.agentId === 'completionist') return 'right'
  if (props.message.agentId === 'arbitrator') return 'center'
  return 'left'
})

const roleBadge = computed(() => {
  const map: Record<string, string> = {
    'proposal': 'Proposal',
    'critique': 'Critique',
    'merge': 'Merge',
    'system': 'System',
    'user-input': 'Message',
  }
  return map[props.message.role] ?? props.message.role
})

const timestamp = computed(() => {
  const d = new Date(props.message.createdAt)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

function selectVersion(event?: MouseEvent | KeyboardEvent) {
  if (!isSelectable.value || !props.message.relatedVersionId) return
  if (event && 'target' in event) {
    const target = event.target as HTMLElement | null
    if (target?.closest('a')) return
  }
  emit('selectVersion', {
    versionId: props.message.relatedVersionId,
    messageId: props.message.id,
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  selectVersion(event)
}
</script>

<template>
  <div
    :class="[
      'flex gap-3 max-w-[85%]',
      alignment === 'right' ? 'ml-auto flex-row-reverse' : '',
      alignment === 'center' ? 'mx-auto' : '',
      isSelectable ? 'cursor-pointer' : '',
    ]"
    :role="isSelectable ? 'button' : undefined"
    :tabindex="isSelectable ? 0 : undefined"
    @click="selectVersion"
    @keydown="handleKeydown"
  >
    <ChatAgentAvatar :agent-id="message.agentId" />
    <div class="flex flex-col gap-1 min-w-0">
      <div
        :class="[
          'flex items-center gap-2',
          alignment === 'right' ? 'flex-row-reverse' : '',
          alignment === 'center' ? 'justify-center' : '',
        ]"
      >
        <span :class="['text-xs font-semibold', config.textClass]">{{ config.label }}</span>
        <UBadge :color="config.color as any" variant="subtle" size="xs">{{ roleBadge }}</UBadge>
        <span class="text-xs text-[var(--wd-ink-3)]">{{ timestamp }}</span>
      </div>

      <!-- Structured diff view -->
      <div
        v-if="hasActions"
        :class="[
          'rounded-2xl px-4 py-2.5 text-sm',
          `${config.bgClass} border ${config.borderClass}`,
          alignment === 'left' ? 'rounded-tl-sm' : '',
          alignment === 'right' ? 'rounded-tr-sm' : '',
          alignment === 'center' ? 'rounded-t-sm' : '',
          isSelectable ? 'transition-all hover:ring-1 hover:ring-[var(--wd-teal)]/50' : '',
          isSelected ? 'ring-2 ring-[var(--wd-teal)]' : '',
        ]"
      >
        <div class="divide-y divide-white/[0.04]">
          <div
            v-for="(action, i) in parsedActions"
            :key="i"
            class="flex items-start gap-2 py-1.5"
          >
            <span
              v-if="action.type === 'KEPT'"
              class="text-[10px] text-gray-500 mt-0.5 shrink-0"
            >✓</span>
            <span
              v-else-if="action.type === 'ADDED'"
              class="text-[10px] text-green-400 font-bold mt-0.5 shrink-0"
            >+</span>
            <span
              v-else-if="action.type === 'DROPPED'"
              class="text-[10px] text-red-400 font-bold mt-0.5 shrink-0"
            >×</span>
            <span
              v-else
              class="text-[10px] text-blue-400 font-bold mt-0.5 shrink-0"
            >↻</span>
            <p
              :class="[
                'text-[13px] leading-snug',
                action.type === 'KEPT' ? 'text-gray-400' : 'text-gray-200',
              ]"
            >
              {{ action.text }}
            </p>
          </div>
        </div>
      </div>

      <!-- Plain text fallback -->
      <div
        v-else
        :class="[
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-[var(--wd-teal)] text-[var(--wd-surface)] rounded-tr-sm'
            : `${config.bgClass} border ${config.borderClass}`,
          alignment === 'left' ? 'rounded-tl-sm' : '',
          alignment === 'right' && !isUser ? 'rounded-tr-sm' : '',
          alignment === 'center' ? 'rounded-t-sm' : '',
          isSelectable ? 'transition-all hover:ring-1 hover:ring-[var(--wd-teal)]/50' : '',
          isSelected ? 'ring-2 ring-[var(--wd-teal)]' : '',
        ]"
      >
        <p class="text-sm text-[var(--wd-ink-2)]">{{ message.content }}</p>
      </div>
    </div>
  </div>
</template>
