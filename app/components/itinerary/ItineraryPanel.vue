<script setup lang="ts">
import type { ItineraryVersion } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = defineProps<{
  versions: ItineraryVersion[]
  currentIndex: number
}>()

const emit = defineEmits<{
  'update:currentIndex': [index: number]
}>()

const currentVersion = computed(() => props.versions[props.currentIndex] ?? null)
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold">Itinerary</h2>
    </div>

    <!-- Empty state -->
    <div v-if="versions.length === 0" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center">
        <UIcon name="i-lucide-loader-circle" class="size-10 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-3" />
        <p class="text-sm text-gray-500 dark:text-gray-400">Agents are thinking...</p>
      </div>
    </div>

    <template v-else>
      <ItineraryVersionSelector
        :versions="versions"
        :current-index="currentIndex"
        @select="emit('update:currentIndex', $event)"
      />

      <div v-if="currentVersion" class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Agent commentary -->
        <div :class="['rounded-lg p-3 text-sm', getAgentConfig(currentVersion.agentId).bgClass]">
          <div class="flex items-center gap-2 mb-1">
            <ChatAgentAvatar :agent-id="currentVersion.agentId" size="sm" />
            <span :class="['text-xs font-semibold', getAgentConfig(currentVersion.agentId).textClass]">
              {{ getAgentConfig(currentVersion.agentId).label }}
            </span>
            <span class="text-xs text-gray-400">v{{ currentVersion.versionNumber }}</span>
          </div>
          <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
            {{ currentVersion.commentary }}
          </p>
        </div>

        <!-- Timeline -->
        <ItineraryTimeline :days="currentVersion.days" />

        <!-- Changes Summary -->
        <ItineraryChangesSummary
          v-if="currentVersion.changesSummary"
          :changes="currentVersion.changesSummary"
        />
      </div>
    </template>
  </div>
</template>
