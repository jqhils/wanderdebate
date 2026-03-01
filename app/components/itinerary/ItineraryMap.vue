<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'

const props = defineProps<{
  versions: any[]
  currentIndex: number
}>()

const emit = defineEmits<{
  'fly-to': [activityId: string]
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
let markersLayer: any = null
let routeLayer: any = null
let L: any = null

const currentVersion = computed(() => props.versions[props.currentIndex])

const categoryEmoji: Record<string, string> = {
  landmark: '🏛️', food: '🍜', culture: '🎌', nature: '🌿',
  nightlife: '🌙', transit: '🚃', 'free-roam': '🚶',
}

function getPhotoUrl(activity: any): string | null {
  const photoRef = activity.groundingData?.photoReference
  if (!photoRef || !photoRef.startsWith('places/')) return null
  const config = useRuntimeConfig()
  const key = config.public?.googlePlacesApiKey || ''
  return `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=1600&key=${key}`
}

async function initMap() {
  if (!mapContainer.value || map) return
  L = await import('leaflet')

  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })

  map = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: false,
  }).setView([35.6762, 139.6503], 12)

  // Stadia Alidade Smooth Dark — much prettier than CARTO
  L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
  }).addTo(map)

  // Minimal attribution bottom-right
  L.control.attribution({ position: 'bottomright', prefix: false })
    .addAttribution('© <a href="https://stadiamaps.com/">Stadia</a> · © <a href="https://openmaptiles.org/">OpenMapTiles</a>')
    .addTo(map)

  L.control.zoom({ position: 'topright' }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  routeLayer = L.layerGroup().addTo(map)
  renderMarkers()
}

