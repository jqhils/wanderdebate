<script setup lang="ts">
import type { ChatMessage } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{
  message: ChatMessage
}>()

const config = computed(() => getAgentConfig(props.message.agentId))
const isUser = computed(() => props.message.agentId === 'user')
const renderedContent = computed(() => renderMarkdown(props.message.content))

// Alignment: flaneur left, completionist right, arbitrator center, user right
const alignment = computed(() => {
  if (isUser.value) return 'right'
  if (props.message.agentId === 'completionist') return 'right'
  if (props.message.agentId === 'arbitrator') return 'center'
  return 'left' // flaneur
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
</script>

<template>
  <div
    :class="[
      'flex gap-3 max-w-[85%]',
      alignment === 'right' ? 'ml-auto flex-row-reverse' : '',
      alignment === 'center' ? 'mx-auto' : '',
    ]"
  >
    <ChatAgentAvatar :agent-id="message.agentId" />
    <div class="flex flex-col gap-1 min-w-0">
      <div :class="['flex items-center gap-2', alignment === 'right' ? 'flex-row-reverse' : '', alignment === 'center' ? 'justify-center' : '']">
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
        <span class="text-xs text-gray-400">{{ timestamp }}</span>
      </div>
      <div
        :class="[
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-amber-500 text-white rounded-tr-sm'
            : `${config.bgClass} border ${config.borderClass}`,
          alignment === 'left' ? 'rounded-tl-sm' : '',
          alignment === 'right' && !isUser ? 'rounded-tr-sm' : '',
          alignment === 'center' ? 'rounded-t-sm' : '',
        ]"
      >
        <div class="prose prose-sm max-w-none dark:prose-invert" v-html="renderedContent" />
      </div>
    </div>
  </div>
</template>
