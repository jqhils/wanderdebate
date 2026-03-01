/**
 * Google Places grounding utility.
 * Verifies itinerary activities against Google Places Text Search API
 * and auto-replaces hallucinated venues with real alternatives.
 */

export interface PlaceResult {
  name: string
  address: string
  rating: number | null
  totalRatings: number | null
  placeId: string
  location: { lat: number; lng: number }
  types: string[]
  openNow: boolean | null
  photoReference: string | null
}

export interface GroundingResult {
  activityId: string
  originalTitle: string
  verified: boolean
  /** Set when verified=true */
  place: PlaceResult | null
  /** Set when verified=false and a replacement was found */
  replacement: PlaceResult | null
  replacementTitle: string | null
}

export interface GroundingSummary {
  total: number
  verified: number
  replaced: number
  unresolved: number
  results: GroundingResult[]
}

/**
 * Search Google Places Text Search (New) for a query.
 * Returns the top result or null if nothing found.
 */
async function searchPlace(
  query: string,
  apiKey: string,
): Promise<PlaceResult | null> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.status !== 'OK' || !data.results?.length) {
    return null
  }

  const place = data.results[0]

  return {
    name: place.name,
    address: place.formatted_address ?? '',
    rating: place.rating ?? null,
    totalRatings: place.user_ratings_total ?? null,
    placeId: place.place_id,
    location: {
      lat: place.geometry?.location?.lat ?? 0,
      lng: place.geometry?.location?.lng ?? 0,
    },
    types: place.types ?? [],
    openNow: place.opening_hours?.open_now ?? null,
    photoReference: place.photos?.[0]?.photo_reference ?? null,
  }
}

/**
 * Check if a place result is a reasonable match for the activity.
 * Prevents matching "Senso-ji Temple" to a random convenience store.
 */
function isReasonableMatch(query: string, result: PlaceResult): boolean {
  const queryWords = query.toLowerCase().split(/\s+/)
  const resultName = result.name.toLowerCase()

  // At least one significant word from the query should appear in the result name
  const significantWords = queryWords.filter(w => w.length > 3)
  if (significantWords.length === 0) return true

  return significantWords.some(word => resultName.includes(word))
}

/**
 * Build a fallback search query from category and location.
 * e.g. "food near Shibuya" or "landmark near Asakusa"
 */
function buildFallbackQuery(
  category: string,
  location: string,
  destination: string,
): string {
  const categoryMap: Record<string, string> = {
    'food': 'restaurant',
    'landmark': 'tourist attraction',
    'culture': 'cultural attraction',
    'nature': 'park garden',
    'nightlife': 'bar nightlife',
    'transit': 'transit station',
    'free-roam': 'interesting place',
  }

  const searchCategory = categoryMap[category] ?? 'attraction'
  return `${searchCategory} near ${location}, ${destination}`
}

/**
 * Ground an entire itinerary against Google Places.
 * For each activity:
 *   1. Search by title + location + destination
 *   2. If found and reasonable match → verified
 *   3. If not found → search by category + neighborhood → auto-replace
 */
export async function groundItinerary(
  activities: Array<{
    id: string
    title: string
    location: string
    category: string
  }>,
  destination: string,
  apiKey: string,
): Promise<GroundingSummary> {
  const results: GroundingResult[] = []

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < activities.length; i += batchSize) {
    const batch = activities.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (activity): Promise<GroundingResult> => {
        // Step 1: Search for the specific place
        const query = `${activity.title}, ${activity.location}, ${destination}`
        const place = await searchPlace(query, apiKey)

        if (place && isReasonableMatch(activity.title, place)) {
          return {
            activityId: activity.id,
            originalTitle: activity.title,
            verified: true,
            place,
            replacement: null,
            replacementTitle: null,
          }
        }

        // Step 2: Not found or bad match — search for a replacement
        const fallbackQuery = buildFallbackQuery(
          activity.category,
          activity.location,
          destination,
        )
        const replacement = await searchPlace(fallbackQuery, apiKey)

        return {
          activityId: activity.id,
          originalTitle: activity.title,
          verified: false,
          place: null,
          replacement: replacement ?? null,
          replacementTitle: replacement?.name ?? null,
        }
      }),
    )

    results.push(...batchResults)

    // Small delay between batches to respect rate limits
    if (i + batchSize < activities.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  const verified = results.filter(r => r.verified).length
  const replaced = results.filter(r => !r.verified && r.replacement).length
  const unresolved = results.filter(r => !r.verified && !r.replacement).length

  return {
    total: results.length,
    verified,
    replaced,
    unresolved,
    results,
  }
}
