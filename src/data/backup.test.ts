import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BackupError, backupFileName, deleteAll, exportAll, getStats, importBackup, parseBackup } from './backup'
import { destroyDatabase, injectStorageFailure } from './db'
import { createSpot, endActive, getActive, getPhoto, getRecord, listHistory, setPhoto } from './records'
import { StorageError } from './types'

beforeEach(async () => {
  injectStorageFailure(null)
  await destroyDatabase()
})
afterEach(() => injectStorageFailure(null))

const gps = { latitude: 12.97, longitude: 77.59, locationAccuracyMeters: 8, locationSource: 'gps' as const }
const bytes = (...n: number[]) => new Blob([new Uint8Array(n)], { type: 'image/jpeg' })

async function seedThree() {
  const a = (await createSpot({ ...gps, locationLabel: 'A', floorLevel: 'B1', notes: 'note' })).record
  await setPhoto(a.id, bytes(255, 216, 255, 1, 2, 3))
  const b = (await createSpot({ locationSource: 'manual', locationLabel: 'B typed' })).record
  const c = (await createSpot({ ...gps, locationLabel: 'C', zone: 'Blue' })).record
  await setPhoto(c.id, bytes(9, 8, 7, 6))
  return { a, b, c }
}

const text = (file: unknown) => JSON.stringify(file)
const base = (records: unknown[] = []) => ({ app: 'parked-where', version: 1, exportedAt: '2026-01-01T00:00:00.000Z', records })
const rec = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  status: 'history',
  endedAt: '2026-01-01T12:00:00.000Z',
  latitude: 12.97,
  longitude: 77.59,
  locationAccuracyMeters: 8,
  locationSource: 'gps',
  locationLabel: 'X',
  floorLevel: '',
  zone: '',
  row: '',
  bayOrPillar: '',
  notes: '',
  photo: null,
  ...over,
})

describe('stats', () => {
  it('counts records, active, history and photos', async () => {
    expect(await getStats()).toEqual({ records: 0, active: 0, history: 0, photos: 0 })
    await seedThree()
    expect(await getStats()).toEqual({ records: 3, active: 1, history: 2, photos: 2 })
  })
})

describe('export → delete all → import', () => {
  it('restores every record, every field and every photo byte-for-byte', async () => {
    const { a, b, c } = await seedThree()
    const before = [await getRecord(a.id), await getRecord(b.id), await getRecord(c.id)]
    const file = await exportAll()
    expect(file.records).toHaveLength(3)
    expect(file.records.filter((r) => r.photo).length).toBe(2)

    await deleteAll()
    expect(await getStats()).toEqual({ records: 0, active: 0, history: 0, photos: 0 })
    expect(await getActive()).toBeNull()

    const result = await importBackup(parseBackup(text(file)))
    expect(result).toEqual({ added: 3, skipped: 0, photos: 2, demoted: false })
    expect([await getRecord(a.id), await getRecord(b.id), await getRecord(c.id)]).toEqual(before)
    expect((await getActive())!.id).toBe(c.id)
    expect(Array.from(new Uint8Array(await (await getPhoto(a.id))!.arrayBuffer()))).toEqual([255, 216, 255, 1, 2, 3])
    expect(Array.from(new Uint8Array(await (await getPhoto(c.id))!.arrayBuffer()))).toEqual([9, 8, 7, 6])
    expect(await getPhoto(b.id)).toBeNull()
    expect((await listHistory()).map((r) => r.id)).toEqual([b.id, a.id])
  })

  it('exports an empty app as a valid file that imports as nothing', async () => {
    const file = await exportAll()
    expect(file.records).toEqual([])
    expect(await importBackup(parseBackup(text(file)))).toEqual({ added: 0, skipped: 0, photos: 0, demoted: false })
  })

  it('does not change anything on export', async () => {
    const { c } = await seedThree()
    const before = await getRecord(c.id)
    await exportAll()
    expect(await getRecord(c.id)).toEqual(before)
    expect(await getStats()).toMatchObject({ records: 3 })
  })
})

