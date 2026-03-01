<script setup lang="ts">
import type { ItineraryVersion } from '~/utils/schemas'

const props = defineProps<{
  versions: ItineraryVersion[]
  currentIndex: number
}>()

const emit = defineEmits<{
  'update:currentIndex': [index: number]
}>()

const currentVersion = computed(() => props.versions[props.currentIndex] ?? null)
const hasChangesSummary = computed(() => Boolean(currentVersion.value?.changesSummary))
const changesPaneCollapsed = ref(false)

watch(() => currentVersion.value?.id, () => {
  changesPaneCollapsed.value = false
})
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

      <div v-if="currentVersion" class="flex-1 min-h-0 p-4 flex flex-col gap-4">
        <div v-if="hasChangesSummary" class="flex-1 min-h-0 flex flex-col gap-4">
          <div class="flex-1 min-h-0 overflow-y-auto pr-1">
            <div class="pb-1">
              <ItineraryTimeline :days="currentVersion.days" />
            </div>
          </div>

          <aside class="shrink-0">
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
              <button
                class="w-full px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center justify-between"
                @click="changesPaneCollapsed = !changesPaneCollapsed"
              >
                <span>Changes from previous version</span>
                <UIcon
                  :name="changesPaneCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                  class="size-4 shrink-0"
                />
              </button>

              <div v-if="!changesPaneCollapsed" class="max-h-[35vh] overflow-y-auto p-3">
                <ItineraryChangesSummary
                  :changes="currentVersion.changesSummary!"
                  :hide-title="true"
                />
              </div>
            </div>
          </aside>
        </div>

        <div v-else class="flex-1 min-h-0 overflow-y-auto pr-1">
          <div class="pb-1">
            <ItineraryTimeline :days="currentVersion.days" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
