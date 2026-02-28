<script setup lang="ts">
import type { ItineraryVersion } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = defineProps<{
  versions: ItineraryVersion[]
  currentIndex: number
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

function prev() {
  if (props.currentIndex > 0) {
    emit('select', props.currentIndex - 1)
  }
}

function next() {
  if (props.currentIndex < props.versions.length - 1) {
    emit('select', props.currentIndex + 1)
  }
}
</script>

<template>
  <div class="flex items-center justify-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <UButton
      icon="i-lucide-chevron-left"
      variant="ghost"
      size="xs"
      :disabled="currentIndex === 0"
      @click="prev"
    />

    <div class="flex items-center gap-1.5">
      <button
        v-for="(version, idx) in versions"
        :key="version.id"
        :class="[
          'size-3 rounded-full transition-all',
          getAgentConfig(version.agentId).dotClass,
          idx === currentIndex
            ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-125'
            : 'opacity-40 hover:opacity-70',
        ]"
        :style="idx === currentIndex ? `--tw-ring-color: var(--color-${getAgentConfig(version.agentId).color}-500)` : ''"
        :title="`v${version.versionNumber} — ${getAgentConfig(version.agentId).label}`"
        @click="emit('select', idx)"
      />
    </div>

    <UButton
      icon="i-lucide-chevron-right"
      variant="ghost"
      size="xs"
      :disabled="currentIndex === versions.length - 1"
      @click="next"
    />

    <span class="ml-2 text-xs text-gray-500">
      v{{ versions[currentIndex]?.versionNumber }}
    </span>
  </div>
</template>
