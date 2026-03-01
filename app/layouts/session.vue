<script setup lang="ts">
import { useDebateStore } from '~/stores/debate'
import { useSessionPage } from '~/composables/useSessionPage'

const store = useDebateStore()
const route = useRoute()
const { sessionId, loading, error, init, cleanup } = useSessionPage()

onMounted(() => init())
onUnmounted(() => cleanup())

const activePage = computed(() => {
  const path = route.path
  if (path.endsWith('/map')) return 'map'
  if (path.endsWith('/plan')) return 'plan'
  return 'debate'
})

const navItems = [
  { id: 'debate', icon: 'i-lucide-messages-square', label: 'Debate', suffix: '' },
  { id: 'plan', icon: 'i-lucide-clipboard-list', label: 'Plan', suffix: '/plan' },
  { id: 'map', icon: 'i-lucide-map', label: 'Map', suffix: '/map' },
]

const statusColor = computed((): 'neutral' | 'warning' | 'info' | 'success' => {
  if (!store.session) return 'neutral'
  const map: Record<string, 'neutral' | 'warning' | 'info' | 'success'> = {
    setup: 'neutral', debating: 'warning', paused: 'info', complete: 'success',
  }
  return map[store.session.status] ?? 'neutral'
})
</script>

<template>
  <div class="h-screen flex bg-gray-950">
    <!-- Sidebar (desktop) -->
    <aside class="hidden lg:flex w-16 flex-col items-center py-4 bg-gray-900 border-r border-gray-800 shrink-0">
      <NuxtLink to="/" class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 hover:bg-amber-500/20 transition-colors">
        <UIcon name="i-lucide-compass" class="size-5 text-amber-400" />
      </NuxtLink>
      <nav class="flex-1 flex flex-col items-center gap-1">
        <NuxtLink
          v-for="item in navItems" :key="item.id"
          :to="`/session/${sessionId}${item.suffix}`"
          :class="['w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all',
            activePage === item.id ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800']"
        >
          <UIcon :name="item.icon" class="size-5" />
          <span class="text-[9px] font-medium leading-none">{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <div v-if="store.session" class="mb-2">
        <div :class="['w-3 h-3 rounded-full', {
          'bg-gray-500': store.session.status === 'setup',
          'bg-amber-500 animate-pulse': store.session.status === 'debating',
          'bg-blue-500': store.session.status === 'paused',
          'bg-green-500': store.session.status === 'complete',
        }]" :title="store.session.status" />
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="flex items-center justify-between px-5 py-2.5 border-b border-gray-800 bg-gray-900/50 shrink-0">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="lg:hidden text-gray-500 hover:text-gray-300">
            <UIcon name="i-lucide-arrow-left" class="size-5" />
          </NuxtLink>
          <div v-if="store.session">
            <h1 class="font-semibold text-sm text-white leading-tight">{{ store.session.destination }}</h1>
            <p class="text-xs text-gray-500">{{ store.session.durationHours }}h itinerary</p>
          </div>
          <div v-else>
            <h1 class="font-semibold text-sm text-white">{{ loading ? 'Loading...' : 'Setting up...' }}</h1>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="store.versions.length > 0" class="flex items-center gap-1">
            <div v-for="(v, i) in store.versions" :key="v.id"
              :class="['w-2 h-2 rounded-full transition-all cursor-pointer',
                i === store.currentVersionIndex ? 'bg-amber-400 w-3 h-3' : 'bg-gray-600 hover:bg-gray-400']"
              @click="store.setCurrentVersion(i)" :title="`v${v.versionNumber}`" />
          </div>
          <UBadge v-if="store.session" :color="statusColor" variant="subtle" size="sm">{{ store.session.status }}</UBadge>
        </div>
      </header>

      <div v-if="loading && !store.session" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <UIcon name="i-lucide-loader-circle" class="size-10 text-amber-500 animate-spin mx-auto mb-3" />
          <p class="text-sm text-gray-500">Loading session...</p>
        </div>
      </div>
      <div v-else-if="error && !store.session" class="flex-1 flex items-center justify-center p-8">
        <div class="text-center max-w-sm">
          <UIcon name="i-lucide-alert-triangle" class="size-10 text-red-500 mx-auto mb-3" />
          <p class="text-sm text-red-400 mb-4">{{ error }}</p>
          <UButton to="/" variant="outline" icon="i-lucide-arrow-left">Back to Setup</UButton>
        </div>
      </div>
      <div v-else class="flex-1 overflow-hidden min-h-0">
        <slot />
      </div>
    </div>

    <!-- Mobile bottom nav -->
    <div class="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-50">
      <NuxtLink v-for="item in navItems" :key="item.id" :to="`/session/${sessionId}${item.suffix}`"
        :class="['flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors',
          activePage === item.id ? 'text-amber-400' : 'text-gray-500']">
        <UIcon :name="item.icon" class="size-5" />
        <span class="text-[10px] font-medium">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
