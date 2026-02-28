<script setup lang="ts">
import type { Activity } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = defineProps<{
  activity: Activity
}>()

const config = computed(() => getAgentConfig(props.activity.agentOrigin))
const expanded = ref(false)

const categoryEmoji: Record<string, string> = {
  landmark: '🏛️', food: '🍜', culture: '🎌', nature: '🌿',
  nightlife: '🌙', transit: '🚃', 'free-roam': '🚶',
}

const isTransit = computed(() => props.activity.category === 'transit')

function photoUrl(): string | null {
  const ref = props.activity.groundingData?.photoReference
  if (!ref || !ref.startsWith('places/')) return null
  const config = useRuntimeConfig()
  const key = config.public?.googlePlacesApiKey || ''
  return `https://places.googleapis.com/v1/${ref}/media?maxHeightPx=1200&key=${key}`
}

function statusDot() {
  if (props.activity.groundingStatus === 'verified') return 'bg-green-500'
  if (props.activity.groundingStatus === 'replaced') return 'bg-amber-500'
  return 'bg-gray-500'
}
</script>

<template>
  <div class="relative pl-8 pb-4 last:pb-0">
    <!-- Timeline connector -->
    <div class="absolute left-3 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-600 last:hidden" />
    <!-- Timeline dot -->
    <div :class="['absolute left-1.5 top-1 size-3.5 rounded-full border-2 border-gray-900', config.dotClass]" />

    <!-- Transit card (compact, no photo) -->
    <div v-if="isTransit" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
      <span class="text-sm">🚃</span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-blue-300 truncate">{{ activity.title }}</p>
        <p class="text-[10px] text-gray-500">{{ activity.timeBlock }}</p>
      </div>
    </div>

    <!-- Activity card (photo + progressive disclosure) -->
    <div
      v-else
      class="rounded-xl border border-gray-700 bg-gray-800/50 overflow-hidden cursor-pointer hover:border-gray-600 transition-all"
      @click="expanded = !expanded"
    >
      <!-- Photo hero (if available) -->
      <div v-if="photoUrl() && !expanded" class="relative h-28 overflow-hidden">
        <img
          :src="photoUrl()!"
          :alt="activity.title"
          class="w-full h-full object-cover"
          loading="lazy"
          @error="($event.target as HTMLImageElement).parentElement!.style.display = 'none'"
        />
        <!-- Gradient overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/30 to-transparent" />
        <!-- Title on photo -->
        <div class="absolute bottom-0 left-0 right-0 p-3">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-xs font-mono text-gray-300">{{ activity.timeBlock }}</span>
            <span class="text-sm">{{ categoryEmoji[activity.category] ?? '📍' }}</span>
            <div :class="['size-2 rounded-full', statusDot()]" />
            <span v-if="activity.groundingData?.rating" class="text-[10px] text-amber-400">⭐ {{ activity.groundingData.rating }}</span>
          </div>
          <h4 class="font-semibold text-sm text-white leading-tight">{{ activity.title }}</h4>
        </div>
      </div>

      <!-- Compact view (no photo or photo failed) -->
      <div v-if="!photoUrl() && !expanded" class="p-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-mono text-gray-400">{{ activity.timeBlock }}</span>
          <span class="text-sm">{{ categoryEmoji[activity.category] ?? '📍' }}</span>
          <div :class="['size-2 rounded-full', statusDot()]" />
          <span v-if="activity.groundingData?.rating" class="text-[10px] text-amber-400">⭐ {{ activity.groundingData.rating }}</span>
        </div>
        <h4 class="font-semibold text-sm text-white">{{ activity.title }}</h4>
        <p class="text-[11px] text-gray-500 mt-0.5 truncate">{{ activity.location }}</p>
      </div>

      <!-- Expanded view -->
      <div v-if="expanded" class="p-0">
        <!-- Large photo when expanded -->
        <div v-if="photoUrl()" class="h-40 overflow-hidden">
          <img
            :src="photoUrl()!"
            :alt="activity.title"
            class="w-full h-full object-cover"
            loading="lazy"
            @error="($event.target as HTMLImageElement).parentElement!.style.display = 'none'"
          />
        </div>
        <div class="p-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-mono text-gray-400">{{ activity.timeBlock }}</span>
            <span class="text-sm">{{ categoryEmoji[activity.category] ?? '📍' }}</span>
            <div :class="['size-2 rounded-full', statusDot()]" />
            <span v-if="activity.groundingData?.rating" class="text-[10px] text-amber-400">
              ⭐ {{ activity.groundingData.rating }}
              <span v-if="activity.groundingData.totalRatings" class="text-gray-600">({{ activity.groundingData.totalRatings.toLocaleString() }})</span>
            </span>
          </div>
          <h4 class="font-semibold text-sm text-white">{{ activity.title }}</h4>
          <p class="text-xs text-gray-500 mt-1">{{ activity.location }}</p>
          <p class="text-xs text-gray-400 mt-2 leading-relaxed">{{ activity.description }}</p>
          <div class="mt-2">
            <ItineraryReasoningToggle :reasoning="activity.agentLogic" />
          </div>
        </div>
      </div>

      <!-- Expand hint -->
      <div v-if="!expanded" class="px-3 pb-2 flex justify-center">
        <UIcon name="i-lucide-chevron-down" class="size-3 text-gray-600" />
      </div>
    </div>
  </div>
</template>
