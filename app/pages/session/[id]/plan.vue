<script setup lang="ts">
import { useDebateStore } from '~/stores/debate'

definePageMeta({ layout: 'session' })

const store = useDebateStore()
const currentVersion = computed(() => store.versions[store.currentVersionIndex])
const activities = computed(() => currentVersion.value?.days?.flatMap((d: any) => d.activities ?? []) ?? [])

function parseCost(activity: any): string | null {
  const text = (activity.description ?? '') + ' ' + (activity.agentLogic ?? '')
  const match = text.match(/[¥￥][\d,]+/)
  return match?.[0] ?? null
}

const estimatedBudget = computed(() => {
  let total = 0
  for (const a of activities.value) {
    const cost = parseCost(a)
    if (cost) {
      const num = parseInt(cost.replace(/[¥￥$,]/g, ''))
      if (!isNaN(num)) total += num
    }
  }
  return total
})

const categoryIcon: Record<string, string> = {
  food: '🍜', landmark: '🏛️', culture: '🎌', nature: '🌿', nightlife: '🌙', transit: '🚃', 'free-roam': '🚶',
}

function mapsLink(activity: any): string {
  if (activity.groundingData?.placeId) return `https://www.google.com/maps/place/?q=place_id:${activity.groundingData.placeId}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.title + ' ' + activity.location)}`
}

function photoUrl(activity: any): string | null {
  const ref = activity.groundingData?.photoReference
  if (!ref || !ref.startsWith('places/')) return null
  const config = useRuntimeConfig()
  const key = config.public?.googlePlacesApiKey || ''
  return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=1600&maxHeightPx=900&key=${key}`
}

function statusBadge(activity: any) {
  if (activity.groundingStatus === 'verified') return { text: 'Verified', color: 'text-green-400 bg-green-500/20' }
  if (activity.groundingStatus === 'replaced') return { text: 'Replaced', color: 'text-amber-400 bg-amber-500/20' }
  return { text: 'Unverified', color: 'text-gray-400 bg-gray-500/20' }
}

const nearestNeighborhood = computed(() => {
  const dest = store.session?.destination ?? ''
  const first = activities.value.find((a: any) => a.category !== 'transit')
  if (!first) return dest
  // Use activity location, extract the neighborhood name (not full address)
  const loc = first.location || ''
  // Try to get a clean neighborhood: skip numbered addresses, take the area name
  const parts = loc.split(',').map((s: string) => s.trim())
  const neighborhood = parts.find((p: string) => !/^\d/.test(p) && p.length > 2 && p.length < 30) || parts[0] || ''
  if (!neighborhood || neighborhood === dest) return dest
  return neighborhood + ', ' + dest
})

const stayQuery = computed(() => encodeURIComponent(nearestNeighborhood.value))

const bookingLink = computed(() => 
  `https://www.booking.com/searchresults.html?ss=${stayQuery.value}`
)

const airbnbLink = computed(() =>
  `https://www.airbnb.com/s/${stayQuery.value}/homes`
)

const googleHotelLink = computed(() =>
  `https://www.google.com/travel/hotels/${stayQuery.value}`
)

