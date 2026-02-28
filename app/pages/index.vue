<script setup lang="ts">
import type { Session } from '~/utils/schemas'
import { useSession } from '~/composables/useSession'

definePageMeta({
  layout: false,
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()
const { listSessions, loading, error } = useSession()

const email = ref('')
const password = ref('')
const authMode = ref<'signin' | 'signup'>('signin')
const authLoading = ref(false)
const sessions = ref<Session[]>([])
const hydrated = ref(false)

const sessionsLoading = computed(() =>
  hydrated.value ? loading.value : false,
)

function formatDate(input: string): string {
  return new Date(input).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function refreshSessions() {
  if (!user.value) {
    sessions.value = []
    return
  }

  const result = await listSessions()
  if (result) {
    sessions.value = result
    return
  }

  toast.add({
    title: 'Failed to load itineraries',
    description: error.value ?? 'Please retry in a moment.',
    color: 'error',
  })
}

async function handleAuth() {
  if (!email.value.trim() || !password.value.trim()) {
    toast.add({
      title: 'Email and password required',
      color: 'warning',
    })
    return
  }

  authLoading.value = true
  try {
    if (authMode.value === 'signup') {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
      })

      if (signUpError) {
        throw signUpError
      }

      toast.add({
        title: data.session ? 'Account created' : 'Check your email to confirm signup',
        color: 'success',
      })
    }
    else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
      })

      if (signInError) {
        throw signInError
      }

      toast.add({
        title: 'Signed in',
        color: 'success',
      })
    }

    await refreshSessions()
  }
  catch (err) {
    toast.add({
      title: authMode.value === 'signup' ? 'Sign up failed' : 'Sign in failed',
      description: err instanceof Error ? err.message : 'Authentication error',
      color: 'error',
    })
  }
  finally {
    authLoading.value = false
  }
}

async function handleSignOut() {
  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) {
    toast.add({
      title: 'Sign out failed',
      description: signOutError.message,
      color: 'error',
    })
    return
  }

  sessions.value = []
  toast.add({
    title: 'Signed out',
    color: 'info',
  })
}

onMounted(() => {
  hydrated.value = true
  void refreshSessions()
})

watch(() => user.value?.id, () => {
  if (!hydrated.value) return
  void refreshSessions()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 sm:p-6">
    <div class="max-w-6xl mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">WanderDebate</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Collaborative travel planning with adversarial agents
          </p>
        </div>
        <UButton
          v-if="user"
          variant="outline"
          icon="i-lucide-log-out"
          @click="handleSignOut"
        >
          Sign Out
        </UButton>
      </div>

      <div v-if="!user" class="max-w-md mx-auto pt-8">
        <UCard class="shadow-xl">
          <template #header>
            <div class="text-center space-y-1">
              <h2 class="text-xl font-semibold">
                {{ authMode === 'signup' ? 'Create Account' : 'Sign In' }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Sign in to save and revisit your itineraries
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <UInput
              v-model="email"
              type="email"
              icon="i-lucide-mail"
              placeholder="you@example.com"
            />
            <UInput
              v-model="password"
              type="password"
              icon="i-lucide-lock"
              placeholder="Password"
            />

            <UButton
              block
              :loading="authLoading"
              icon="i-lucide-user-check"
              @click="handleAuth"
            >
              {{ authMode === 'signup' ? 'Create Account' : 'Sign In' }}
            </UButton>

            <UButton
              block
              variant="ghost"
              @click="authMode = authMode === 'signup' ? 'signin' : 'signup'"
            >
              {{ authMode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up' }}
            </UButton>
          </div>
        </UCard>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SetupTripForm />

        <UCard class="shadow-xl">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Your Itineraries</h2>
              <UButton
                size="xs"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="sessionsLoading"
                @click="refreshSessions"
              >
                Refresh
              </UButton>
            </div>
          </template>

          <div v-if="sessions.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            No itineraries yet. Create your first one.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white/60 dark:bg-gray-900/40"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-medium truncate">{{ session.destination }}</p>
                  <p class="text-xs text-gray-500">
                    {{ session.durationHours }}h • {{ formatDate(session.createdAt) }}
                  </p>
                </div>
                <UBadge variant="subtle" :color="session.status === 'complete' ? 'success' : 'neutral'">
                  {{ session.status }}
                </UBadge>
              </div>
              <div class="mt-2">
                <UButton
                  :to="`/session/${session.id}`"
                  size="xs"
                  variant="soft"
                  icon="i-lucide-arrow-right"
                >
                  Open
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
