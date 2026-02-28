<script setup lang="ts">
defineProps<{
  reasoning: string
}>()

const expanded = ref(false)
</script>

<template>
  <div>
    <button
      class="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
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
      class="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 leading-relaxed"
    >
      {{ reasoning }}
    </div>
  </div>
</template>
