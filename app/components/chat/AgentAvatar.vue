<script setup lang="ts">
import type { AgentId } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'
import flaneurAvatar from '~/assets/images/agents/flaneur.png'
import completionistAvatar from '~/assets/images/agents/completionist.png'

const props = defineProps<{
  agentId: AgentId | 'user'
  size?: 'sm' | 'md'
}>()

const config = computed(() => getAgentConfig(props.agentId))
const avatarImage = computed(() => {
  if (props.agentId === 'flaneur') return flaneurAvatar
  if (props.agentId === 'completionist') return completionistAvatar
  return null
})
const hasIllustration = computed(() => Boolean(avatarImage.value))
</script>

<template>
  <div
    :class="[
      'flex items-center justify-center shrink-0',
      hasIllustration
        ? (size === 'sm' ? 'w-12 h-12' : 'w-16 h-16')
        : `rounded-full ${config.bgClass} ${size === 'sm' ? 'size-9' : 'size-12'}`,
    ]"
  >
    <img
      v-if="avatarImage"
      :src="avatarImage"
      :alt="config.label"
      class="h-full w-full object-contain object-bottom drop-shadow-md"
    >
    <UIcon
      v-else
      :name="config.icon"
      :class="[config.textClass, size === 'sm' ? 'size-5' : 'size-6']"
    />
  </div>
</template>
