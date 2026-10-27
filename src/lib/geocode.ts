/*
 * Reverse geocode with Nominatim, once per save, optional. Any failure returns null
 * and the caller keeps the existing (possibly empty) label.
 * Usage policy: one request per save, no bulk use. https://operations.osmfoundation.org/policies/nominatim/
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'

type NominatimResponse = {
  name?: string
  display_name?: string
  address?: Record<string, string>
}

/** Turn a Nominatim response into a short label like "City Mall, High Street". */
export function labelFromResponse(data: NominatimResponse): string | null {
  const a = data.address ?? {}
  const place = data.name || a.amenity || a.shop || a.building || a.tourism || ''
  const street = a.road || a.pedestrian || a.neighbourhood || a.suburb || ''
  const parts = [place, street].filter((p, i, all) => p && all.indexOf(p) === i)
  if (parts.length > 0) return parts.join(', ')
  const fallback = data.display_name?.split(',').slice(0, 2).join(',').trim()
  return fallback || null
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  timeoutMs = 5000,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const url = `${ENDPOINT}?format=jsonv2&zoom=18&lat=${latitude}&lon=${longitude}`
    const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return labelFromResponse((await res.json()) as NominatimResponse)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
