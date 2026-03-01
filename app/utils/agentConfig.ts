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
    bgClass: 'bg-emerald-900/25',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-700/50',
    dotClass: 'bg-emerald-500',
    icon: 'i-lucide-footprints',
  },
  completionist: {
    label: 'The Completionist',
    shortLabel: 'Fast',
    color: 'blue',
    bgClass: 'bg-blue-900/25',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-700/50',
    dotClass: 'bg-blue-500',
    icon: 'i-lucide-list-checks',
  },
  master: {
    label: 'The Arbitrator',
    shortLabel: 'Master',
    color: 'slate',
    bgClass: 'bg-slate-800/40',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-600/50',
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
      bgClass: 'bg-amber-900/25',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-700/50',
      dotClass: 'bg-amber-500',
      icon: 'i-lucide-user',
    }
  }
  return configs[agentId]
}
