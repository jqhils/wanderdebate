<script setup lang="ts">
import { useDebateStore } from '~/stores/debate'

definePageMeta({ layout: 'session' })

const store = useDebateStore()
const showSidebar = ref(true)
const selectedDay = ref(0)
const mapRef = ref<any>(null)

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

function costFromLogic(logic: string | undefined): string | null {
  if (!logic) return null
  return logic.match(/[¥￥][\d,]+/)?.[0] ?? null
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
      class="absolute top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur-sm text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors border border-gray-700"
      @click="showSidebar = !showSidebar"
    >
      <UIcon :name="showSidebar ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'" class="size-5" />
    </button>

    <Transition enter-active-class="transition-transform duration-200 ease-out" leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="-translate-x-full" leave-to-class="-translate-x-full">
      <div v-if="showSidebar" class="absolute top-4 left-16 bottom-4 w-[380px] z-[1000] bg-gray-950/95 backdrop-blur-md rounded-2xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">

        <!-- Header -->
        <div class="px-5 pt-4 pb-3 border-b border-gray-800/50 shrink-0">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-base font-bold text-white tracking-tight">{{ store.session?.destination }}</h2>
            <span class="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">v{{ currentVersion?.versionNumber }}</span>
          </div>
          <div class="flex items-center gap-3 mb-3">
            <span class="flex items-center gap-1 text-[11px] text-green-400 font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-green-400" />
              {{ stats.verified }} verified
            </span>
            <span v-if="stats.replaced > 0" class="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {{ stats.replaced }} replaced
            </span>
            <span class="text-[11px] text-gray-500">{{ stats.total }} stops</span>
          </div>

          <!-- Day filter -->
          <div v-if="days.length > 1" class="flex gap-1.5">
            <button
              :class="['px-3 py-1 rounded-lg text-[11px] font-medium transition-all',
                selectedDay === 0 ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800']"
              @click="selectedDay = 0"
            >All</button>
            <button
              v-for="day in days" :key="day.dayNumber"
              :class="['px-3 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap',
                selectedDay === day.dayNumber ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800']"
              @click="selectedDay = day.dayNumber"
            >Day {{ day.dayNumber }}</button>
          </div>
        </div>

        <!-- Timeline -->
        <div class="flex-1 overflow-y-auto">
          <div class="px-4 py-3">
            <template v-for="(activity, idx) in filteredActivities" :key="activity.id">

              <!-- Walking connector -->
              <div
                v-if="idx > 0 && activity.category !== 'transit' && filteredActivities[idx-1]?.category !== 'transit'"
                class="relative ml-[18px] pl-5 py-0.5"
              >
                <div class="absolute left-[3px] top-0 bottom-0 w-px border-l-2 border-dotted border-gray-700" />
                <div class="flex items-center gap-1.5 py-1">
                  <span class="text-[10px] text-gray-500">🚶</span>
                  <span class="text-[10px] text-gray-500 font-medium">
                    {{ walkingMinutes(filteredActivities[idx-1], activity) ?? '?' }} min
                  </span>
                  <span class="flex-1 h-px bg-gray-800" />
                </div>
              </div>

              <!-- Transit connector -->
              <div
                v-if="activity.category === 'transit'"
                class="relative ml-[18px] pl-5 py-1"
              >
                <div class="absolute left-[3px] top-0 bottom-0 w-px border-l-2 border-dashed border-blue-500/40" />
                <div class="flex items-center gap-2 bg-blue-500/8 border border-blue-500/15 rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-500/15 transition-colors"
                  @click="flyTo(activity)">
                  <div class="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
                    <span class="text-xs">🚃</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-[11px] text-blue-300 font-semibold truncate">{{ activity.title }}</p>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-gray-500">{{ activity.timeBlock }}</span>
                      <span v-if="costFromLogic(activity.agentLogic)" class="text-[10px] text-blue-400 font-semibold">{{ costFromLogic(activity.agentLogic) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Activity card -->
              <div
                v-if="activity.category !== 'transit'"
                class="flex items-start gap-3 group cursor-pointer rounded-xl px-2 py-2 -mx-2 hover:bg-gray-800/40 transition-colors"
                @click="flyTo(activity)"
              >
                <!-- Numbered marker -->
                <div class="relative shrink-0 mt-0.5">
                  <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ring-2 ring-gray-950',
                    activity.groundingStatus === 'verified' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                    activity.groundingStatus === 'replaced' ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                    'bg-gradient-to-br from-gray-500 to-gray-600']">
                    {{ nonTransit.indexOf(activity) + 1 }}
                  </div>
                </div>

                <!-- Content -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="text-xs">{{ emoji[activity.category] ?? '📍' }}</span>
                    <h3 class="text-[13px] font-semibold text-white truncate group-hover:text-green-300 transition-colors">
                      {{ activity.title }}
                    </h3>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-gray-500 font-mono">{{ activity.timeBlock }}</span>
                    <span v-if="activity.groundingData?.rating" class="text-[10px] text-amber-400 font-medium">⭐ {{ activity.groundingData.rating }}</span>
                    <span v-if="costFromLogic(activity.agentLogic)" class="text-[10px] text-purple-400 font-medium">{{ costFromLogic(activity.agentLogic) }}</span>
                  </div>
                  <p v-if="activity.location" class="text-[10px] text-gray-600 mt-0.5 truncate">{{ activity.location }}</p>
                </div>

                <!-- Arrow -->
                <div class="text-gray-700 group-hover:text-gray-400 transition-colors shrink-0 mt-2">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </div>
              </div>

            </template>
          </div>
        </div>

        <!-- Footer legend -->
        <div class="px-4 py-2.5 border-t border-gray-800/50 shrink-0 bg-gray-950/50">
          <div class="flex items-center justify-center gap-4">
            <span class="flex items-center gap-1.5 text-[10px] text-gray-500"><span class="w-2 h-2 rounded-full bg-green-500" /> Verified</span>
            <span class="flex items-center gap-1.5 text-[10px] text-gray-500"><span class="w-2 h-2 rounded-full bg-amber-500" /> Replaced</span>
            <span class="flex items-center gap-1.5 text-[10px] text-gray-500"><span class="w-2 h-2 rounded-full bg-gray-500" /> Unverified</span>
            <span class="flex items-center gap-1.5 text-[10px] text-gray-500"><span class="w-2 h-2 rounded-full bg-blue-500" /> Transit</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
