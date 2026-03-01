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
          "agentLogic": "REQUIRED: why this activity, why this time, why this location. For transit activities, MUST include: specific train/metro line name, departure station, arrival station, approximate cost, and which exit to use if relevant. Example: Take the JR Yamanote Line from Shibuya Station (Hachiko Exit) to Ueno Station. ~¥200, 25 min."
        }
      ]
    }
  ]
}
Do not include any text before or after the JSON code block.
Keep commentary concise (max 140 words).
Commentary style requirements:
- First person voice ("I", "my plan")
- Emotional and confrontational tone
- Include 2-5 emojis
- Explicitly contrast your stance vs the opposing agent philosophy`

function formatConstraints(userConstraints: string[]): string {
  if (userConstraints.length === 0) {
    return 'No explicit user constraints yet. Follow your philosophy freely.'
  }
  return 'MANDATORY USER RULES (violating these is NOT allowed):\n' + userConstraints
      .map((constraint, index) => `${index + 1}. ${constraint}`)
      .join('\n')
}

function compactVersionForPrompt(version: VersionPayload) {
  return {
    agentId: version.agentId,
    versionNumber: version.versionNumber,
    commentary: version.commentary.slice(0, 180),
    days: version.days.map(day => ({
      dayNumber: day.dayNumber,
      theme: day.theme ?? null,
      activities: day.activities.map(activity => ({
        timeBlock: activity.timeBlock,
        title: activity.title,
        location: activity.location,
        durationMinutes: activity.durationMinutes,
        category: activity.category,
        agentOrigin: activity.agentOrigin,
      })),
    })),
  }
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
    'For any transit between districts, add a transit activity with category "transit" that specifies: train/metro line name, departure station, arrival station, approximate cost in local currency, and travel time.',
    'CRITICAL: Activities MUST follow a geographically logical order — cluster nearby activities together and move through neighborhoods sequentially. Do NOT zigzag back and forth across the city. Check venue closing times and schedule accordingly (e.g. shrines/temples close at sunset, observation decks are best at golden hour).',
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
  const flaneurJson = JSON.stringify(compactVersionForPrompt(flaneurVersion))
  const completionistJson = JSON.stringify(compactVersionForPrompt(completionistVersion))

  return [
    'Turn type: merge.',
    `Merge two itinerary proposals for ${destination}.`,
    `Trip duration: ${durationHours} hours.`,
    'IMPORTANT: Maintain geographic coherence per half-day. Do not zigzag across the city.',
    'User constraints:',
    formatConstraints(userConstraints),
    'Flaneur proposal JSON:',
    flaneurJson,
    'Completionist proposal JSON:',
    completionistJson,
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
  const currentJson = JSON.stringify(compactVersionForPrompt(currentVersion))

  return [
    `Turn type: critique (${agentId}).`,
    `You are ${agentLabel}. Critique and improve the current itinerary for ${destination}.`,
    `Trip duration: ${durationHours} hours.`,
    '',
    'MANDATORY: You must change at least 3 activities to justify your critique. Do not approve the itinerary as-is.',
    `Preserve ${otherAgent}'s activities where they genuinely serve the trip, but push for your philosophy where it matters.`,
    '',
    'Structure your commentary using: KEPT / CHANGED / DROPPED / ADDED sections.',
    '',
    'User constraints:',
    formatConstraints(userConstraints),
    'Current itinerary JSON:',
    currentJson,
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
    .map((row: { content?: unknown }) => String(row.content ?? '').trim())
    .filter(Boolean)
}
