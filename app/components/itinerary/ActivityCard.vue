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
  return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=1600&maxHeightPx=900&key=${key}`
}

function statusDot() {
  if (props.activity.groundingStatus === 'verified') return 'bg-green-500'
  if (props.activity.groundingStatus === 'replaced') return 'bg-amber-500'
  return 'bg-gray-500'
}

function needsTicket(activity: any): boolean {
  // Only show for places that actually need tickets/reservations
  if (activity.category === 'food' || activity.category === 'free-roam' || activity.category === 'transit') return false
  const text = ((activity.description || '') + ' ' + (activity.agentLogic || '')).toLowerCase()
  // Must explicitly mention tickets/booking/admission
  if (/ticket|admission|entry fee|skip.the.line|book.*advance|reserv.*advance/i.test(text)) return true
  // Known ticketed venue types
  const title = (activity.title || '').toLowerCase()
  if (/museum|gallery|skytree|teamlab|tower.*observation|aquarium|theme.park|disneyland|disney/i.test(title)) return true
  return false
}

function ticketSearchUrl(activity: any): string {
  // Use venue's official website from Google Places if available
  if (activity.groundingData?.websiteUri) return activity.groundingData.websiteUri
  // Otherwise link to the venue's Google Maps page
  if (activity.groundingData?.placeId) return 'https://www.google.com/maps/place/?q=place_id:' + activity.groundingData.placeId
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activity.title + ' tickets')
}

function ticketLabel(activity: any): string {
  if (activity.groundingData?.websiteUri) return '🎟️ Official site'
  return '🎟️ Book tickets'
}

function mapsUrl(activity: any): string {
  if (activity.groundingData?.placeId) return 'https://www.google.com/maps/place/?q=place_id:' + activity.groundingData.placeId
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activity.title + ' ' + activity.location)
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
      <div v-if="photoUrl() && !expanded" class="relative aspect-[16/9] overflow-hidden">
        <img
          :src="photoUrl()!"
          :alt="activity.title"
          class="w-full h-full object-cover object-center"
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
        <div v-if="photoUrl()" class="aspect-[16/9] overflow-hidden">
          <img
            :src="photoUrl()!"
            :alt="activity.title"
            class="w-full h-full object-cover object-center"
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
          <div class="flex gap-2 mt-3">
            <a :href="mapsUrl(activity)" target="_blank"
              class="px-3 py-1.5 text-[11px] rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors inline-flex items-center gap-1.5">
              📍 Open in Maps
            </a>
            <a v-if="needsTicket(activity)" :href="ticketSearchUrl(activity)" target="_blank"
              class="px-3 py-1.5 text-[11px] rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1.5">
              🎟️ Find tickets
            </a>
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
