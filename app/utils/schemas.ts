import { z } from 'zod'

// --- Agent identity ---
export const AgentId = z.enum(['flaneur', 'completionist', 'master'])
export type AgentId = z.infer<typeof AgentId>

// --- LLM provider ---
export const LlmProvider = z.enum(['mistral', 'minimax'])
export type LlmProvider = z.infer<typeof LlmProvider>

// --- Single activity within a day ---
export const ActivitySchema = z.object({
  id: z.string().uuid(),
  timeBlock: z.string(), // e.g. "08:00–11:00"
  title: z.string(),
  description: z.string(),
  location: z.string(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  durationMinutes: z.number().int().positive(),
  category: z.enum([
    'landmark',
    'food',
    'culture',
    'nature',
    'nightlife',
    'transit',
    'free-roam',
  ]),
  agentOrigin: AgentId,
  agentLogic: z.string(),
  groundingStatus: z
    .enum(['verified', 'replaced', 'unresolved', 'unverified'])
    .optional(),
  groundingData: z
    .object({
      originalTitle: z.string().optional(),
      rating: z.number().optional(),
      totalRatings: z.number().int().nonnegative().optional(),
      address: z.string().optional(),
      placeId: z.string().optional(),
      photoReference: z.string().optional(),
      websiteUri: z.string().optional(),
    })
    .nullable()
    .optional(),
})
export type Activity = z.infer<typeof ActivitySchema>

// --- A single day's plan ---
export const DayPlanSchema = z.object({
  dayNumber: z.number().int().positive(),
  theme: z.string().optional(),
  activities: z.array(ActivitySchema),
})
export type DayPlan = z.infer<typeof DayPlanSchema>

// --- Changes diff between versions ---
export const ChangesSummarySchema = z.object({
  dropped: z.array(
    z.object({
      title: z.string(),
      timeBlock: z.string(),
    }),
  ),
  added: z.array(
    z.object({
      title: z.string(),
      timeBlock: z.string(),
      agentOrigin: AgentId,
    }),
  ),
})
export type ChangesSummary = z.infer<typeof ChangesSummarySchema>

// --- A complete itinerary snapshot (one version) ---
export const ItineraryVersionSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  versionNumber: z.number().int().nonnegative(),
  agentId: AgentId,
  commentary: z.string(),
  days: z.array(DayPlanSchema),
  changesSummary: z.union([ChangesSummarySchema, z.null()]),
  createdAt: z.string().datetime(),
})
export type ItineraryVersion = z.infer<typeof ItineraryVersionSchema>

// --- Chat message ---
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  agentId: z.union([AgentId, z.literal('user')]),
  role: z.enum(['proposal', 'critique', 'merge', 'system', 'user-input']),
  content: z.string(),
  relatedVersionId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
})
export type ChatMessage = z.infer<typeof ChatMessageSchema>

// --- Session ---
export const SessionSchema = z.object({
  id: z.string().uuid(),
  destination: z.string(),
  durationHours: z.number().positive(),
  agents: z.array(AgentId),
  llmProvider: LlmProvider,
  status: z.enum(['setup', 'debating', 'paused', 'complete']),
  createdAt: z.string().datetime(),
})
export type Session = z.infer<typeof SessionSchema>
