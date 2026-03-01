<script setup lang="ts">
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
</script>

<template>
  <div class="flex gap-2 p-3 border-t border-[var(--wd-border)]">
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
</template>