function needsTicket(activity: any): boolean {
  // Only show for places that actually need tickets/reservations
  if (activity.category === 'food' || activity.category === 'free-roam' || activity.category === 'transit') return false
  const text = ((activity.description || '') + ' ' + (activity.agentLogic || '')).toLowerCase()
  // Must explicitly mention tickets/booking/admission
  if (/ticket|admission|entry fee|skip.the.line|book.*advance|reserv.*advance/i.test(text)) return true
  // Known ticketed venue types
  const title = (activity.title || '').toLowerCase()
  if (/museum|gallery|skytree|teamlab|tower.*observation|aquarium|theme.park|disneyland|disney|shibuya.sky|sky.tree|observation/i.test(title)) return true
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
</script>

<template>
  <div class="h-full overflow-y-auto bg-gray-950">
    <div class="max-w-3xl mx-auto px-6 py-8">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-white mb-1">Your Itinerary</h1>
        <p v-if="currentVersion" class="text-sm text-gray-500">
          v{{ currentVersion.versionNumber }} · {{ activities.filter((a: any) => a.category !== 'transit').length }} stops
        </p>
      </div>



      <div class="relative">
        <div class="absolute left-6 top-0 bottom-0 w-px bg-gray-800" />

        <div v-for="activity in activities" :key="activity.id" class="relative mb-2">
          <div v-if="activity.category === 'transit'" class="ml-14 py-3">
            <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <span class="text-sm">🚃</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-blue-300">{{ activity.title }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ activity.timeBlock }}</p>
                <p class="text-xs text-gray-600 mt-1 line-clamp-2">{{ activity.description }}</p>
              </div>
              <div v-if="parseCost(activity)" class="text-xs text-blue-400 font-medium shrink-0">{{ parseCost(activity) }}</div>
            </div>
            <div class="absolute left-4 top-5 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-blue-400" />
            </div>
          </div>

          <div v-else class="ml-14 py-2">
            <div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors">
              <div v-if="photoUrl(activity)" class="aspect-[16/9] overflow-hidden">
                <img :src="photoUrl(activity)!" :alt="activity.title" class="w-full h-full object-cover object-center" loading="lazy"
                  @error="($event.target as HTMLImageElement).parentElement!.style.display = 'none'" />
              </div>
              <div class="p-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs text-gray-500 font-mono">{{ activity.timeBlock }}</span>
                  <span class="text-sm">{{ categoryIcon[activity.category] ?? '📍' }}</span>
                  <span :class="['px-2 py-0.5 text-[10px] rounded-full font-medium', statusBadge(activity).color]">{{ statusBadge(activity).text }}</span>
                </div>
                <h3 class="text-base font-semibold text-white mb-1">{{ activity.title }}</h3>
                <p class="text-xs text-gray-500 mb-2">{{ activity.location }}</p>
                <div v-if="activity.groundingData?.rating" class="flex items-center gap-2 mb-3">
                  <span class="text-xs text-amber-400">⭐ {{ activity.groundingData.rating }}</span>
                  <span v-if="activity.groundingData.totalRatings" class="text-xs text-gray-600">({{ activity.groundingData.totalRatings.toLocaleString() }})</span>
                </div>
                <p class="text-xs text-gray-400 leading-relaxed mb-3">{{ activity.description }}</p>
                <div v-if="parseCost(activity)" class="mb-3">
                  <span class="text-xs text-amber-400 font-medium">{{ parseCost(activity) }}</span>
                </div>
                <div class="flex gap-2">
                  <a :href="mapsLink(activity)" target="_blank" class="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors inline-flex items-center gap-1">
                    <UIcon name="i-lucide-map-pin" class="size-3" /> Open in Maps
                  </a>
                  <a v-if="needsTicket(activity)" :href="ticketSearchUrl(activity)" target="_blank" class="px-3 py-1.5 text-xs rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1">
                    🎟️ Find tickets
                  </a>
                </div>
              </div>
            </div>
            <div class="absolute left-4 top-6 w-5 h-5 rounded-full border-2 border-gray-800 bg-gray-950 flex items-center justify-center">
              <div :class="['w-2.5 h-2.5 rounded-full', activity.groundingStatus === 'verified' ? 'bg-green-500' : activity.groundingStatus === 'replaced' ? 'bg-amber-500' : 'bg-gray-600']" />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 p-5 rounded-xl bg-gray-900 border border-gray-800">
        <h3 class="text-sm font-semibold text-white mb-2">🏨 Where to stay</h3>
        <p class="text-xs text-gray-500 mb-3">Based on your itinerary, we recommend staying near <span class="text-amber-400">{{ nearestNeighborhood }}</span>.</p>
        <div class="flex gap-2">
          <a :href="bookingLink" target="_blank"
            class="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors inline-flex items-center gap-1">
            <UIcon name="i-lucide-bed" class="size-3" /> Booking.com
          </a>
          <a :href="airbnbLink" target="_blank"
            class="px-3 py-1.5 text-xs rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors inline-flex items-center gap-1">
            <UIcon name="i-lucide-home" class="size-3" /> Airbnb
          </a>
          <a :href="googleHotelLink" target="_blank"
            class="px-3 py-1.5 text-xs rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1">
            <UIcon name="i-lucide-search" class="size-3" /> Google Hotels
          </a>
        </div>
      </div>
      <div class="h-20 lg:h-8" />
    </div>
  </div>
</template>