<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'

const props = defineProps<{
  versions: any[]
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

  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })

  map = L.map(mapContainer.value, { zoomControl: false }).setView([35.6762, 139.6503], 12)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap · © CARTO',
    maxZoom: 19,
  }).addTo(map)

  L.control.zoom({ position: 'topright' }).addTo(map)

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

    const allPoints: [number, number][] = []
    let activityIndex = 0
    const activities = version.days.flatMap((d: any) => d.activities ?? [])

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i]
      const coords = activity.coordinates
      if (!coords?.lat || !coords?.lng) continue
      const latLng: [number, number] = [coords.lat, coords.lng]

      if (activity.category === 'transit') {
        const transitIcon = L.divIcon({
          html: `<div style="background:#3b82f6;color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;border:2px solid rgba(59,130,246,0.3);box-shadow:0 2px 8px rgba(59,130,246,0.4);">🚃</div>`,
          className: '', iconSize: [22, 22], iconAnchor: [11, 11],
        })
        const costMatch = (activity.agentLogic ?? '').match(/[¥￥][\d,]+/)
        const cost = costMatch?.[0] ?? ''
        const popup = `<div style="max-width:220px;"><strong style="font-size:12px;color:#60a5fa;">${activity.title}</strong><div style="font-size:11px;color:#888;margin-top:3px;">${activity.timeBlock}</div>${cost ? `<div style="font-size:11px;color:#60a5fa;margin-top:3px;">${cost}</div>` : ''}</div>`
        L.marker(latLng, { icon: transitIcon }).bindPopup(popup).addTo(markersLayer)

        if (allPoints.length > 0) {
          L.polyline([allPoints[allPoints.length - 1], latLng], {
            color: '#ef4444', weight: 2, opacity: 0.5, dashArray: '6, 8',
          }).addTo(routeLayer)
        }
        allPoints.push(latLng)
        continue
      }

      activityIndex++
      const isVerified = activity.groundingStatus === 'verified'
      const isReplaced = activity.groundingStatus === 'replaced'
      const color = isVerified ? '#16a34a' : isReplaced ? '#f59e0b' : '#6b7280'
      const glow = isVerified ? 'rgba(22,163,74,0.3)' : isReplaced ? 'rgba(245,158,11,0.3)' : 'rgba(107,114,128,0.3)'

      const icon = L.divIcon({
        html: `<div style="background:${color};color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px ${glow},0 2px 4px rgba(0,0,0,0.3);">${activityIndex}</div>`,
        className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      })

      const rating = activity.groundingData?.rating
      const status = isVerified ? '✅ Verified' : isReplaced ? '🔄 Replaced' : '❓ Unverified'
      const costMatch = (activity.agentLogic ?? '').match(/[¥￥][\d,]+/)
      const cost = costMatch?.[0] ?? ''
      const popup = `<div style="max-width:240px;"><strong style="font-size:13px;">${activityIndex}. ${activity.title}</strong><div style="font-size:11px;color:#888;margin-top:4px;">${activity.timeBlock}</div><div style="font-size:11px;margin-top:4px;">${status}${rating ? ` · ⭐ ${rating}` : ''}${cost ? ` · ${cost}` : ''}</div><div style="font-size:11px;color:#aaa;margin-top:4px;">${activity.location}</div></div>`

      L.marker(latLng, { icon }).bindPopup(popup).addTo(markersLayer)

      if (allPoints.length > 0) {
        L.polyline([allPoints[allPoints.length - 1], latLng], {
          color: '#ef4444', weight: 3, opacity: 0.7,
        }).addTo(routeLayer)
      }
      allPoints.push(latLng)
    }

    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] })
    }
  })
}

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
.leaflet-popup-content-wrapper { background: #1f2937 !important; color: #e5e7eb !important; border-radius: 12px !important; border: 1px solid #374151 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; }
.leaflet-popup-tip { background: #1f2937 !important; }
.leaflet-popup-close-button { color: #9ca3af !important; }
</style>
