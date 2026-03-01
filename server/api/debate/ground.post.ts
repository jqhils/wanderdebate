import { z } from 'zod'
import { useServerSupabase, rowToVersion } from '../../utils/supabase'
import { groundItinerary } from '../../utils/places'

// DayPlan type inlined to avoid cross-boundary import
type DayPlan = { theme: string; activities: any[] }

const GroundBody = z.object({
  sessionId: z.string().uuid(),
  versionNumber: z.number().int().nonnegative(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, GroundBody.parse)
  const client = useServerSupabase(event)
  const config = useRuntimeConfig()

  const apiKey = config.googlePlacesApiKey
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'GOOGLE_PLACES_API_KEY is not configured. Set it in .env.',
    })
  }

  // Fetch session and the specified version
  const [sessionResult, versionResult] = await Promise.all([
    client
      .from('sessions')
      .select('destination')
      .eq('id', body.sessionId)
      .single(),
    client
      .from('itinerary_versions')
      .select('*')
      .eq('session_id', body.sessionId)
      .eq('version_number', body.versionNumber)
      .single(),
  ])

  if (sessionResult.error || !sessionResult.data) {
    throw createError({
      statusCode: 404,
      message: `Session not found: ${sessionResult.error?.message ?? 'unknown'}`,
    })
  }

  if (versionResult.error || !versionResult.data) {
    throw createError({
      statusCode: 404,
      message: `Version not found: ${versionResult.error?.message ?? 'unknown'}`,
    })
  }

  const destination = String(sessionResult.data.destination)
  const days = versionResult.data.days as DayPlan[]

  // Flatten all activities for grounding
  const activities = days.flatMap(day =>
    day.activities.map(a => ({
      id: a.id,
      title: a.title,
      location: a.location,
      category: a.category,
    })),
  )

  // Run grounding against Google Places
  const summary = await groundItinerary(activities, destination, apiKey)

  // Auto-heal: update activities with verified data or replacements
  const groundedDays: DayPlan[] = days.map(day => ({
    ...day,
    activities: day.activities.map((activity) => {
      const result = summary.results.find(r => r.activityId === activity.id)
      if (!result) return activity

      if (result.verified && result.place) {
        // Enrich with Google Places data
        return {
          ...activity,
          coordinates: result.place.location,
          groundingStatus: 'verified' as const,
          groundingData: {
            rating: result.place.rating,
            totalRatings: result.place.totalRatings,
            address: result.place.address,
            placeId: result.place.placeId,
            photoReference: result.place.photoReference,
            websiteUri: result.place.websiteUri,
          },
        }
      }

      if (!result.verified && result.replacement) {
        // Auto-replace hallucinated venue
        return {
          ...activity,
          title: result.replacement.name,
          location: result.replacement.address,
          coordinates: result.replacement.location,
          description: `${activity.description} (Auto-corrected: "${result.originalTitle}" was not found. Replaced with nearby verified alternative.)`,
          agentLogic: `${activity.agentLogic} [GROUNDED: Original "${result.originalTitle}" not found on Google Places. Replaced with "${result.replacement.name}" (${result.replacement.rating ?? 'no'} stars, ${result.replacement.address}).])`,
          groundingStatus: 'replaced' as const,
          groundingData: {
            originalTitle: result.originalTitle,
            rating: result.replacement.rating,
            totalRatings: result.replacement.totalRatings,
            address: result.replacement.address,
            placeId: result.replacement.placeId,
            photoReference: result.replacement.photoReference,
            websiteUri: result.replacement.websiteUri,
          },
        }
      }

      // Unresolved — couldn't find or replace
      return {
        ...activity,
        groundingStatus: 'unresolved' as const,
        groundingData: null,
      }
    }),
  }))

  // Save as a new grounded version
  const newVersionNumber = body.versionNumber + 1

  const { data: versionRow, error: versionError } = await client
    .from('itinerary_versions')
    .insert({
      session_id: body.sessionId,
      version_number: newVersionNumber,
      agent_id: 'master',
      commentary: `Grounding complete: ${summary.verified}/${summary.total} verified, ${summary.replaced} auto-replaced, ${summary.unresolved} unresolved.`,
      days: groundedDays,
      changes_summary: {
        dropped: [],
        added: [],
        grounding: {
          verified: summary.verified,
          replaced: summary.replaced,
          unresolved: summary.unresolved,
          total: summary.total,
        },
      },
    })
    .select()
    .single()

  if (versionError || !versionRow) {
    throw createError({
      statusCode: 500,
      message: `Failed to save grounded version: ${versionError?.message ?? 'unknown'}`,
    })
  }

  // Also insert a system message
  await client
    .from('chat_messages')
    .insert({
      session_id: body.sessionId,
      agent_id: 'master',
      role: 'system',
      content: `🔍 Grounding complete: ${summary.verified}/${summary.total} locations verified on Google Places. ${summary.replaced} auto-replaced with nearby alternatives. ${summary.unresolved} could not be resolved.`,
      related_version_id: versionRow.id,
    })

  return {
    version: rowToVersion(versionRow),
    summary: {
      total: summary.total,
      verified: summary.verified,
      replaced: summary.replaced,
      unresolved: summary.unresolved,
      details: summary.results.map(r => ({
        activityId: r.activityId,
        originalTitle: r.originalTitle,
        verified: r.verified,
        replacedWith: r.replacementTitle,
        rating: r.verified ? r.place?.rating : r.replacement?.rating,
      })),
    },
  }
})
