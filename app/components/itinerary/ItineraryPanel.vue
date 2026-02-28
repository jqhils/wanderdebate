<script setup lang="ts">
import type { ItineraryVersion } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = defineProps<{
  versions: ItineraryVersion[]
  currentIndex: number
}>()

const emit = defineEmits<{
  'update:currentIndex': [index: number]
}>()

const currentVersion = computed(() => props.versions[props.currentIndex] ?? null)
const showCommentary = ref(false)

// Swipe handling
const touchStartX = ref(0)
const touchEndX = ref(0)
const swiping = ref(false)
const swipeOffset = ref(0)

function onTouchStart(e: TouchEvent) {
  touchStartX.value = e.touches[0].clientX
  swiping.value = true
  swipeOffset.value = 0
}

function onTouchMove(e: TouchEvent) {
  if (!swiping.value) return
  touchEndX.value = e.touches[0].clientX
  swipeOffset.value = touchEndX.value - touchStartX.value
}

function onTouchEnd() {
  swiping.value = false
  const threshold = 80

  if (swipeOffset.value < -threshold && props.currentIndex < props.versions.length - 1) {
    emit('update:currentIndex', props.currentIndex + 1)
  } else if (swipeOffset.value > threshold && props.currentIndex > 0) {
    emit('update:currentIndex', props.currentIndex - 1)
  }

  swipeOffset.value = 0
}

// Mouse swipe for desktop
const mouseStartX = ref(0)
const mouseDown = ref(false)

function onMouseDown(e: MouseEvent) {
  mouseStartX.value = e.clientX
  mouseDown.value = true
  swipeOffset.value = 0
}

function onMouseMove(e: MouseEvent) {
  if (!mouseDown.value) return
  swipeOffset.value = e.clientX - mouseStartX.value
}

function onMouseUp() {
  if (!mouseDown.value) return
  mouseDown.value = false
  const threshold = 80

  if (swipeOffset.value < -threshold && props.currentIndex < props.versions.length - 1) {
    emit('update:currentIndex', props.currentIndex + 1)
  } else if (swipeOffset.value > threshold && props.currentIndex > 0) {
    emit('update:currentIndex', props.currentIndex - 1)
  }

  swipeOffset.value = 0
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
      <h2 class="text-lg font-semibold text-white">Itinerary</h2>
      <span v-if="versions.length > 0" class="text-[10px] text-gray-500">← swipe →</span>
    </div>

    <div v-if="versions.length === 0" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center">
        <UIcon name="i-lucide-loader-circle" class="size-10 text-gray-600 animate-spin mx-auto mb-3" />
        <p class="text-sm text-gray-500">Agents are thinking...</p>
      </div>
    </div>

    <template v-else>
      <ItineraryVersionSelector
        :versions="versions"
        :current-index="currentIndex"
        @select="emit('update:currentIndex', $event)"
      />

      <div
        v-if="currentVersion"
        class="flex-1 overflow-y-auto p-4 space-y-4 select-none"
        :style="{ transform: `translateX(${Math.max(-60, Math.min(60, swipeOffset))}px)`, transition: swiping || mouseDown ? 'none' : 'transform 0.2s ease-out' }"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
      >
        <!-- Collapsed agent reasoning -->
        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs bg-gray-800/50 border border-gray-700 hover:bg-gray-800 transition-colors"
          @click.stop="showCommentary = !showCommentary"
        >
          <div class="flex items-center gap-2">
            <ChatAgentAvatar :agent-id="currentVersion.agentId" size="sm" />
            <span :class="['font-semibold', getAgentConfig(currentVersion.agentId).textClass]">
              {{ getAgentConfig(currentVersion.agentId).label }}
            </span>
            <span class="text-gray-500">v{{ currentVersion.versionNumber }}</span>
          </div>
          <UIcon :name="showCommentary ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-4 text-gray-500" />
        </button>

        <div v-if="showCommentary" :class="['rounded-lg p-3 text-sm', getAgentConfig(currentVersion.agentId).bgClass]">
          <p class="text-gray-300 leading-relaxed text-xs">{{ currentVersion.commentary }}</p>
        </div>

        <!-- Timeline with photo cards -->
        <ItineraryTimeline :days="currentVersion.days" />

        <!-- Collapsible changes -->
        <details v-if="currentVersion.changesSummary" class="border border-gray-700 rounded-lg overflow-hidden">
          <summary class="px-3 py-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-300 bg-gray-800/50">
            Changes from previous version
          </summary>
          <div class="p-3">
            <ItineraryChangesSummary :changes="currentVersion.changesSummary" />
          </div>
        </details>

        <!-- Swipe hint at bottom -->
        <div class="text-center py-4">
          <p class="text-[10px] text-gray-600">
            <span v-if="currentIndex > 0">← v{{ versions[currentIndex - 1].versionNumber }}</span>
            <span v-if="currentIndex > 0 && currentIndex < versions.length - 1"> · </span>
            <span v-if="currentIndex < versions.length - 1">v{{ versions[currentIndex + 1].versionNumber }} →</span>
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
