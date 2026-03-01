<script setup lang="ts">
const props = defineProps<{
  chips?: string[]
}>()

const emit = defineEmits<{
  send: [message: string]
}>()

const input = ref('')

function handleSend() {
  const trimmed = input.value.trim()
  if (!trimmed) return
  emit('send', trimmed)
  input.value = ''
}

function handleChip(chip: string) {
  emit('send', chip)
}
</script>

<template>
  <div class="border-t border-[var(--wd-border)] shrink-0">
    <!-- Chips row -->
    <div v-if="chips?.length" class="px-3 pt-3 pb-1 flex flex-wrap gap-1.5">
      <button
        v-for="chip in chips"
        :key="chip"
        class="px-2.5 py-1 text-xs rounded-full border border-[var(--wd-border)] text-[var(--wd-ink-3)] hover:text-[var(--wd-teal)] hover:border-[var(--wd-teal)]/50 transition-colors"
        @click="handleChip(chip)"
      >
        {{ chip }}
      </button>
    </div>
    <!-- Input row -->
    <div class="flex gap-2 p-3">
      <UInput
        v-model="input"
        placeholder="Influence the debate..."
        class="flex-1"
        @keydown.enter.prevent="handleSend"
      />
      <UButton
        icon="i-lucide-send"
        color="primary"
        :disabled="!input.trim()"
        @click="handleSend"
      >
        Send
      </UButton>
    </div>
  </div>
</template>