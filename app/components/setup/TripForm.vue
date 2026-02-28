<script setup lang="ts">
import { useSession } from '~/composables/useSession'

const router = useRouter()
const { createSession, loading, error } = useSession()
const toast = useToast()

const destination = ref('')
const durationMode = ref<'preset' | 'custom'>('preset')
const presetHours = ref(48)
const customDays = ref(3)

const presets = [
  { label: '24H', value: 24 },
  { label: '48H', value: 48 },
  { label: '72H', value: 72 },
]

const selectedAgents = ref({
  flaneur: true,
  completionist: true,
})

const durationHours = computed(() =>
  durationMode.value === 'preset' ? presetHours.value : customDays.value * 24,
)

const canSubmit = computed(() =>
  destination.value.trim().length > 0 && !loading.value,
)

async function handlePlan() {
  if (!canSubmit.value) return

  const agents: string[] = []
  if (selectedAgents.value.flaneur) agents.push('flaneur')
  if (selectedAgents.value.completionist) agents.push('completionist')

  if (agents.length === 0) {
    toast.add({ title: 'Select at least one agent', color: 'error' })
    return
  }

  const session = await createSession({
    destination: destination.value.trim(),
    durationHours: durationHours.value,
    agents,
  })

  if (session) {
    router.push(`/session/${session.id}`)
  }
  else {
    toast.add({
      title: 'Failed to create session',
      description: error.value ?? 'Check your Supabase configuration',
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <UCard class="shadow-xl">
      <template #header>
        <div class="text-center">
          <UIcon name="i-lucide-compass" class="size-10 text-amber-500 mb-2" />
          <h1 class="text-2xl font-bold">Traveling Where?</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Let our AI agents debate your perfect itinerary
          </p>
        </div>
      </template>

      <div class="space-y-6">
        <!-- Destination -->
        <div>
          <label class="text-sm font-medium mb-1.5 block">Destination</label>
          <UInput
            v-model="destination"
            placeholder="Paris, Tokyo, New York..."
            icon="i-lucide-search"
            size="lg"
          />
        </div>

        <!-- Duration -->
        <div>
          <label class="text-sm font-medium mb-1.5 block">Duration</label>
          <div class="flex gap-2 mb-2">
            <UButton
              v-for="preset in presets"
              :key="preset.value"
              :variant="durationMode === 'preset' && presetHours === preset.value ? 'solid' : 'outline'"
              :color="durationMode === 'preset' && presetHours === preset.value ? 'primary' : 'neutral'"
              size="sm"
              @click="durationMode = 'preset'; presetHours = preset.value"
            >
              {{ preset.label }}
            </UButton>
            <UButton
              :variant="durationMode === 'custom' ? 'solid' : 'outline'"
              :color="durationMode === 'custom' ? 'primary' : 'neutral'"
              size="sm"
              @click="durationMode = 'custom'"
            >
              Custom
            </UButton>
          </div>
          <div v-if="durationMode === 'custom'" class="flex items-center gap-2">
            <UInput
              v-model.number="customDays"
              type="number"
              :min="1"
              :max="14"
              size="sm"
              class="w-20"
            />
            <span class="text-sm text-gray-500">days</span>
          </div>
        </div>

        <!-- Agent Selector -->
        <div>
          <label class="text-sm font-medium mb-1.5 block">Your Agents</label>
          <div class="flex gap-3">
            <button
              :class="[
                'flex-1 rounded-xl border-2 p-3 text-center transition-all',
                selectedAgents.flaneur
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
              ]"
              @click="selectedAgents.flaneur = !selectedAgents.flaneur"
            >
              <UIcon name="i-lucide-footprints" class="size-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
              <div class="text-sm font-semibold">Slow</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">The Flaneur</div>
            </button>
            <button
              :class="[
                'flex-1 rounded-xl border-2 p-3 text-center transition-all',
                selectedAgents.completionist
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
              ]"
              @click="selectedAgents.completionist = !selectedAgents.completionist"
            >
              <UIcon name="i-lucide-list-checks" class="size-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <div class="text-sm font-semibold">Fast</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">The Completionist</div>
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <UButton
          block
          size="lg"
          color="primary"
          icon="i-lucide-plane-takeoff"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handlePlan"
        >
          Plan My Trip
        </UButton>
      </template>
    </UCard>
  </div>
</template>
