<script setup lang="ts">
import { useDebateStore } from '~/stores/debate'

definePageMeta({ layout: 'session' })

const store = useDebateStore()
const showSidebar = ref(true)
const selectedDay = ref(0)
const hoveredId = ref<string | null>(null)
const mapRef = ref<any>(null)

const config = useRuntimeConfig()

const currentVersion = computed(() => store.versions[store.currentVersionIndex])
const days = computed(() => currentVersion.value?.days ?? [])

const filteredActivities = computed(() => {
  if (selectedDay.value === 0) return days.value.flatMap((d: any) => d.activities ?? [])
  const day = days.value.find((d: any) => d.dayNumber === selectedDay.value)
  return day?.activities ?? []
})

const nonTransit = computed(() => filteredActivities.value.filter((a: any) => a.category !== 'transit'))

const stats = computed(() => {
  const all = days.value.flatMap((d: any) => d.activities ?? [])
  return {
    total: all.filter((a: any) => a.category !== 'transit').length,
    verified: all.filter((a: any) => a.groundingStatus === 'verified').length,
    replaced: all.filter((a: any) => a.groundingStatus === 'replaced').length,
  }
})

const totalWalkMin = computed(() => {
  let total = 0
  for (let i = 1; i < nonTransit.value.length; i++) {
    const m = walkingMinutes(nonTransit.value[i - 1], nonTransit.value[i])
    if (m) total += m
  }
  return total
})

function walkingMinutes(a: any, b: any): number | null {
  const c1 = a.coordinates; const c2 = b.coordinates
  if (!c1?.lat || !c1?.lng || !c2?.lat || !c2?.lng) return null
  const dist = Math.sqrt(Math.pow((c2.lat - c1.lat) * 111000, 2) + Math.pow((c2.lng - c1.lng) * 91000 * Math.cos(c1.lat * Math.PI / 180), 2))
  const mins = Math.round(dist / 80)
  return mins > 0 ? mins : 1
}

function flyTo(activity: any) {
  const c = activity.coordinates
  if (c?.lat && c?.lng) mapRef.value?.flyToActivity?.(c.lat, c.lng)
}

