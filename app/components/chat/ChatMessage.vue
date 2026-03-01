<script setup lang="ts">
import type { ChatMessage } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{
  message: ChatMessage
  selectedVersionId?: string | null
}>()

const emit = defineEmits<{
  selectVersion: [versionId: string]
}>()

const config = computed(() => getAgentConfig(props.message.agentId))
const isUser = computed(() => props.message.agentId === 'user')
const renderedContent = computed(() => renderMarkdown(props.message.content))
const isLinkedToVersion = computed(() => Boolean(props.message.relatedVersionId))
const isSelectable = computed(() => !isUser.value && isLinkedToVersion.value)
const isSelected = computed(() =>
  isSelectable.value
  && Boolean(props.selectedVersionId)
  && props.message.relatedVersionId === props.selectedVersionId,
)

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
    if (target?.closest('a')) {
      return
    }
  }

  emit('selectVersion', props.message.relatedVersionId)
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
      isUser ? 'ml-auto flex-row-reverse' : '',
      isSelectable ? 'cursor-pointer' : '',
    ]"
    :role="isSelectable ? 'button' : undefined"
    :tabindex="isSelectable ? 0 : undefined"
    @click="selectVersion"
    @keydown="handleKeydown"
  >
    <ChatAgentAvatar :agent-id="message.agentId" />
    <div class="flex flex-col gap-1 min-w-0">
      <div :class="['flex items-center gap-2', isUser ? 'flex-row-reverse' : '']">
        <span :class="['text-xs font-semibold', config.textClass]">
          {{ config.label }}
        </span>
        <UBadge
          :color="config.color as any"
          variant="subtle"
          size="xs"
        >
          {{ roleBadge }}
        </UBadge>
        <span class="text-xs text-[var(--wd-ink-3)]">{{ timestamp }}</span>
      </div>
      <div
        :class="[
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-[var(--wd-teal)] text-[var(--wd-surface)] rounded-tr-sm'
            : `${config.bgClass} border ${config.borderClass} rounded-tl-sm`,
          isSelectable ? 'transition-all hover:ring-1 hover:ring-[var(--wd-teal)]/50' : '',
          isSelected ? 'ring-2 ring-[var(--wd-teal)]' : '',
        ]"
      >
        <!-- eslint-disable vue/no-v-html -->
        <div class="prose prose-sm max-w-none prose-invert" v-html="renderedContent" />
      </div>
    </div>
  </div>
</template>