describe('import rules', () => {
  it('skips records already on the device and leaves them untouched', async () => {
    const { c } = await seedThree()
    const before = await getRecord(c.id)
    const file = await exportAll()
    const result = await importBackup(parseBackup(text(file)))
    expect(result).toMatchObject({ added: 0, skipped: 3, photos: 0 })
    expect(await getRecord(c.id)).toEqual(before)
    expect(await getStats()).toEqual({ records: 3, active: 1, history: 2, photos: 2 })
  })

  it('keeps one active spot: a backed-up active spot joins history when one is already active', async () => {
    const file = base([rec({ id: 'old-active', status: 'active', endedAt: null, locationLabel: 'Backed up' })])
    const { record: current } = await createSpot({ ...gps, locationLabel: 'Current' })
    const result = await importBackup(parseBackup(text(file)))
    expect(result).toMatchObject({ added: 1, demoted: true })
    expect((await getActive())!.id).toBe(current.id)
    const imported = (await getRecord('old-active'))!
    expect(imported.status).toBe('history')
    expect(imported.endedAt).not.toBeNull()
  })

  it('makes the backed-up active spot active when the device has none', async () => {
    const file = base([rec({ id: 'was-active', status: 'active', endedAt: null })])
    const result = await importBackup(parseBackup(text(file)))
    expect(result.demoted).toBe(false)
    expect((await getActive())!.id).toBe('was-active')
  })

  it('never ends up with two active records, even if the file has several', async () => {
    const file = base([
      rec({ id: 'x1', status: 'active', endedAt: null, createdAt: '2026-01-01T10:00:00.000Z' }),
      rec({ id: 'x2', status: 'active', endedAt: null, createdAt: '2026-02-01T10:00:00.000Z' }),
      rec({ id: 'x3', status: 'active', endedAt: null, createdAt: '2026-03-01T10:00:00.000Z' }),
    ])
    await importBackup(parseBackup(text(file)))
    expect((await getActive())!.id).toBe('x3')
    expect(await getStats()).toMatchObject({ records: 3, active: 1, history: 2 })
  })

  it('fills in a missing end date for history records and clears it for active ones', () => {
    const parsed = parseBackup(text(base([rec({ endedAt: null }), rec({ id: 'r2', status: 'active', endedAt: '2026-01-02T00:00:00.000Z' })])))
    expect(parsed.items[0].record.endedAt).toBe('2026-01-01T10:00:00.000Z')
    expect(parsed.items[1].record.endedAt).toBeNull()
  })

  it('ignores unknown extra keys and cannot smuggle in other fields', () => {
    const parsed = parseBackup(text(base([rec({ hasPhoto: true, evil: 'x', __proto__: { a: 1 } })])))
    const r = parsed.items[0].record as unknown as Record<string, unknown>
    expect(r.evil).toBeUndefined()
    expect(r.hasPhoto).toBe(false) // derived from the photo, not trusted from the file
  })

  it('changes nothing if storage fails during import', async () => {
    const file = base([rec({ id: 'p1' }), rec({ id: 'p2' })])
    const parsed = parseBackup(text(file))
    injectStorageFailure('quota')
    await expect(importBackup(parsed)).rejects.toBeInstanceOf(StorageError)
    injectStorageFailure(null)
    expect(await getStats()).toMatchObject({ records: 0 })
  })
})

