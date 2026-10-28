export function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export function formatAccuracy(meters: number): string {
  return `±${Math.round(meters)} m`
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const diffMin = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000))
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const hours = Math.floor(diffMin / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** "12 Mar 2026, 14:05". */
export function dateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  return `${date}, ${clockTime(iso)}`
}

/** One-line name for a spot: its label, else what we know about where it is. */
export function spotTitle(r: { locationLabel: string; latitude: number | null; longitude: number | null }): string {
  if (r.locationLabel) return r.locationLabel
  if (r.latitude !== null && r.longitude !== null) return 'Location saved, not named'
  return 'No location saved'
}
