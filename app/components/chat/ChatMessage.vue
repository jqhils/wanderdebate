<script setup lang="ts">
import type { ChatMessage } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = defineProps<{
  message: ChatMessage
}>()

const config = computed(() => getAgentConfig(props.message.agentId))
const isUser = computed(() => props.message.agentId === 'user')

const parsedActions = computed(() => {
  const text = props.message.content
  const actions: { type: string; text: string }[] = []
  const parts = text.split(/(KEPT|CHANGED|ADDED|DROPPED)\s+/)
  for (let i = 1; i < parts.length; i += 2) {
    const type = parts[i]
    let body = (parts[i + 1] || '').trim().replace(/\.\s*$/, '')
    if (body) actions.push({ type, text: body })
  }
  return actions
})

const hasActions = computed(() => parsedActions.value.length > 0 && !isUser.value && props.message.role !== 'system')
const plainText = computed(() => props.message.content)

const alignment = computed(() => {
  if (isUser.value) return 'right'
  if (props.message.agentId === 'completionist') return 'right'
  if (props.message.agentId === 'arbitrator') return 'center'
  return 'left'
})

const roleBadge = computed(() => {
  const map: Record<string, string> = {
    'proposal': 'Proposal', 'critique': 'Critique', 'merge': 'Merge',
    'system': 'System', 'user-input': 'Message',
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
        <span :class="['text-xs font-semibold', config.textClass]">{{ config.label }}</span>
        <UBadge :color="config.color as any" variant="subtle" size="xs">{{ roleBadge }}</UBadge>
        <span class="text-xs text-gray-400">{{ timestamp }}</span>
      </div>

      <!-- Structured diff - single card, tight rows -->
      <div
        v-if="hasActions"
        :class="[
          'rounded-2xl px-4 py-2.5 text-sm',
          `${config.bgClass} border ${config.borderClass}`,
          alignment === 'left' ? 'rounded-tl-sm' : '',
          alignment === 'right' ? 'rounded-tr-sm' : '',
          alignment === 'center' ? 'rounded-t-sm' : '',
        ]"
      >
        <div class="divide-y divide-white/[0.04]">
          <div
            v-for="(action, i) in parsedActions"
            :key="i"
            :class="['flex items-start gap-2 py-1.5', action.type === 'KEPT' ? 'opacity-50' : '']"
          >
            <span
              v-if="action.type === 'KEPT'"
              class="text-[10px] text-gray-500 mt-0.5 shrink-0">✓</span>
            <span
              v-else-if="action.type === 'ADDED'"
              class="text-[10px] text-green-400 font-bold mt-0.5 shrink-0">+</span>
            <span
              v-else-if="action.type === 'DROPPED'"
              class="text-[10px] text-red-400 font-bold mt-0.5 shrink-0">×</span>
            <span
              v-else
              class="text-[10px] text-blue-400 font-bold mt-0.5 shrink-0">↻</span>
            <p :class="['text-[13px] leading-snug', action.type === 'KEPT' ? 'text-gray-500' : 'text-gray-300']">
              {{ action.text }}
            </p>
          </div>
        </div>
      </div>

      <!-- Plain text -->
      <div
        v-else
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
        <p class="text-sm text-gray-300">{{ plainText }}</p>
      </div>
    </div>
  </div>
</template>
