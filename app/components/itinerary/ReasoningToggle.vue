<script setup lang="ts">
defineProps<{
  reasoning: string
}>()

const expanded = ref(false)
</script>

<template>
  <div>
    <button
      class="flex items-center gap-1 text-xs text-[var(--wd-amber)] hover:brightness-110 transition-colors"
      @click="expanded = !expanded"
    >
      <UIcon
        :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-lightbulb'"
        class="size-3.5"
      />
      <span>{{ expanded ? 'Hide reasoning' : 'Why this?' }}</span>
    </button>
    <div
      v-if="expanded"
      class="mt-2 p-2.5 rounded-lg bg-amber-900/20 border border-amber-800/40 text-xs text-amber-200 leading-relaxed"
    >
      {{ reasoning }}
    </div>
  </div>
</template>
