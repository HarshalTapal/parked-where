/*
 * Directions are external deep links only: no routing happens in this app.
 * They lead to the general area. They cannot say which floor, row or bay.
 */
import type { ParkingRecord } from '../data/types'

const c = (n: number) => n.toFixed(6)

export function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${c(lat)},${c(lon)}&travelmode=walking`
}

export function appleMapsUrl(lat: number, lon: number): string {
  return `https://maps.apple.com/?daddr=${c(lat)},${c(lon)}&dirflg=w`
}

export function osmDirectionsUrl(lat: number, lon: number): string {
  // route=<from>;<to>. An empty "from" lets OSM ask for the user's start point.
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=%3B${c(lat)}%2C${c(lon)}`
}

export function coordsText(lat: number, lon: number): string {
  return `${c(lat)}, ${c(lon)}`
}

/** Plain-text summary for the share sheet. Makes no claim about floor or bay accuracy. */
export function shareText(r: ParkingRecord): string {
  const lines = ['Where I parked']
  if (r.locationLabel) lines.push(r.locationLabel)
  const clues = [
    r.floorLevel && `Floor ${r.floorLevel}`,
    r.zone && `Zone ${r.zone}`,
    r.row && `Row ${r.row}`,
    r.bayOrPillar && `Bay ${r.bayOrPillar}`,
  ].filter(Boolean)
  if (clues.length) lines.push(clues.join(', '))
  if (r.notes) lines.push(r.notes)
  if (r.latitude !== null && r.longitude !== null) {
    lines.push(`Map pin: ${coordsText(r.latitude, r.longitude)} (general area only)`)
  }
  return lines.join('\n')
}
