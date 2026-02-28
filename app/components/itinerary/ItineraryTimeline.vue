<script setup lang="ts">
import type { DayPlan } from '~/utils/schemas'

defineProps<{
  days: DayPlan[]
}>()

function walkingMinutes(a: any, b: any): number | null {
  const c1 = a.coordinates
  const c2 = b.coordinates
  if (!c1?.lat || !c1?.lng || !c2?.lat || !c2?.lng) return null
  // Haversine-ish rough distance in meters
  const dist = Math.sqrt(
    Math.pow((c2.lat - c1.lat) * 111000, 2) +
    Math.pow((c2.lng - c1.lng) * 91000 * Math.cos(c1.lat * Math.PI / 180), 2)
  )
  return Math.round(dist / 80) // ~80m/min walking
}
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
        <template v-for="(activity, idx) in day.activities" :key="activity.id">
          <!-- Connector: how you get from previous activity to this one -->
          <div
            v-if="idx > 0 && activity.category !== 'transit' && day.activities[idx-1]?.category !== 'transit'"
            class="relative pl-8 py-1"
          >
            <div class="absolute left-3 top-0 bottom-0 w-px border-l-2 border-dotted border-gray-600" />
            <div class="flex items-center gap-2 text-[11px] text-gray-500 py-1">
              <span>🚶</span>
              <span v-if="walkingMinutes(day.activities[idx-1], activity) !== null">
                {{ walkingMinutes(day.activities[idx-1], activity) }} min walk
              </span>
              <span v-else>Walk</span>
              <span class="flex-1 border-b border-dotted border-gray-700" />
            </div>
          </div>

          <!-- Transit connector (when the activity IS transit) -->
          <div
            v-if="activity.category === 'transit'"
            class="relative pl-8 py-1"
          >
            <div class="absolute left-3 top-0 bottom-0 w-px border-l-2 border-dotted border-blue-500/30" />
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span class="text-sm">🚃</span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-blue-300">{{ activity.title }}</p>
                <div class="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                  <span>{{ activity.timeBlock }}</span>
                  <span v-if="(activity.agentLogic ?? '').match(/[¥￥][\d,]+/)" class="text-blue-400 font-medium">
                    {{ (activity.agentLogic ?? '').match(/[¥￥][\d,]+/)?.[0] }}
                  </span>
                  <span v-if="activity.description" class="truncate">{{ activity.description.slice(0, 60) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Regular activity card (skip transit, handled above) -->
          <ItineraryActivityCard
            v-if="activity.category !== 'transit'"
            :activity="activity"
          />
        </template>
      </div>
    </div>
  </div>
</template>