function thumbUrl(activity: any): string | null {
  const ref = activity.groundingData?.photoReference
  if (!ref) return null
  const key = config.public.googlePlacesApiKey
  if (!key) return null
  return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=200&key=${key}`
}

function costFromLogic(logic: string | undefined): string | null {
  if (!logic) return null
  return logic.match(/[¥￥€$£][\d,.]+/)?.[0] ?? null
}

function timeOfDay(timeBlock: string): string {
  const hour = parseInt(timeBlock.split(':')[0])
  if (hour < 12) return 'morning'
  if (hour < 14) return 'lunch'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function shouldShowTimeLabel(idx: number): boolean {
  if (idx === 0) return true
  const prev = nonTransit.value[idx - 1]
  const curr = nonTransit.value[idx]
  if (!prev || !curr) return false
  return timeOfDay(prev.timeBlock) !== timeOfDay(curr.timeBlock)
}

function timeLabelText(activity: any): string {
  const t = timeOfDay(activity.timeBlock)
  return t === 'morning' ? '☀️ Morning' : t === 'lunch' ? '🍽️ Lunch' : t === 'afternoon' ? '🌤️ Afternoon' : '🌙 Evening'
}

const emoji: Record<string, string> = {
  landmark: '🏛️', food: '🍜', culture: '🎌', nature: '🌿',
  nightlife: '🌙', transit: '🚃', 'free-roam': '🚶',
}
</script>

<template>
  <div class="h-full relative">
    <ItineraryMap ref="mapRef" :versions="store.versions" :current-index="store.currentVersionIndex" class="h-full w-full" />

    <button
      class="absolute top-4 left-4 z-[1000] bg-gray-900/80 backdrop-blur text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors border border-gray-700/50"
      @click="showSidebar = !showSidebar"
    >
      <UIcon :name="showSidebar ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'" class="size-5" />
    </button>

    <Transition enter-active-class="transition-transform duration-200 ease-out" leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="-translate-x-full" leave-to-class="-translate-x-full">
      <div v-if="showSidebar" class="absolute top-4 left-16 bottom-4 w-[400px] z-[1000] bg-[#0c0f14]/95 backdrop-blur-lg rounded-2xl border border-white/[0.06] flex flex-col overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]">

        <!-- Header -->
        <div class="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <h2 class="text-lg font-bold text-white tracking-tight capitalize">{{ store.session?.destination }}</h2>
          <div class="flex items-center gap-3 mt-1.5 text-[12px]">
            <span class="text-gray-400">{{ stats.total }} stops</span>
            <span class="text-gray-600">·</span>
            <span class="text-green-400">{{ stats.verified }} verified</span>
            <span v-if="totalWalkMin > 0" class="text-gray-600">·</span>
            <span v-if="totalWalkMin > 0" class="text-gray-400">~{{ totalWalkMin }} min walking</span>
          </div>

          <div v-if="days.length > 1" class="flex gap-1.5 mt-3">
            <button
              :class="['px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                selectedDay === 0 ? 'bg-white text-gray-900' : 'bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1]']"
              @click="selectedDay = 0"
            >All</button>
            <button
              v-for="day in days" :key="day.dayNumber"
              :class="['px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap',
                selectedDay === day.dayNumber ? 'bg-white text-gray-900' : 'bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1]']"
              @click="selectedDay = day.dayNumber"
            >Day {{ day.dayNumber }}</button>
          </div>
        </div>

        <!-- Timeline -->
        <div class="flex-1 overflow-y-auto">
          <div class="py-3">
            <template v-for="(activity, idx) in filteredActivities" :key="activity.id">

              <!-- Time of day label -->
              <div
                v-if="activity.category !== 'transit' && shouldShowTimeLabel(nonTransit.indexOf(activity))"
                class="px-5 pt-3 pb-1"
              >
                <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {{ timeLabelText(activity) }}
                </span>
              </div>

              <!-- Walking connector pill -->
              <div
                v-if="idx > 0 && activity.category !== 'transit' && filteredActivities[idx-1]?.category !== 'transit'"
                class="flex items-center gap-2 px-5 py-1"
              >
                <div class="flex-1 h-px bg-white/[0.04]" />
                <span class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-gray-500">
                  🚶 {{ walkingMinutes(filteredActivities[idx-1], activity) ?? '?' }} min
                </span>
                <div class="flex-1 h-px bg-white/[0.04]" />
              </div>

              <!-- Transit connector -->
              <div
                v-if="activity.category === 'transit'"
                class="mx-5 my-1"
              >
                <div class="flex items-center gap-2.5 bg-blue-500/[0.06] border border-blue-500/[0.1] rounded-xl px-3 py-2 cursor-pointer hover:bg-blue-500/[0.1] transition-colors"
                  @click="flyTo(activity)">
                  <div class="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <span class="text-sm">🚃</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-[12px] text-blue-300 font-medium truncate">{{ activity.title }}</p>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-gray-500">{{ activity.timeBlock }}</span>
                      <span v-if="costFromLogic(activity.agentLogic)" class="text-[10px] text-blue-400 font-semibold">{{ costFromLogic(activity.agentLogic) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Activity card with thumbnail -->
              <div
                v-if="activity.category !== 'transit'"
                class="group flex items-start gap-3 px-5 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                :class="{ 'bg-white/[0.04]': hoveredId === activity.id }"
                @click="flyTo(activity)"
                @mouseenter="hoveredId = activity.id"
                @mouseleave="hoveredId = null"
              >
                <!-- Thumbnail -->
                <div class="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-800 mt-0.5">
                  <img v-if="thumbUrl(activity)" :src="thumbUrl(activity)!" class="w-full h-full object-cover" loading="lazy"
                    @error="($event.target as HTMLImageElement).style.display='none'" />
                  <div v-else class="w-full h-full flex items-center justify-center text-lg">
                    {{ emoji[activity.category] ?? '📍' }}
                  </div>
                </div>

                <!-- Content -->
                <div class="min-w-0 flex-1">
                  <h3 class="text-[13px] font-semibold text-white/90 truncate leading-tight group-hover:text-green-300 transition-colors">
                    {{ activity.title }}
                  </h3>
                  <p class="text-[11px] text-gray-500 mt-0.5">{{ activity.timeBlock }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span v-if="activity.groundingData?.rating" class="text-[11px] text-amber-400/80 font-medium">⭐ {{ activity.groundingData.rating }}</span>
                    <span v-if="costFromLogic(activity.agentLogic)" class="text-[11px] text-purple-400/80">{{ costFromLogic(activity.agentLogic) }}</span>
                    <span v-if="activity.location" class="text-[10px] text-gray-600 truncate">{{ activity.location.split(',')[0] }}</span>
                  </div>
                </div>

                <!-- Verified dot -->
                <div class="shrink-0 mt-2">
                  <div :class="['w-2 h-2 rounded-full',
                    activity.groundingStatus === 'verified' ? 'bg-green-400' :
                    activity.groundingStatus === 'replaced' ? 'bg-amber-400' : 'bg-gray-600']" />
                </div>
              </div>

            </template>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-white/[0.06] shrink-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1.5 text-[10px] text-gray-500"><span class="w-1.5 h-1.5 rounded-full bg-green-400" /> Verified</span>
              <span class="flex items-center gap-1.5 text-[10px] text-gray-500"><span class="w-1.5 h-1.5 rounded-full bg-amber-400" /> Replaced</span>
              <span class="flex items-center gap-1.5 text-[10px] text-gray-500"><span class="w-1.5 h-1.5 rounded-full bg-blue-400" /> Transit</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
