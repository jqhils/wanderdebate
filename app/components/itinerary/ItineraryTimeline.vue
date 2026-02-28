<script setup lang="ts">
import type { DayPlan } from '~/utils/schemas'

defineProps<{
  days: DayPlan[]
}>()
</script>

<template>
  <div class="space-y-6">
    <div v-for="day in days" :key="day.dayNumber">
      <div class="flex items-center gap-2 mb-3 px-1">
        <div class="size-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <span class="text-xs font-bold text-amber-700 dark:text-amber-300">{{ day.dayNumber }}</span>
        </div>
        <h3 class="font-semibold text-sm">Day {{ day.dayNumber }}</h3>
        <span v-if="day.theme" class="text-xs text-gray-500 dark:text-gray-400 italic">
          — {{ day.theme }}
        </span>
      </div>

      <div class="ml-1">
        <ItineraryActivityCard
          v-for="activity in day.activities"
          :key="activity.id"
          :activity="activity"
        />
      </div>
    </div>
  </div>
</template>
