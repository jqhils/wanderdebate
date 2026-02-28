<script setup lang="ts">
import type { Activity } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = defineProps<{
  activity: Activity
}>()

const config = computed(() => getAgentConfig(props.activity.agentOrigin))

const categoryIcon = computed(() => {
  const map: Record<string, string> = {
    landmark: 'i-lucide-landmark',
    food: 'i-lucide-utensils',
    culture: 'i-lucide-palette',
    nature: 'i-lucide-trees',
    nightlife: 'i-lucide-wine',
    transit: 'i-lucide-train',
    'free-roam': 'i-lucide-compass',
  }
  return map[props.activity.category] ?? 'i-lucide-map-pin'
})
</script>

<template>
  <div class="relative pl-8 pb-6 last:pb-0">
    <!-- Timeline connector -->
    <div class="absolute left-3 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-300 dark:border-gray-600 last:hidden" />

    <!-- Timeline dot -->
    <div :class="['absolute left-1.5 top-1 size-3.5 rounded-full border-2 border-white dark:border-gray-900', config.dotClass]" />

    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0">
              {{ activity.timeBlock }}
            </span>
            <UIcon :name="categoryIcon" class="size-3.5 text-gray-400 shrink-0" />
            <div :class="['size-2 rounded-full shrink-0', config.dotClass]" :title="config.label" />
          </div>
          <h4 class="font-semibold text-sm leading-tight">{{ activity.title }}</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {{ activity.description }}
          </p>
          <div class="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
            <UIcon name="i-lucide-map-pin" class="size-3" />
            <span class="truncate">{{ activity.location }}</span>
          </div>
        </div>
      </div>

      <div class="mt-2">
        <ItineraryReasoningToggle :reasoning="activity.agentLogic" />
      </div>
    </div>
  </div>
</template>
