<script setup lang="ts">
import { useSession } from '~/composables/useSession'
import type { LlmProvider } from '~/utils/schemas'
import flaneurAvatar from '~/assets/images/agents/flaneur.png'
import completionistAvatar from '~/assets/images/agents/completionist.png'

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
const llmProvider = ref<LlmProvider>('mistral')

const llmOptions: Array<{
  value: LlmProvider
  label: string
}> = [
  {
    value: 'mistral',
    label: 'Mistral Large',
  },
  {
    value: 'minimax',
    label: 'MiniMax M2.5',
  },
]

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
    llmProvider: llmProvider.value,
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
  <div class="w-full">
    <UCard
      class="shadow-xl bg-slate-950/70 backdrop-blur-sm ring-1 ring-white/10"
      :ui="{
        header: 'p-6 border-b border-white/10',
        body: 'p-6',
        footer: 'p-6 border-t border-white/10',
      }"
    >
      <template #header>
        <div class="text-center">
          <UIcon name="i-lucide-compass" class="size-10 text-amber-500 mb-2" />
          <h1 class="text-2xl font-bold">Plan A Trip Worth Arguing Over</h1>
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
                'flex-1 rounded-xl border-2 p-3 text-center transition-all flex flex-col items-center justify-start',
                selectedAgents.flaneur
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
              ]"
              @click="selectedAgents.flaneur = !selectedAgents.flaneur"
            >
              <div class="h-24 w-24 mx-auto mb-2 flex items-end justify-center">
                <img
                  :src="flaneurAvatar"
                  alt="The Flaneur"
                  class="h-full w-full object-contain object-bottom drop-shadow-md"
                >
              </div>
              <div class="text-sm font-semibold min-h-[2.5rem] flex items-center justify-center leading-tight">
                The Flaneur
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">Immersive Wanderer</div>
            </button>
            <button
              :class="[
                'flex-1 rounded-xl border-2 p-3 text-center transition-all flex flex-col items-center justify-start',
                selectedAgents.completionist
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
              ]"
              @click="selectedAgents.completionist = !selectedAgents.completionist"
            >
              <div class="h-24 w-24 mx-auto mb-2 flex items-end justify-center">
                <img
                  :src="completionistAvatar"
                  alt="The Completionist"
                  class="h-full w-full object-contain object-bottom drop-shadow-md"
                >
              </div>
              <div class="text-sm font-semibold min-h-[2.5rem] flex items-center justify-center leading-tight">
                The Completionist
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">Efficiency Strategist</div>
            </button>
          </div>
        </div>

        <!-- LLM Provider -->
        <div>
          <label class="text-sm font-medium mb-1.5 block">Model</label>
          <div class="relative">
            <select
              v-model="llmProvider"
              class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option
                v-for="option in llmOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Mistral is selected by default.
          </p>
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
