import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { labelFromResponse, reverseGeocode } from './geocode'
import { isApproximate, startSampling } from './geolocation'
import type { GeoErrorCode } from './geolocation'
import { formatAccuracy, formatCoords, timeAgo } from './format'

type Success = (p: GeolocationPosition) => void
type Failure = (e: GeolocationPositionError) => void

function fakeGeo() {
  let ok: Success = () => {}
  let bad: Failure = () => {}
  const cleared: number[] = []
  const geo = {
    watchPosition: (s: Success, f: Failure) => {
      ok = s
      bad = f
      return 7
    },
    clearWatch: (id: number) => void cleared.push(id),
  }
  return {
    geo: geo as Pick<Geolocation, 'watchPosition' | 'clearWatch'>,
    cleared,
    fix: (accuracy: number, lat = 10, lon = 20) =>
      ok({ coords: { latitude: lat, longitude: lon, accuracy } } as GeolocationPosition),
    error: (code: number) => bad({ code } as GeolocationPositionError),
  }
}

async function code(p: Promise<unknown>): Promise<GeoErrorCode | 'resolved'> {
  try {
    await p
    return 'resolved'
  } catch (e) {
    return (e as { code: GeoErrorCode }).code
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('GPS sampling', () => {
  it('stops early once accuracy is good enough', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    f.fix(60)
    f.fix(35)
    f.fix(15, 11, 21)
    await expect(s.done).resolves.toEqual({ latitude: 11, longitude: 21, accuracyMeters: 15 })
    expect(f.cleared).toEqual([7])
  })

  it('keeps the best fix and returns it at the deadline', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    f.fix(80, 1, 1)
    f.fix(40, 2, 2)
    f.fix(55, 3, 3) // worse than 40: ignored
    await vi.advanceTimersByTimeAsync(8000)
    await expect(s.done).resolves.toEqual({ latitude: 2, longitude: 2, accuracyMeters: 40 })
    expect(f.cleared).toEqual([7])
  })

  it('does not finish before the deadline when accuracy is only fair', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    let settled = false
    void s.done.then(() => (settled = true))
    f.fix(30)
    await vi.advanceTimersByTimeAsync(7900)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    expect(settled).toBe(true)
  })

  it('reports the callback accuracy as-is, including approximate fixes', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    f.fix(120)
    await vi.advanceTimersByTimeAsync(8000)
    const fix = await s.done
    expect(fix.accuracyMeters).toBe(120)
    expect(isApproximate(fix.accuracyMeters)).toBe(true)
    expect(isApproximate(50)).toBe(false)
    expect(isApproximate(51)).toBe(true)
    expect(isApproximate(null)).toBe(false)
  })

  it('rejects immediately when permission is denied', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    f.error(1)
    expect(await code(s.done)).toBe('denied')
    expect(f.cleared).toEqual([7])
  })

  it('rejects as unavailable when the position is unavailable and no fix ever arrives', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    const result = code(s.done) // attach before the deadline fires
    f.error(2)
    await vi.advanceTimersByTimeAsync(8000)
    expect(await result).toBe('unavailable')
  })

  it('rejects as timeout when nothing happens', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    const result = code(s.done)
    await vi.advanceTimersByTimeAsync(8000)
    expect(await result).toBe('timeout')
  })

  it('still returns a fix if an error arrived before it', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    f.error(2)
    f.fix(45)
    await vi.advanceTimersByTimeAsync(8000)
    await expect(s.done).resolves.toMatchObject({ accuracyMeters: 45 })
  })

  it('rejects as unsupported without geolocation', async () => {
    expect(await code(startSampling({ geo: null }).done)).toBe('unsupported')
  })

  it('finishNow uses the best fix, and does nothing without one', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    s.finishNow() // no fix yet: ignored
    f.fix(70)
    s.finishNow()
    await expect(s.done).resolves.toMatchObject({ accuracyMeters: 70 })
  })

  it('cancel rejects with cancelled and stops watching', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    s.cancel()
    expect(await code(s.done)).toBe('cancelled')
    expect(f.cleared).toEqual([7])
    f.fix(5) // late callbacks are ignored
  })

  it('ignores non-finite coordinates', async () => {
    const f = fakeGeo()
    const s = startSampling({ geo: f.geo })
    const result = code(s.done)
    f.fix(5, Number.NaN, 1)
    await vi.advanceTimersByTimeAsync(8000)
    expect(await result).toBe('timeout')
  })

  it('reports onBest for improving fixes only', () => {
    const f = fakeGeo()
    const seen: number[] = []
    startSampling({ geo: f.geo, onBest: (b) => seen.push(b.accuracyMeters) })
    f.fix(90)
    f.fix(95)
    f.fix(60)
    expect(seen).toEqual([90, 60])
  })
})

describe('reverse geocode', () => {
  it('builds a short label from a response', () => {
    expect(labelFromResponse({ name: 'City Mall', address: { road: 'High Street' } })).toBe('City Mall, High Street')
    expect(labelFromResponse({ address: { road: 'High Street' } })).toBe('High Street')
    expect(labelFromResponse({ display_name: 'A, B, C, D' })).toBe('A, B')
    expect(labelFromResponse({})).toBeNull()
  })

  it('returns the label on success', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ name: 'Lot 4' }) })
    expect(await reverseGeocode(1, 2, 5000, f as unknown as typeof fetch)).toBe('Lot 4')
    expect(String(f.mock.calls[0][0])).toContain('lat=1&lon=2')
  })

  it('returns null on network failure, bad status and bad json', async () => {
    const down = vi.fn().mockRejectedValue(new Error('offline'))
    expect(await reverseGeocode(1, 2, 5000, down as unknown as typeof fetch)).toBeNull()
    const bad = vi.fn().mockResolvedValue({ ok: false })
    expect(await reverseGeocode(1, 2, 5000, bad as unknown as typeof fetch)).toBeNull()
    const junk = vi.fn().mockResolvedValue({ ok: true, json: async () => Promise.reject(new Error('x')) })
    expect(await reverseGeocode(1, 2, 5000, junk as unknown as typeof fetch)).toBeNull()
  })

  it('gives up after the timeout', async () => {
    const hang = vi.fn((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal!.addEventListener('abort', () => rej(new Error('abort')))))
    const p = reverseGeocode(1, 2, 1000, hang as unknown as typeof fetch)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await p).toBeNull()
  })
})

describe('format', () => {
  it('formats coordinates and accuracy', () => {
    expect(formatCoords(12.345678, -77.1)).toBe('12.34568, -77.10000')
    expect(formatAccuracy(14.6)).toBe('±15 m')
  })
  it('describes elapsed time', () => {
    const now = new Date('2026-01-10T12:00:00Z').getTime()
    const ago = (min: number) => new Date(now - min * 60000).toISOString()
    expect(timeAgo(ago(0), now)).toBe('just now')
    expect(timeAgo(ago(5), now)).toBe('5 min ago')
    expect(timeAgo(ago(180), now)).toBe('3 h ago')
    expect(timeAgo(ago(60 * 24), now)).toBe('1 day ago')
    expect(timeAgo(ago(60 * 24 * 3), now)).toBe('3 days ago')
    expect(timeAgo(ago(-10), now)).toBe('just now')
  })
})
