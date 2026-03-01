<script setup lang="ts">
import { useDebateStore } from '~/stores/debate'
import { useOrchestrator } from '~/composables/useOrchestrator'
import { useSession } from '~/composables/useSession'

definePageMeta({
  layout: false,
})

const route = useRoute()
const store = useDebateStore()
const user = useSupabaseUser()
const { startDebate, continueDebate } = useOrchestrator()
const { loadSession, subscribeToRealtime, unsubscribeFromRealtime, sendUserMessage, loading, error } = useSession()
const toast = useToast()

// Mobile tab state — defaults to Itinerary per CLAUDE.md
const activeTab = ref<'itinerary' | 'chat'>('itinerary')

const sessionId = computed(() => route.params.id as string)

// Load session data and subscribe to Realtime on mount
onMounted(async () => {
  if (!user.value) {
    await navigateTo('/')
    return
  }

  store.reset()

  // Load existing session data from Supabase
  await loadSession(sessionId.value)

  if (error.value) {
    toast.add({
      title: 'Failed to load session',
      description: error.value,
      color: 'error',
    })
    return
  }

  // Subscribe to Realtime updates
  subscribeToRealtime(sessionId.value)

  // Start the debate if the session was just created (no versions yet)
  if (store.versions.length === 0 && store.session?.status === 'debating') {
    startDebate()
  }
})

onUnmounted(() => {
  unsubscribeFromRealtime()
  store.reset()
})

function handleSend(content: string) {
  if (!sessionId.value) return
  sendUserMessage(sessionId.value, content)
}

function handleContinueDebate() {
  continueDebate()
}

function handleSelectVersionFromMessage(versionId: string) {
  const index = store.versions.findIndex(version => version.id === versionId)
  if (index < 0) return
  store.setCurrentVersion(index)
  activeTab.value = 'itinerary'
}

const statusColor = computed((): 'neutral' | 'warning' | 'info' | 'success' => {
  if (!store.session) return 'neutral'
  const map: Record<string, 'neutral' | 'warning' | 'info' | 'success'> = {
    setup: 'neutral',
    debating: 'warning',
    paused: 'info',
    complete: 'success',
  }
  return map[store.session.status] ?? 'neutral'
})
</script>

<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-900">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <UIcon name="i-lucide-arrow-left" class="size-5" />
        </NuxtLink>
        <div v-if="store.session">
          <h1 class="font-semibold text-sm leading-tight">{{ store.session.destination }}</h1>
          <p class="text-xs text-gray-500">{{ store.session.durationHours }}h trip</p>
        </div>
        <div v-else>
          <h1 class="font-semibold text-sm leading-tight">
            {{ loading ? 'Loading...' : 'Setting up...' }}
          </h1>
        </div>
      </div>
      <UBadge v-if="store.session" :color="statusColor" variant="subtle" size="sm">
        {{ store.session.status }}
      </UBadge>
    </header>

    <!-- Loading state -->
    <div v-if="loading && !store.session" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-loader-circle" class="size-10 text-amber-500 animate-spin mx-auto mb-3" />
        <p class="text-sm text-gray-500">Loading session...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error && !store.session" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center max-w-sm">
        <UIcon name="i-lucide-alert-triangle" class="size-10 text-red-500 mx-auto mb-3" />
        <p class="text-sm text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
        <UButton to="/" variant="outline" icon="i-lucide-arrow-left">
          Back to Setup
        </UButton>
      </div>
    </div>

    <!-- Session loaded -->
    <template v-else>
      <!-- Mobile tabs (< lg) -->
      <div class="lg:hidden flex border-b border-gray-200 dark:border-gray-700 shrink-0">
        <button
          :class="[
            'flex-1 py-2.5 text-sm font-medium text-center transition-colors',
            activeTab === 'chat'
              ? 'text-amber-600 border-b-2 border-amber-500'
              : 'text-gray-500 hover:text-gray-700',
          ]"
          @click="activeTab = 'chat'"
        >
          <UIcon name="i-lucide-message-circle" class="size-4 inline mr-1" />
          Chat
        </button>
        <button
          :class="[
            'flex-1 py-2.5 text-sm font-medium text-center transition-colors',
            activeTab === 'itinerary'
              ? 'text-amber-600 border-b-2 border-amber-500'
              : 'text-gray-500 hover:text-gray-700',
          ]"
          @click="activeTab = 'itinerary'"
        >
          <UIcon name="i-lucide-map" class="size-4 inline mr-1" />
          Itinerary
        </button>
      </div>

      <!-- Main content -->
      <div class="flex-1 flex overflow-hidden min-h-0">
        <!-- Chat panel -->
        <div
          :class="[
            'lg:w-1/2 lg:border-r lg:border-gray-200 lg:dark:border-gray-700',
            activeTab === 'chat' ? 'flex-1 lg:flex-none' : 'hidden lg:block',
          ]"
        >
          <ChatPanel
            :messages="store.messagesForDisplay"
            :is-debating="store.isDebating"
            :selected-version-id="store.currentVersion?.id ?? null"
            @send="handleSend"
            @continue-debate="handleContinueDebate"
            @select-version="handleSelectVersionFromMessage"
          />
        </div>

        <!-- Itinerary panel -->
        <div
          :class="[
            'lg:w-1/2',
            activeTab === 'itinerary' ? 'flex-1 lg:flex-none' : 'hidden lg:block',
          ]"
        >
          <ItineraryPanel
            :versions="store.versions"
            :current-index="store.currentVersionIndex"
            @update:current-index="store.setCurrentVersion($event)"
          />
        </div>
      </div>
    </template>
  </div>
</template>
