import type { AgentId } from './schemas'

export interface AgentConfig {
  label: string
  shortLabel: string
  color: string
  bgClass: string
  textClass: string
  borderClass: string
  dotClass: string
  icon: string
}

const configs: Record<AgentId, AgentConfig> = {
  flaneur: {
    label: 'The Flaneur',
    shortLabel: 'Slow',
    color: 'emerald',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-400 dark:border-emerald-600',
    dotClass: 'bg-emerald-500',
    icon: 'i-lucide-footprints',
  },
  completionist: {
    label: 'The Completionist',
    shortLabel: 'Fast',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-400 dark:border-blue-600',
    dotClass: 'bg-blue-500',
    icon: 'i-lucide-list-checks',
  },
  master: {
    label: 'The Arbitrator',
    shortLabel: 'Master',
    color: 'slate',
    bgClass: 'bg-slate-100 dark:bg-slate-800/50',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-400 dark:border-slate-600',
    dotClass: 'bg-slate-500',
    icon: 'i-lucide-scale',
  },
}

export function getAgentConfig(agentId: AgentId | 'user'): AgentConfig {
  if (agentId === 'user') {
    return {
      label: 'You',
      shortLabel: 'You',
      color: 'amber',
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      textClass: 'text-amber-700 dark:text-amber-300',
      borderClass: 'border-amber-400 dark:border-amber-600',
      dotClass: 'bg-amber-500',
      icon: 'i-lucide-user',
    }
  }
  return configs[agentId]
}
