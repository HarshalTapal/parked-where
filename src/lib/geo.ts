const EARTH_M = 6371008.8
const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance in metres. */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Move a point by metres north and east, clamped to valid coordinates. */
export function offsetPoint(lat: number, lon: number, northM: number, eastM: number): { latitude: number; longitude: number } {
  const dLat = (northM / EARTH_M) * (180 / Math.PI)
  const dLon = (eastM / (EARTH_M * Math.cos(rad(lat)))) * (180 / Math.PI)
  const latitude = Math.max(-90, Math.min(90, lat + dLat))
  let longitude = lon + dLon
  if (longitude > 180) longitude -= 360
  if (longitude < -180) longitude += 360
  return { latitude, longitude }
}
