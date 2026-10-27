/*
 * GPS sampling (amendment A2): watch for up to ~8 s, keep the best fix, stop early
 * once accuracy is good enough. Fixes worse than ~50 m are "approximate".
 */

export const GOOD_ENOUGH_METERS = 20
export const APPROXIMATE_OVER_METERS = 50
export const MAX_SAMPLE_MS = 8000

export type Fix = { latitude: number; longitude: number; accuracyMeters: number }

export type GeoErrorCode = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'cancelled'

export class GeoError extends Error {
  readonly code: GeoErrorCode
  constructor(code: GeoErrorCode) {
    super(`Geolocation: ${code}`)
    this.name = 'GeoError'
    this.code = code
  }
}

type GeoLike = Pick<Geolocation, 'watchPosition' | 'clearWatch'>

export type Sampling = {
  /** Resolves with the best fix. Rejects with a GeoError. */
  done: Promise<Fix>
  /** Finish now with the best fix so far. Does nothing if there is no fix yet. */
  finishNow: () => void
  /** Stop without a result. `done` rejects with code 'cancelled'. */
  cancel: () => void
}

type SamplingOptions = {
  geo?: GeoLike | null
  maxMs?: number
  goodEnoughMeters?: number
  /** Called whenever a better fix arrives. */
  onBest?: (best: Fix) => void
}

export function startSampling(options: SamplingOptions = {}): Sampling {
  const geo = options.geo === undefined ? (typeof navigator !== 'undefined' ? navigator.geolocation : null) : options.geo
  const maxMs = options.maxMs ?? MAX_SAMPLE_MS
  const goodEnough = options.goodEnoughMeters ?? GOOD_ENOUGH_METERS

  let settle!: { resolve: (f: Fix) => void; reject: (e: GeoError) => void }
  const done = new Promise<Fix>((resolve, reject) => {
    settle = { resolve, reject }
  })

  if (!geo) {
    settle!.reject(new GeoError('unsupported'))
    return { done, finishNow() {}, cancel() {} }
  }

  let best: Fix | null = null
  let lastError: GeoErrorCode | null = null
  let finished = false
  let watchId: number | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function stop() {
    finished = true
    if (timer !== null) clearTimeout(timer)
    if (watchId !== null) geo!.clearWatch(watchId)
  }
  function succeed(fix: Fix) {
    if (finished) return
    stop()
    settle.resolve(fix)
  }
  function fail(code: GeoErrorCode) {
    if (finished) return
    stop()
    settle.reject(new GeoError(code))
  }

  try {
    watchId = geo.watchPosition(
      (pos) => {
        if (finished) return
        const { latitude, longitude, accuracy } = pos.coords
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
        const acc = Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : Number.POSITIVE_INFINITY
        if (best === null || acc < best.accuracyMeters) {
          // Infinity means "browser gave no accuracy": store a large honest number instead.
          best = { latitude, longitude, accuracyMeters: Number.isFinite(acc) ? acc : 9999 }
          options.onBest?.(best)
        }
        if (best.accuracyMeters <= goodEnough) succeed(best)
      },
      (err) => {
        if (finished) return
        if (err.code === 1) fail('denied') // PERMISSION_DENIED: no point waiting
        else lastError = err.code === 2 ? 'unavailable' : 'timeout'
      },
      // The browser-side timeout must outlast ours, or it would fire first.
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxMs + 2000 },
    )
  } catch {
    settle.reject(new GeoError('unsupported'))
    finished = true
    return { done, finishNow() {}, cancel() {} }
  }

  timer = setTimeout(() => {
    if (best) succeed(best)
    else fail(lastError ?? 'timeout')
  }, maxMs)

  return {
    done,
    finishNow() {
      if (best) succeed(best)
    },
    cancel() {
      fail('cancelled')
    },
  }
}

export function isApproximate(accuracyMeters: number | null): boolean {
  return accuracyMeters !== null && accuracyMeters > APPROXIMATE_OVER_METERS
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown'

/** Where the Permissions API is missing (older Safari) we cannot know, so report 'unknown'. */
export async function getPermissionState(): Promise<PermissionState> {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  } catch {
    return 'unknown'
  }
}
