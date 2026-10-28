/*
 * Leaflet + OpenStreetMap tiles. This module is only ever imported dynamically (see
 * MapPanel), so Leaflet stays out of the main bundle until a map is on screen.
 * Tile policy: no bulk downloading or caching of tiles; attribution stays visible.
 */
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'

// Black SVG pin, so no marker image files are needed.
const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44" aria-hidden="true">' +
  '<path d="M18 43S33 29 33 17A15 15 0 0 0 3 17c0 12 15 26 15 26z" fill="#000" stroke="#fff" stroke-width="2"/>' +
  '<circle cx="18" cy="17" r="5.5" fill="#fff"/></svg>'

export type MapOptions = {
  latitude: number
  longitude: number
  accuracyMeters: number | null
  draggable: boolean
  title: string
  onMove?: (latitude: number, longitude: number) => void
  onTileLoad?: () => void
  onTileError?: () => void
}

export type MapHandle = {
  setPin: (latitude: number, longitude: number) => void
  destroy: () => void
}

export function createMap(el: HTMLElement, o: MapOptions): MapHandle {
  const map = L.map(el, { zoomControl: true, attributionControl: true })
  const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION })
  tiles.on('tileload', () => o.onTileLoad?.())
  tiles.on('tileerror', () => o.onTileError?.())
  tiles.addTo(map)

  const start = L.latLng(o.latitude, o.longitude)
  const marker = L.marker(start, {
    icon: L.divIcon({ className: 'pin-icon', html: PIN_SVG, iconSize: [36, 44], iconAnchor: [18, 44] }),
    draggable: o.draggable,
    keyboard: true,
    title: o.title,
  }).addTo(map)

  let circle: L.Circle | null = null
  if (o.accuracyMeters !== null && o.accuracyMeters > 0) {
    circle = L.circle(start, {
      radius: o.accuracyMeters,
      color: '#000',
      weight: 1,
      fillColor: '#000',
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(map)
  }

  if (circle && o.accuracyMeters! > 60) map.fitBounds(circle.getBounds(), { maxZoom: 17, padding: [24, 24] })
  else map.setView(start, 17)

  // Once the pin is moved by hand the GPS accuracy circle no longer applies.
  function moved(ll: L.LatLng) {
    if (circle) {
      circle.remove()
      circle = null
    }
    o.onMove?.(ll.lat, ll.lng)
  }
  if (o.draggable) {
    marker.on('dragend', () => moved(marker.getLatLng()))
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      moved(e.latlng)
    })
  }

  return {
    setPin(latitude, longitude) {
      const cur = marker.getLatLng()
      if (Math.abs(cur.lat - latitude) < 1e-9 && Math.abs(cur.lng - longitude) < 1e-9) return
      const next = L.latLng(latitude, longitude)
      marker.setLatLng(next)
      if (circle) {
        circle.remove()
        circle = null
      }
      if (!map.getBounds().contains(next)) map.panTo(next)
    },
    destroy() {
      map.remove()
    },
  }
}
