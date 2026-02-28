<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { ItineraryVersion } from '~/utils/schemas'

const props = defineProps<{
  versions: ItineraryVersion[]
  currentIndex: number
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
let markersLayer: any = null
let routeLayer: any = null

const currentVersion = computed(() => props.versions[props.currentIndex])

async function initMap() {
  if (!mapContainer.value || map) return

  const L = await import('leaflet')

  // Fix default icon paths
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })

  map = L.map(mapContainer.value).setView([35.6762, 139.6503], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  routeLayer = L.layerGroup().addTo(map)

  renderMarkers()
}

function renderMarkers() {
  if (!map || !markersLayer || !routeLayer) return

  import('leaflet').then((L) => {
    markersLayer.clearLayers()
    routeLayer.clearLayers()

    const version = currentVersion.value
    if (!version?.days?.length) return

    const points: [number, number][] = []
    let activityIndex = 0

    for (const day of version.days) {
      if (!day.activities) continue

      for (const activity of day.activities) {
        const coords = activity.coordinates
        if (!coords?.lat || !coords?.lng) continue
        if (activity.category === 'transit') continue

        activityIndex++
        const latLng: [number, number] = [coords.lat, coords.lng]
        points.push(latLng)

        // Numbered icon
        const isVerified = activity.groundingStatus === 'verified'
        const isReplaced = activity.groundingStatus === 'replaced'
        const color = isVerified ? '#16a34a' : isReplaced ? '#f59e0b' : '#6b7280'

        const icon = L.divIcon({
          html: `<div style="
            background: ${color};
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">${activityIndex}</div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const rating = activity.groundingData?.rating
        const status = isVerified ? '✅ Verified' : isReplaced ? '🔄 Replaced' : '❓ Unverified'

        const popup = `
          <div style="max-width: 220px;">
            <strong style="font-size: 13px;">${activityIndex}. ${activity.title}</strong>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">${activity.timeBlock}</div>
            <div style="font-size: 11px; margin-top: 4px;">${status}${rating ? ` · ⭐ ${rating}` : ''}</div>
            <div style="font-size: 11px; color: #888; margin-top: 4px;">${activity.location}</div>
          </div>
        `

        L.marker(latLng, { icon }).bindPopup(popup).addTo(markersLayer)
      }
    }

    // Draw route line
    if (points.length > 1) {
      L.polyline(points, {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 8',
      }).addTo(routeLayer)
    }

    // Fit bounds
    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  })
}

onMounted(async () => {
  await nextTick()
  initMap()
})

watch(() => props.currentIndex, () => {
  renderMarkers()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Legend -->
    <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs shrink-0">
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-full bg-green-600 inline-block" /> Verified
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Replaced
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Unverified
      </span>
      <span v-if="currentVersion" class="ml-auto text-gray-500">
        v{{ currentVersion.versionNumber }}
      </span>
    </div>
    <!-- Map -->
    <div ref="mapContainer" class="flex-1" />
  </div>
</template>

<style>
@import 'leaflet/dist/leaflet.css';
</style>
