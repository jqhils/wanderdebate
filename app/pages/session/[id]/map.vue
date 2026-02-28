<script setup lang="ts">
import { useDebateStore } from '~/stores/debate'

definePageMeta({ layout: 'session' })

const store = useDebateStore()
const showSidebar = ref(true)
const currentVersion = computed(() => store.versions[store.currentVersionIndex])
const activities = computed(() => currentVersion.value?.days?.flatMap((d: any) => d.activities ?? []) ?? [])
const nonTransit = computed(() => activities.value.filter((a: any) => a.category !== 'transit'))

const stats = computed(() => ({
  total: nonTransit.value.length,
  verified: activities.value.filter((a: any) => a.groundingStatus === 'verified').length,
  replaced: activities.value.filter((a: any) => a.groundingStatus === 'replaced').length,
  unverified: activities.value.filter((a: any) => !a.groundingStatus || a.groundingStatus === 'unresolved').length,
}))
</script>

<template>
  <div class="h-full relative">
    <ItineraryMap :versions="store.versions" :current-index="store.currentVersionIndex" class="h-full w-full" />

    <button class="absolute top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur-sm text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors border border-gray-700"
      @click="showSidebar = !showSidebar">
      <UIcon :name="showSidebar ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'" class="size-5" />
    </button>

    <Transition enter-active-class="transition-transform duration-200 ease-out" leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="-translate-x-full" leave-to-class="-translate-x-full">
      <div v-if="showSidebar" class="absolute top-4 left-16 bottom-4 w-80 z-[1000] bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700 flex flex-col overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-800 shrink-0">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-sm font-semibold text-white">Itinerary</h2>
            <span class="text-xs text-gray-500">v{{ currentVersion?.versionNumber }} · {{ stats.total }} stops</span>
          </div>
          <div class="flex gap-2">
            <span class="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-400 font-medium">{{ stats.verified }} verified</span>
            <span v-if="stats.replaced > 0" class="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-400 font-medium">{{ stats.replaced }} replaced</span>
            <span v-if="stats.unverified > 0" class="px-2 py-0.5 text-[10px] rounded-full bg-gray-500/20 text-gray-400 font-medium">{{ stats.unverified }} unverified</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-1">
          <template v-for="activity in activities" :key="activity.id">
            <div v-if="activity.category === 'transit'" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-800">
              <div class="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0"><span class="text-xs">🚃</span></div>
              <div class="min-w-0">
                <p class="text-[11px] text-blue-300 font-medium truncate">{{ activity.title }}</p>
                <p class="text-[10px] text-gray-500">{{ activity.timeBlock }}</p>
              </div>
            </div>
            <div v-else class="px-3 py-2.5 rounded-lg bg-gray-800/30 hover:bg-gray-800/60 transition-colors cursor-pointer border border-transparent hover:border-gray-700">
              <div class="flex items-start gap-2.5">
                <div :class="['w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white',
                  activity.groundingStatus === 'verified' ? 'bg-green-600' : activity.groundingStatus === 'replaced' ? 'bg-amber-500' : 'bg-gray-600']">
                  {{ nonTransit.indexOf(activity) + 1 }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium text-white truncate">{{ activity.title }}</p>
                  <p class="text-[10px] text-gray-500 mt-0.5">{{ activity.timeBlock }}</p>
                  <div v-if="activity.groundingData?.rating" class="mt-1">
                    <span class="text-[10px] text-amber-400">⭐ {{ activity.groundingData.rating }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>
