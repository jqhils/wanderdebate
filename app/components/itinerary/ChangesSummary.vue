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
  <div class="rounded-xl border border-[var(--wd-border)] bg-[var(--wd-surface-raised)] p-4">
    <h4 v-if="!props.hideTitle" class="text-xs font-semibold uppercase tracking-wider text-[var(--wd-ink-3)] mb-3">
      Changes from previous version
    </h4>

    <div v-if="props.changes.dropped.length" class="mb-3">
      <div class="flex items-center gap-1.5 mb-1.5">
        <UIcon name="i-lucide-minus-circle" class="size-3.5 text-red-500" />
        <span class="text-xs font-medium text-red-400">Dropped</span>
      </div>
      <ul class="space-y-1">
        <li
          v-for="item in props.changes.dropped"
          :key="`dropped-${item.title}`"
          class="text-xs text-[var(--wd-ink-3)] line-through pl-5"
        >
          <span class="font-mono text-[var(--wd-ink-3)]">{{ item.timeBlock }}</span>
          {{ item.title }}
        </li>
      </ul>
    </div>

    <div v-if="props.changes.added.length">
      <div class="flex items-center gap-1.5 mb-1.5">
        <UIcon name="i-lucide-plus-circle" class="size-3.5 text-green-500" />
        <span class="text-xs font-medium text-green-400">Added</span>
      </div>
      <ul class="space-y-1">
        <li
          v-for="item in props.changes.added"
          :key="`added-${item.title}`"
          class="text-xs pl-5 flex items-center gap-1.5"
        >
          <div :class="['size-1.5 rounded-full shrink-0', getAgentConfig(item.agentOrigin).dotClass]" />
          <span class="font-mono text-[var(--wd-ink-3)]">{{ item.timeBlock }}</span>
          <span class="text-green-300 font-medium">{{ item.title }}</span>
        </li>
      </ul>
    </div>

    <p
      v-if="!props.changes.dropped.length && !props.changes.added.length"
      class="text-xs text-[var(--wd-ink-3)] italic"
    >
      No changes from previous version.
    </p>
  </div>
</template>