describe('rejecting bad files (nothing is written)', () => {
  const bad = (value: string | object, pattern: RegExp) => {
    const t = typeof value === 'string' ? value : text(value)
    expect(() => parseBackup(t)).toThrowError(BackupError)
    expect(() => parseBackup(t)).toThrowError(pattern)
  }

  it('rejects text that is not JSON', () => bad('not json {', /not a valid backup/))
  it('rejects JSON from another app', () => bad({ app: 'other', version: 1, records: [] }, /not a Parked Where\? backup/))
  it('rejects a JSON array or null', () => {
    bad('[]', /not a Parked Where/)
    bad('null', /not a Parked Where/)
  })
  it('rejects a missing or bad version', () => {
    bad({ app: 'parked-where', records: [] }, /version/)
    bad({ app: 'parked-where', version: 'one', records: [] }, /version/)
  })
  it('rejects a newer version with a clear hint', () => bad({ ...base(), version: 2 }, /newer version/))
  it('rejects a missing record list', () => bad({ app: 'parked-where', version: 1 }, /list of records/))
  it('rejects a file that is too large', () => {
    expect(() => parseBackup('{}', 300 * 1024 * 1024)).toThrowError(/too large/)
  })
  it('rejects an invalid id, status or date', () => {
    bad(base([rec({ id: '../x' })]), /Record 1 has an invalid id/)
    bad(base([rec({ id: 5 })]), /invalid id/)
    bad(base([rec({ status: 'deleted' })]), /invalid status/)
    bad(base([rec({ createdAt: 'yesterday' })]), /invalid date/)
    bad(base([rec({ endedAt: 'soon' })]), /invalid end date/)
  })
  it('rejects repeated ids', () => bad(base([rec(), rec()]), /repeats an id/))
  it('names the record that breaks the data rules', () => {
    bad(base([rec(), rec({ id: 'r2', latitude: 120 })]), /Record 2: Latitude must be between/)
    bad(base([rec({ latitude: null })]), /Record 1: Latitude and longitude must be set together/)
    bad(base([rec({ latitude: '12.9' })]), /Record 1/)
    bad(base([rec({ locationSource: 'teleport' })]), /Record 1/)
    bad(base([rec({ notes: 'x'.repeat(1001) })]), /Record 1: notes must be 1000/)
    bad(base([rec({ zone: 42 })]), /not text/)
    bad(base([rec({ locationAccuracyMeters: -3 })]), /Record 1/)
  })
  it('rejects a damaged or unsupported photo', () => {
    bad(base([rec({ photo: 'abc' })]), /expected format/)
    bad(base([rec({ photo: { type: 'text/html', data: 'AAAA' } })]), /not supported/)
    bad(base([rec({ photo: { type: 'image/jpeg', data: '***' } })]), /damaged/)
    bad(base([rec({ photo: { type: 'image/jpeg', data: 'AAA' } })]), /damaged/)
    bad(base([rec({ photo: { type: 'image/jpeg', data: '' } })]), /damaged/)
  })
  it('accepts a good photo and records with no coordinates', () => {
    const parsed = parseBackup(
      text(base([rec({ photo: { type: 'image/png', data: 'iVBORw0KGgo=' } }), rec({ id: 'r2', latitude: null, longitude: null, locationAccuracyMeters: null, locationSource: 'manual' })])),
    )
    expect(parsed.items[0].photo!.type).toBe('image/png')
    expect(parsed.items[0].record.hasPhoto).toBe(true)
    expect(parsed.items[1].record.latitude).toBeNull()
  })
})

describe('delete all', () => {
  it('removes every record and photo, active and past', async () => {
    await seedThree()
    await endActive()
    await deleteAll()
    expect(await getStats()).toEqual({ records: 0, active: 0, history: 0, photos: 0 })
    expect(await listHistory()).toEqual([])
  })
  it('works when there is nothing to delete', async () => {
    await expect(deleteAll()).resolves.toBeUndefined()
  })
  it('reports a storage failure and deletes nothing', async () => {
    await seedThree()
    injectStorageFailure('quota')
    await expect(deleteAll()).rejects.toBeInstanceOf(StorageError)
    injectStorageFailure(null)
    expect(await getStats()).toMatchObject({ records: 3 })
  })
  it('lets you save again afterwards', async () => {
    await seedThree()
    await deleteAll()
    const { record, archived } = await createSpot(gps)
    expect(archived).toBeNull()
    expect((await getActive())!.id).toBe(record.id)
  })
})

describe('file name', () => {
  it('is dated', () => {
    expect(backupFileName(new Date(2026, 2, 5))).toBe('parked-where-backup-2026-03-05.json')
  })
})