function renderMarkers() {
  if (!map || !markersLayer || !routeLayer || !L) return

  markersLayer.clearLayers()
  routeLayer.clearLayers()

  const version = currentVersion.value
  if (!version?.days?.length) return

  const allPoints: [number, number][] = []
  let activityIndex = 0
  const dayColors = ['#4ECDC4', '#4ECDC4', '#4ECDC4', '#4ECDC4'] // orange, purple, cyan, pink per day

  for (const day of version.days) {
    const dayColor = dayColors[(day.dayNumber - 1) % dayColors.length]
    const dayActivities = day.activities ?? []
    const dayPoints: [number, number][] = []

    for (const activity of dayActivities) {
      const coords = activity.coordinates
      if (!coords?.lat || !coords?.lng) continue
      const latLng: [number, number] = [coords.lat, coords.lng]

      if (activity.category === 'transit') {
        // Transit: small pulsing blue dot
        const transitIcon = L.divIcon({
          html: `
            <div style="position:relative;">
              <div style="position:absolute;inset:-4px;background:rgba(59,130,246,0.15);border-radius:50%;animation:pulse-ring 2s infinite;"></div>
              <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid rgba(255,255,255,0.6);box-shadow:0 2px 12px rgba(59,130,246,0.5);">🚃</div>
            </div>`,
          className: '', iconSize: [24, 24], iconAnchor: [12, 12],
        })

        const costMatch = (activity.agentLogic ?? '').match(/[¥￥][\d,]+/)
        const cost = costMatch?.[0] ?? ''
        const popup = `
          <div style="max-width:240px;padding:4px 0;">
            <div style="font-size:11px;font-weight:600;color:#60a5fa;margin-bottom:2px;">🚃 ${activity.title}</div>
            <div style="font-size:10px;color:#9ca3af;">${activity.timeBlock}</div>
            ${cost ? `<div style="font-size:11px;color:#60a5fa;margin-top:4px;font-weight:500;">${cost}</div>` : ''}
            ${activity.description ? `<div style="font-size:10px;color:#6b7280;margin-top:4px;">${activity.description.slice(0, 100)}</div>` : ''}
          </div>`

        L.marker(latLng, { icon: transitIcon }).bindPopup(popup).addTo(markersLayer)

        // Dashed line to transit
        if (dayPoints.length > 0) {
          L.polyline([dayPoints[dayPoints.length - 1], latLng], {
            color: dayColor, weight: 2, opacity: 0.3, dashArray: '4, 8',
          }).addTo(routeLayer)
        }
        dayPoints.push(latLng)
        allPoints.push(latLng)
        continue
      }

      activityIndex++
      const isVerified = activity.groundingStatus === 'verified'
      const isReplaced = activity.groundingStatus === 'replaced'

      // Gradient marker with category emoji
      const emoji = categoryEmoji[activity.category] ?? '📍'
      const gradients: Record<string, string> = {
        verified: 'linear-gradient(135deg,#16a34a,#15803d)',
        replaced: 'linear-gradient(135deg,#f59e0b,#d97706)',
        unverified: 'linear-gradient(135deg,#6b7280,#4b5563)',
      }
      const gradient = gradients[activity.groundingStatus ?? 'unverified']
      const glowColor = isVerified ? 'rgba(22,163,74,0.4)' : isReplaced ? 'rgba(245,158,11,0.4)' : 'rgba(107,114,128,0.3)'

      const icon = L.divIcon({
        html: `
          <div style="position:relative;cursor:pointer;" title="${activity.title}">
            <div style="position:absolute;inset:-3px;background:${glowColor};border-radius:50%;filter:blur(4px);"></div>
            <div style="position:relative;background:${gradient};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 3px 12px ${glowColor},0 1px 3px rgba(0,0,0,0.4);">
              ${activityIndex}
            </div>
            <div style="position:absolute;top:-8px;right:-8px;font-size:14px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">${emoji}</div>
          </div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 18],
      })

      // Rich popup with photo
      const rating = activity.groundingData?.rating
      const totalRatings = activity.groundingData?.totalRatings
      const status = isVerified ? '<span style="color:#22c55e;">✅ Verified</span>' : isReplaced ? '<span style="color:#f59e0b;">🔄 Replaced</span>' : '<span style="color:#6b7280;">❓ Unverified</span>'
      const photo = getPhotoUrl(activity)
      const costMatch = (activity.agentLogic ?? '').match(/[¥￥][\d,]+/)
      const cost = costMatch?.[0] ?? ''

      const popup = `
        <div style="max-width:260px;">
          ${photo ? `<img src="${photo}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:10px;" onerror="this.style.display='none'" />` : ''}
          <div style="padding:8px 10px 6px;">
            <div style="font-size:14px;font-weight:600;color:#f3f4f6;margin-bottom:4px;padding-right:34px;">${activityIndex}. ${activity.title}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
              <span style="font-size:10px;color:#9ca3af;font-family:monospace;">${activity.timeBlock}</span>
              ${rating ? `<span style="font-size:11px;color:#fbbf24;">⭐ ${rating}${totalRatings ? ` <span style="color:#6b7280;">(${totalRatings.toLocaleString()})</span>` : ''}</span>` : ''}
            </div>
            <div style="font-size:11px;margin-bottom:6px;">${status}${cost ? ` · <span style="color:#a78bfa;">${cost}</span>` : ''}</div>
            <div style="font-size:11px;color:#9ca3af;display:flex;align-items:center;gap:4px;">
              <span>📍</span> ${activity.location}
            </div>
            ${activity.description ? `<div style="font-size:10px;color:#6b7280;margin-top:6px;line-height:1.4;">${activity.description.slice(0, 120)}${activity.description.length > 120 ? '...' : ''}</div>` : ''}
          </div>
        </div>`

      const marker = L.marker(latLng, { icon }).bindPopup(popup, { maxWidth: 280, className: 'rich-popup' }).addTo(markersLayer)

      // Click marker = fly to it
      marker.on('click', () => {
        map.flyTo(latLng, 16, { duration: 1.2 })
      })

      // Route line between activities (solid, day-colored)
      if (dayPoints.length > 0) {
        L.polyline([dayPoints[dayPoints.length - 1], latLng], {
          color: dayColor, weight: 3, opacity: 0.6,
        }).addTo(routeLayer)
      }
      dayPoints.push(latLng)
      allPoints.push(latLng)
    }

    // Add day label at first activity
    if (dayPoints.length > 0) {
      const dayLabel = L.divIcon({
        html: `<div style="background:${dayColor};color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);">Day ${day.dayNumber}${day.theme ? ': ' + day.theme.slice(0, 20) : ''}</div>`,
        className: '', iconAnchor: [-10, 15],
      })
      L.marker(dayPoints[0], { icon: dayLabel, interactive: false }).addTo(markersLayer)
    }
  }

  if (allPoints.length > 0) {
    map.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60], maxZoom: 15 })
  }
}

// Expose flyTo for sidebar integration
function flyToActivity(lat: number, lng: number) {
  if (map) map.flyTo([lat, lng], 17, { duration: 1.5 })
}

defineExpose({ flyToActivity })

onMounted(async () => { await nextTick(); initMap() })
watch(() => props.currentIndex, () => renderMarkers())
watch(() => props.versions.length, () => renderMarkers())
onUnmounted(() => { if (map) { map.remove(); map = null } })
</script>

<template>
  <div ref="mapContainer" class="h-full w-full" />
</template>

<style>
@import 'leaflet/dist/leaflet.css';

.leaflet-popup-content-wrapper {
  background: #111827 !important;
  color: #e5e7eb !important;
  border-radius: 14px !important;
  border: 1px solid #1f2937 !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.leaflet-popup-content {
  margin: 8px 12px !important;
}
.leaflet-popup-tip {
  background: #111827 !important;
  border: 1px solid #1f2937 !important;
}
.leaflet-popup-close-button {
  color: #6b7280 !important;
  font-size: 18px !important;
  top: 4px !important;
  right: 8px !important;
  z-index: 10 !important;
}
.leaflet-popup-close-button:hover {
  color: #f3f4f6 !important;
}
/* Rich photo popup gets tighter but still padded content area */
.rich-popup .leaflet-popup-content {
  margin: 10px !important;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
}
</style>
