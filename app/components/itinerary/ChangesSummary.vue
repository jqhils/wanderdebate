<script setup lang="ts">
import type { ChangesSummary } from '~/utils/schemas'
import { getAgentConfig } from '~/utils/agentConfig'

const props = withDefaults(defineProps<{
  changes: ChangesSummary
  hideTitle?: boolean
}>(), {
  hideTitle: false,
})
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
    <h4 v-if="!props.hideTitle" class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
      Changes from previous version
    </h4>

    <div v-if="props.changes.dropped.length" class="mb-3">
      <div class="flex items-center gap-1.5 mb-1.5">
        <UIcon name="i-lucide-minus-circle" class="size-3.5 text-red-500" />
        <span class="text-xs font-medium text-red-600 dark:text-red-400">Dropped</span>
      </div>
      <ul class="space-y-1">
        <li
          v-for="item in props.changes.dropped"
          :key="`dropped-${item.title}`"
          class="text-xs text-gray-500 line-through pl-5"
        >
          <span class="font-mono text-gray-400">{{ item.timeBlock }}</span>
          {{ item.title }}
        </li>
      </ul>
    </div>

    <div v-if="props.changes.added.length">
      <div class="flex items-center gap-1.5 mb-1.5">
        <UIcon name="i-lucide-plus-circle" class="size-3.5 text-green-500" />
        <span class="text-xs font-medium text-green-600 dark:text-green-400">Added</span>
      </div>
      <ul class="space-y-1">
        <li
          v-for="item in props.changes.added"
          :key="`added-${item.title}`"
          class="text-xs pl-5 flex items-center gap-1.5"
        >
          <div :class="['size-1.5 rounded-full shrink-0', getAgentConfig(item.agentOrigin).dotClass]" />
          <span class="font-mono text-gray-400">{{ item.timeBlock }}</span>
          <span class="text-green-700 dark:text-green-300 font-medium">{{ item.title }}</span>
        </li>
      </ul>
    </div>

    <p
      v-if="!props.changes.dropped.length && !props.changes.added.length"
      class="text-xs text-gray-400 italic"
    >
      No changes from previous version.
    </p>
  </div>
</template>
