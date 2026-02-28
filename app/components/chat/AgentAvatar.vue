<script setup lang="ts">
import type { AgentId } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = defineProps<{
  agentId: AgentId | 'user'
  size?: 'sm' | 'md'
}>()

const config = computed(() => getAgentConfig(props.agentId))
</script>

<template>
  <div
    :class="[
      'rounded-full flex items-center justify-center shrink-0',
      config.bgClass,
      size === 'sm' ? 'size-7' : 'size-9',
    ]"
  >
    <UIcon
      :name="config.icon"
      :class="[config.textClass, size === 'sm' ? 'size-4' : 'size-5']"
    />
  </div>
</template>
