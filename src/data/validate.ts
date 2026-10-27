import { ValidationError } from './types'
import type { SpotFields, SpotInput } from './types'

const LIMITS = {
  locationLabel: 200,
  floorLevel: 40,
  zone: 60,
  row: 60,
  bayOrPillar: 60,
  notes: 1000,
} as const

const EMPTY: SpotFields = {
  latitude: null,
  longitude: null,
  locationAccuracyMeters: null,
  locationSource: 'none',
  locationLabel: '',
  floorLevel: '',
  zone: '',
  row: '',
  bayOrPillar: '',
  notes: '',
}

function text(name: keyof typeof LIMITS, value: string): string {
  const v = value.trim()
  if (v.length > LIMITS[name]) {
    throw new ValidationError(`${name} must be ${LIMITS[name]} characters or fewer.`)
  }
  return v
}

/**
 * Merge `patch` over `base`, then enforce the data rules:
 * - coordinates come as a pair and are in range
 * - accuracy and a gps/adjusted source exist only alongside real coordinates
 * - text is trimmed and length-limited
 */
export function buildFields(base: SpotFields | null, patch: SpotInput): SpotFields {
  const merged: SpotFields = { ...(base ?? EMPTY), ...patch }

  const { latitude, longitude } = merged
  if ((latitude === null) !== (longitude === null)) {
    throw new ValidationError('Latitude and longitude must be set together.')
  }
  if (latitude !== null && longitude !== null) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new ValidationError('Latitude must be between -90 and 90.')
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new ValidationError('Longitude must be between -180 and 180.')
    }
  }

  if (latitude === null) {
    // No coordinates: nothing may claim to be a GPS fix.
    if (merged.locationSource === 'gps' || merged.locationSource === 'adjusted') {
      throw new ValidationError('A gps or adjusted location needs coordinates.')
    }
    merged.locationAccuracyMeters = null
  } else if (merged.locationSource === 'none') {
    throw new ValidationError('Coordinates need a location source.')
  }

  const acc = merged.locationAccuracyMeters
  if (acc !== null && (!Number.isFinite(acc) || acc < 0)) {
    throw new ValidationError('Accuracy must be zero or more metres.')
  }

  // Rebuild from known keys only, so stray keys in `patch` (e.g. status) never leak through.
  return {
    latitude: merged.latitude,
    longitude: merged.longitude,
    locationAccuracyMeters: merged.locationAccuracyMeters,
    locationSource: merged.locationSource,
    locationLabel: text('locationLabel', merged.locationLabel),
    floorLevel: text('floorLevel', merged.floorLevel),
    zone: text('zone', merged.zone),
    row: text('row', merged.row),
    bayOrPillar: text('bayOrPillar', merged.bayOrPillar),
    notes: text('notes', merged.notes),
  }
}

export function pickFields(r: SpotFields): SpotFields {
  return {
    latitude: r.latitude,
    longitude: r.longitude,
    locationAccuracyMeters: r.locationAccuracyMeters,
    locationSource: r.locationSource,
    locationLabel: r.locationLabel,
    floorLevel: r.floorLevel,
    zone: r.zone,
    row: r.row,
    bayOrPillar: r.bayOrPillar,
    notes: r.notes,
  }
}
