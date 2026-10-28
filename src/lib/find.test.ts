import { describe, expect, it } from 'vitest'
import { appleMapsUrl, coordsText, googleMapsUrl, osmDirectionsUrl, shareText } from './directions'
import { distanceMeters, offsetPoint } from './geo'
import { isStale, staleMessage } from './stale'
import type { ParkingRecord } from '../data/types'

const rec = (over: Partial<ParkingRecord> = {}): ParkingRecord => ({
  id: 'x', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', status: 'active', endedAt: null,
  latitude: 12.9716, longitude: 77.5946, locationAccuracyMeters: 8, locationSource: 'gps', locationLabel: '',
  floorLevel: '', zone: '', row: '', bayOrPillar: '', notes: '', hasPhoto: false, ...over,
})

describe('directions links', () => {
  it('builds walking links with 6-decimal coordinates', () => {
    expect(googleMapsUrl(12.9716, 77.5946)).toBe('https://www.google.com/maps/dir/?api=1&destination=12.971600,77.594600&travelmode=walking')
    expect(appleMapsUrl(12.9716, 77.5946)).toBe('https://maps.apple.com/?daddr=12.971600,77.594600&dirflg=w')
    expect(osmDirectionsUrl(12.9716, 77.5946)).toBe('https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=%3B12.971600%2C77.594600')
  })
  it('keeps negative coordinates intact', () => {
    expect(googleMapsUrl(-33.8688, -151.2093)).toContain('destination=-33.868800,-151.209300')
    expect(coordsText(-0.5, 0)).toBe('-0.500000, 0.000000')
  })
})

describe('share text', () => {
  it('includes label, clues, notes and a general-area pin, and never claims exactness', () => {
    const t = shareText(rec({ locationLabel: 'City Mall', floorLevel: 'B2', zone: 'Blue', row: 'C', bayOrPillar: 'P14', notes: 'by the exit' }))
    expect(t).toContain('City Mall')
    expect(t).toContain('Floor B2, Zone Blue, Row C, Bay P14')
    expect(t).toContain('by the exit')
    expect(t).toContain('general area only')
    expect(t).not.toMatch(/exact/i)
  })
  it('omits the map pin when there are no coordinates', () => {
    expect(shareText(rec({ latitude: null, longitude: null, locationSource: 'manual', locationLabel: 'Level 3' }))).not.toContain('Map pin')
  })
})

describe('stale records', () => {
  const now = new Date('2026-01-10T12:00:00Z').getTime()
  const ago = (h: number) => new Date(now - h * 3600 * 1000).toISOString()
  it('is stale only after 24 hours', () => {
    expect(isStale(ago(1), now)).toBe(false)
    expect(isStale(ago(24), now)).toBe(false)
    expect(isStale(ago(24.1), now)).toBe(true)
    expect(isStale(ago(72), now)).toBe(true)
  })
  it('words the warning as in the plan', () => {
    expect(staleMessage(ago(48), now)).toBe('Saved 2 days ago — confirm your vehicle is still here.')
  })
})

describe('geo maths', () => {
  it('measures distance', () => {
    expect(distanceMeters(0, 0, 0, 0)).toBe(0)
    expect(distanceMeters(0, 0, 0, 1)).toBeGreaterThan(111000)
    expect(distanceMeters(0, 0, 0, 1)).toBeLessThan(111400)
  })
  it('moves a point by metres', () => {
    const p = offsetPoint(12.9716, 77.5946, 100, 0)
    expect(p.longitude).toBeCloseTo(77.5946, 9)
    expect(distanceMeters(12.9716, 77.5946, p.latitude, p.longitude)).toBeCloseTo(100, 0)
    const e = offsetPoint(12.9716, 77.5946, 0, 50)
    expect(distanceMeters(12.9716, 77.5946, e.latitude, e.longitude)).toBeCloseTo(50, 0)
  })
  it('clamps at the poles and wraps at the date line', () => {
    expect(offsetPoint(89.99999, 0, 100000, 0).latitude).toBe(90)
    expect(offsetPoint(0, 179.99999, 0, 5000).longitude).toBeLessThan(0)
  })
})
