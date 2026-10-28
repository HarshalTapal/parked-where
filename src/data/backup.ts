import { run } from './db'
import { ValidationError } from './types'
import type { ParkingRecord } from './types'
import { buildFields } from './validate'

/*
 * Backup file: plain JSON, photos inline as base64. Import checks the whole file
 * first, then writes everything in one transaction, so a bad file changes nothing.
 */

export const BACKUP_APP = 'parked-where'
export const BACKUP_VERSION = 1

const MAX_FILE_BYTES = 250 * 1024 * 1024
const MAX_RECORDS = 5000
const MAX_PHOTO_BYTES = 15 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type BackupPhoto = { type: string; data: string }
export type BackupRecord = Omit<ParkingRecord, 'hasPhoto'> & { photo: BackupPhoto | null }
export type BackupFile = { app: typeof BACKUP_APP; version: number; exportedAt: string; records: BackupRecord[] }

/** The file cannot be imported. The message is safe to show to the user. */
export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

// ---------- base64 ----------

function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(out)
}

function base64ToBytes(data: string): Uint8Array {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ---------- stats ----------

export type Stats = { records: number; active: number; history: number; photos: number }

export async function getStats(): Promise<Stats> {
  return run(
    async (db) => {
      const [records, active, photos] = await Promise.all([
        db.count('records'),
        db.countFromIndex('records', 'status', 'active'),
        db.count('photos'),
      ])
      return { records, active, history: records - active, photos }
    },
    { write: false },
  )
}

// ---------- export ----------

export async function exportAll(): Promise<BackupFile> {
  // Read everything inside one transaction, convert after it (a transaction closes while we wait on other work).
  const { records, photoKeys, photoBlobs } = await run(
    async (db) => {
      const [records, photoKeys, photoBlobs] = await Promise.all([
        db.getAll('records'),
        db.getAllKeys('photos'),
        db.getAll('photos'),
      ])
      return { records, photoKeys, photoBlobs }
    },
    { write: false },
  )

  const photos = new Map<string, BackupPhoto>()
  for (let i = 0; i < photoKeys.length; i++) {
    const blob = photoBlobs[i]
    const type = PHOTO_TYPES.includes(blob.type) ? blob.type : 'image/jpeg'
    photos.set(String(photoKeys[i]), { type, data: bytesToBase64(new Uint8Array(await blob.arrayBuffer())) })
  }

  records.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    records: records.map(({ hasPhoto, ...rest }) => ({ ...rest, photo: hasPhoto ? (photos.get(rest.id) ?? null) : null })),
  }
}

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `parked-where-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}

// ---------- parse and validate ----------

export type ParsedRecord = { record: ParkingRecord; photo: Blob | null }
export type ParsedBackup = { exportedAt: string; items: ParsedRecord[] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isDateString = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v))

function parsePhoto(raw: unknown, where: string): Blob | null {
  if (raw === null || raw === undefined) return null
  if (!isObj(raw) || typeof raw.type !== 'string' || typeof raw.data !== 'string') {
    throw new BackupError(`${where}: the photo is not in the expected format.`)
  }
  if (!PHOTO_TYPES.includes(raw.type)) throw new BackupError(`${where}: the photo type "${raw.type}" is not supported.`)
  if (raw.data.length > Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 4) throw new BackupError(`${where}: the photo is too large.`)
  if (raw.data.length === 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(raw.data) || raw.data.length % 4 !== 0) {
    throw new BackupError(`${where}: the photo data is damaged.`)
  }
  const bytes = base64ToBytes(raw.data)
  if (bytes.length === 0) throw new BackupError(`${where}: the photo data is damaged.`)
  return new Blob([bytes as BlobPart], { type: raw.type })
}

/** Check a backup file's text. Throws BackupError with a plain-language reason; never writes anything. */
export function parseBackup(text: string, fileSize: number = text.length): ParsedBackup {
  if (fileSize > MAX_FILE_BYTES) throw new BackupError('That file is too large to be a backup from this app.')
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('That file is not a valid backup. It could not be read as JSON.')
  }
  if (!isObj(data) || data.app !== BACKUP_APP) {
    throw new BackupError('That file is not a Parked Where? backup.')
  }
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
    throw new BackupError('That backup has no valid version number.')
  }
  if (data.version > BACKUP_VERSION) {
    throw new BackupError('That backup was made by a newer version of the app. Update the app and try again.')
  }
  if (!Array.isArray(data.records)) throw new BackupError('That backup has no list of records.')
  if (data.records.length > MAX_RECORDS) throw new BackupError(`That backup has more than ${MAX_RECORDS} records.`)

  const seen = new Set<string>()
  const items: ParsedRecord[] = []
  data.records.forEach((raw: unknown, i: number) => {
    const where = `Record ${i + 1}`
    if (!isObj(raw)) throw new BackupError(`${where} is not in the expected format.`)
    const { id, status } = raw
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new BackupError(`${where} has an invalid id.`)
    if (seen.has(id)) throw new BackupError(`${where} repeats an id that appears earlier in the file.`)
    seen.add(id)
    if (status !== 'active' && status !== 'history') throw new BackupError(`${where} has an invalid status.`)
    if (!isDateString(raw.createdAt) || !isDateString(raw.updatedAt)) throw new BackupError(`${where} has an invalid date.`)
    if (raw.endedAt !== null && raw.endedAt !== undefined && !isDateString(raw.endedAt)) {
      throw new BackupError(`${where} has an invalid end date.`)
    }

    let fields
    try {
      // The same rules as saving by hand: coordinate pairs and ranges, source, text lengths.
      fields = buildFields(null, {
        latitude: raw.latitude as number | null,
        longitude: raw.longitude as number | null,
        locationAccuracyMeters: (raw.locationAccuracyMeters ?? null) as number | null,
        locationSource: raw.locationSource as ParkingRecord['locationSource'],
        locationLabel: asText(raw.locationLabel, where),
        floorLevel: asText(raw.floorLevel, where),
        zone: asText(raw.zone, where),
        row: asText(raw.row, where),
        bayOrPillar: asText(raw.bayOrPillar, where),
        notes: asText(raw.notes, where),
      })
      if (!['gps', 'adjusted', 'manual', 'none'].includes(fields.locationSource)) {
        throw new ValidationError('Location source is not recognised.')
      }
      for (const n of [fields.latitude, fields.longitude, fields.locationAccuracyMeters]) {
        if (n !== null && typeof n !== 'number') throw new ValidationError('Coordinates must be numbers.')
      }
    } catch (e) {
      if (e instanceof BackupError) throw e
      throw new BackupError(`${where}: ${e instanceof Error ? e.message : 'invalid details.'}`)
    }

    const photo = parsePhoto(raw.photo, where)
    const endedAt = typeof raw.endedAt === 'string' ? raw.endedAt : null
    items.push({
      photo,
      record: {
        id,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        status,
        endedAt: status === 'active' ? null : (endedAt ?? raw.updatedAt),
        hasPhoto: photo !== null,
        ...fields,
      },
    })
  })

  return { exportedAt: isDateString(data.exportedAt) ? data.exportedAt : '', items }
}

function asText(v: unknown, where: string): string {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') throw new BackupError(`${where} has a text field that is not text.`)
  return v
}

// ---------- import ----------

export type ImportResult = { added: number; skipped: number; photos: number; demoted: boolean }

/**
 * Add the backup's records. Records whose id is already here are left exactly as they are.
 * Only one record may be active: a backed-up active spot stays active only if the device
 * has no active spot, otherwise it joins history. All or nothing.
 */
export async function importBackup(parsed: ParsedBackup): Promise<ImportResult> {
  return run(
    async (db) => {
      const tx = db.transaction(['records', 'photos'], 'readwrite')
      const records = tx.objectStore('records')
      const photos = tx.objectStore('photos')

      const existing = new Set((await records.getAllKeys()).map(String))
      let activeTaken = (await records.index('status').count('active')) > 0

      // Newest first, so if a file holds several active records the newest one wins.
      const fresh = parsed.items.filter((i) => !existing.has(i.record.id))
      fresh.sort((a, b) => (a.record.createdAt < b.record.createdAt ? 1 : a.record.createdAt > b.record.createdAt ? -1 : 0))

      let photoCount = 0
      let demoted = false
      for (const { record, photo } of fresh) {
        let toWrite = record
        if (record.status === 'active') {
          if (activeTaken) {
            toWrite = { ...record, status: 'history', endedAt: record.updatedAt }
            demoted = true
          } else {
            activeTaken = true
          }
        }
        await records.put(toWrite)
        if (photo) {
          await photos.put(photo, toWrite.id)
          photoCount++
        }
      }
      await tx.done
      return { added: fresh.length, skipped: parsed.items.length - fresh.length, photos: photoCount, demoted }
    },
    { write: true },
  )
}

// ---------- delete all ----------

/** Remove every record and photo. Cannot be undone. */
export async function deleteAll(): Promise<void> {
  await run(
    async (db) => {
      const tx = db.transaction(['records', 'photos'], 'readwrite')
      await tx.objectStore('records').clear()
      await tx.objectStore('photos').clear()
      await tx.done
    },
    { write: true },
  )
}
