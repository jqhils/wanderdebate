import type { AgentId, DayPlan } from '../../app/utils/schemas'
import {
  COMPLETIONIST_SYSTEM_PROMPT,
  CRITIQUE_PROMPT_SUFFIX,
  FLANEUR_SYSTEM_PROMPT,
  MASTER_MERGE_PROMPT,
} from '../../app/utils/prompts'
import type { useServerSupabase } from './supabase'

type TurnType = 'propose' | 'merge' | 'critique'

type VersionPayload = {
  agentId: AgentId
  versionNumber: number
  commentary: string
  days: DayPlan[]
}

const OUTPUT_CONTRACT = `Respond with ONLY one \`\`\`json code block that matches this shape exactly:
{
  "commentary": "string — summarize your changes using the KEPT/CHANGED/DROPPED/ADDED structure when critiquing",
  "days": [
    {
      "dayNumber": 1,
      "theme": "REQUIRED: a short evocative theme for this day",
      "activities": [
        {
          "id": "optional string UUID",
          "timeBlock": "HH:MM - HH:MM format",
          "title": "string — must be a real place name or a generic description if unsure",
          "description": "string — practical visitor tips, not generic filler",
          "location": "string — neighborhood or specific address",
          "coordinates": { "lat": 0, "lng": 0 },
          "durationMinutes": 60,
          "category": "landmark|food|culture|nature|nightlife|transit|free-roam",
          "agentOrigin": "flaneur|completionist|master",
          "agentLogic": "REQUIRED: why this activity, why this time, why this location"
        }
      ]
    }
  ]
}
Do not include any text before or after the JSON code block.`

function formatConstraints(userConstraints: string[]): string {
  if (userConstraints.length === 0) {
    return 'No explicit user constraints have been provided yet.'
  }

  return userConstraints
    .map((constraint, index) => `${index + 1}. ${constraint}`)
    .join('\n')
}

export function getSystemPrompt(agentId: AgentId, turnType: TurnType): string {
  if (turnType === 'merge' || agentId === 'master') {
    return MASTER_MERGE_PROMPT
  }

  if (agentId === 'flaneur') {
    return FLANEUR_SYSTEM_PROMPT
  }

  return COMPLETIONIST_SYSTEM_PROMPT
}

export function buildProposePrompt(
  destination: string,
  durationHours: number,
  numDays: number,
  agentId: Extract<AgentId, 'flaneur' | 'completionist'>,
  userConstraints: string[],
): string {
  return [
    `Turn type: proposal (${agentId}).`,
    `Create a full itinerary proposal for ${destination}.`,
    `Trip duration: ${durationHours} hours (${numDays} day${numDays === 1 ? '' : 's'}).`,
    'Plan all days with coherent pacing and realistic transitions.',
    'IMPORTANT: Each day MUST have a theme. Only recommend real, verifiable places.',
    'User constraints:',
    formatConstraints(userConstraints),
    OUTPUT_CONTRACT,
  ].join('\n\n')
}

export function buildMergePrompt(
  flaneurVersion: VersionPayload,
  completionistVersion: VersionPayload,
  destination: string,
  durationHours: number,
  userConstraints: string[],
): string {
  return [
    'Turn type: merge.',
    `Merge two itinerary proposals for ${destination}.`,
    `Trip duration: ${durationHours} hours.`,
    'IMPORTANT: Maintain geographic coherence per half-day. Do not zigzag across the city.',
    'User constraints:',
    formatConstraints(userConstraints),
    'Flaneur proposal (JSON):',
    `\`\`\`json\n${JSON.stringify(flaneurVersion, null, 2)}\n\`\`\``,
    'Completionist proposal (JSON):',
    `\`\`\`json\n${JSON.stringify(completionistVersion, null, 2)}\n\`\`\``,
    OUTPUT_CONTRACT,
  ].join('\n\n')
}

export function buildCritiquePrompt(
  currentVersion: VersionPayload,
  agentId: Extract<AgentId, 'flaneur' | 'completionist'>,
  destination: string,
  durationHours: number,
  userConstraints: string[],
): string {
  const agentLabel = agentId === 'flaneur' ? 'The Flâneur' : 'The Completionist'
  const otherAgent = agentId === 'flaneur' ? 'The Completionist' : 'The Flâneur'

  return [
    `Turn type: critique (${agentId}).`,
    `You are ${agentLabel}. Critique and improve the current itinerary for ${destination}.`,
    `Trip duration: ${durationHours} hours.`,
    '',
    `MANDATORY: You must change at least 3 activities to justify your critique. Do not approve the itinerary as-is.`,
    `Preserve ${otherAgent}'s activities where they genuinely serve the trip, but push for your philosophy where it matters.`,
    '',
    'Structure your commentary using: KEPT / CHANGED / DROPPED / ADDED sections.',
    '',
    'User constraints:',
    formatConstraints(userConstraints),
    'Current itinerary (JSON):',
    `\`\`\`json\n${JSON.stringify(currentVersion, null, 2)}\n\`\`\``,
    OUTPUT_CONTRACT,
  ].join('\n\n')
}

export function getCritiqueSystemPrompt(agentId: Extract<AgentId, 'flaneur' | 'completionist'>): string {
  return `${getSystemPrompt(agentId, 'critique')}\n\n${CRITIQUE_PROMPT_SUFFIX}`
}

export async function fetchUserConstraints(
  supabaseClient: ReturnType<typeof useServerSupabase>,
  sessionId: string,
): Promise<string[]> {
  const { data, error } = await supabaseClient
    .from('chat_messages')
    .select('content')
    .eq('session_id', sessionId)
    .eq('role', 'user-input')
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to load user constraints: ${error.message}`,
    })
  }

  return (data ?? [])
    .map(row => String(row.content ?? '').trim())
    .filter(Boolean)
}
