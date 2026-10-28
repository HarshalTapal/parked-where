import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { destroyDatabase, injectStorageFailure } from './db'
import {
  createSpot,
  deleteSpot,
  endActive,
  getActive,
  getPhoto,
  getRecord,
  listHistory,
  removePhoto,
  restoreSpot,
  reuseSpot,
  setPhoto,
  undoSave,
  updateSpot,
} from './records'
import { StorageError, ValidationError } from './types'

beforeEach(async () => {
  injectStorageFailure(null)
  await destroyDatabase()
})
afterEach(() => injectStorageFailure(null))

const gps = { latitude: 12.97, longitude: 77.59, locationAccuracyMeters: 8, locationSource: 'gps' as const }

describe('creating spots', () => {
  it('saves with no details at all', async () => {
    const { record, archived } = await createSpot()
    expect(record.status).toBe('active')
    expect(record.latitude).toBeNull()
    expect(record.locationSource).toBe('none')
    expect(record.hasPhoto).toBe(false)
    expect(archived).toBeNull()
    expect(await getActive()).toEqual(record)
  })

  it('saves a gps fix and trims text', async () => {
    const { record } = await createSpot({ ...gps, floorLevel: '  B2 ', notes: ' near lift ' })
    expect(record.latitude).toBe(12.97)
    expect(record.locationAccuracyMeters).toBe(8)
    expect(record.floorLevel).toBe('B2')
    expect(record.notes).toBe('near lift')
  })

  it('saves a manual location without coordinates', async () => {
    const { record } = await createSpot({ locationSource: 'manual', locationLabel: 'City Mall, level 3' })
    expect(record.latitude).toBeNull()
    expect(record.locationAccuracyMeters).toBeNull()
    expect(record.locationLabel).toBe('City Mall, level 3')
  })

  it('assigns unique ids', async () => {
    const a = await createSpot()
    const b = await createSpot()
    expect(a.record.id).not.toBe(b.record.id)
  })
})

describe('validation', () => {
  it('rejects coordinates without a pair', async () => {
    await expect(createSpot({ latitude: 1, longitude: null, locationSource: 'gps' })).rejects.toBeInstanceOf(
      ValidationError,
    )
  })
  it('rejects out-of-range coordinates', async () => {
    await expect(createSpot({ ...gps, latitude: 91 })).rejects.toBeInstanceOf(ValidationError)
    await expect(createSpot({ ...gps, longitude: -181 })).rejects.toBeInstanceOf(ValidationError)
    await expect(createSpot({ ...gps, latitude: Number.NaN })).rejects.toBeInstanceOf(ValidationError)
  })
  it('rejects a gps source without coordinates', async () => {
    await expect(createSpot({ locationSource: 'gps' })).rejects.toBeInstanceOf(ValidationError)
  })
  it('rejects coordinates with source none', async () => {
    await expect(
      createSpot({ latitude: 1, longitude: 1, locationSource: 'none' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
  it('drops accuracy when there are no coordinates', async () => {
    const { record } = await createSpot({ locationSource: 'manual', locationAccuracyMeters: 5 })
    expect(record.locationAccuracyMeters).toBeNull()
  })
  it('rejects negative accuracy and over-long text', async () => {
    await expect(createSpot({ ...gps, locationAccuracyMeters: -1 })).rejects.toBeInstanceOf(ValidationError)
    await expect(createSpot({ notes: 'x'.repeat(1001) })).rejects.toBeInstanceOf(ValidationError)
  })
  it('does not write anything when validation fails', async () => {
    await createSpot({ notes: 'first' }).catch(() => {})
    await createSpot({ latitude: 999, longitude: 0, locationSource: 'gps' }).catch(() => {})
    expect((await getActive())?.notes).toBe('first')
    expect(await listHistory()).toHaveLength(0)
  })
})

describe('one active spot at a time', () => {
  it('archives the previous spot when a new one is saved', async () => {
    const first = await createSpot({ notes: 'first' })
    const second = await createSpot({ notes: 'second' })
    expect(second.archived?.id).toBe(first.record.id)
    expect((await getActive())?.id).toBe(second.record.id)
    const history = await listHistory()
    expect(history).toHaveLength(1)
    expect(history[0].status).toBe('history')
    expect(history[0].endedAt).not.toBeNull()
  })

  it('never has more than one active after many saves', async () => {
    for (let i = 0; i < 6; i++) await createSpot({ notes: `spot ${i}` })
    const history = await listHistory()
    expect(history).toHaveLength(5)
    expect(history.every((r) => r.status === 'history')).toBe(true)
    expect((await getActive())?.notes).toBe('spot 5')
  })

  it('lists history newest first', async () => {
    for (let i = 0; i < 4; i++) {
      await createSpot({ notes: `spot ${i}` })
      await new Promise((r) => setTimeout(r, 3))
    }
    expect((await listHistory()).map((r) => r.notes)).toEqual(['spot 2', 'spot 1', 'spot 0'])
  })

  it('endActive moves the spot to history and leaves none active', async () => {
    const { record } = await createSpot()
    const ended = await endActive()
    expect(ended?.id).toBe(record.id)
    expect(await getActive()).toBeNull()
    expect(await listHistory()).toHaveLength(1)
  })

  it('endActive with nothing active returns null', async () => {
    expect(await endActive()).toBeNull()
  })

  it('self-heals if storage somehow holds two active spots', async () => {
    const a = await createSpot({ notes: 'a' })
    // Corrupt on purpose: put a second active record straight into the store.
    const { run } = await import('./db')
    await run(
      (db) => db.put('records', { ...a.record, id: 'rogue', createdAt: '2999-01-01T00:00:00.000Z' }),
      { write: true },
    )
    const active = await getActive()
    expect(active?.id).toBe('rogue')
    expect(await getRecord(a.record.id)).toMatchObject({ status: 'history' })
  })
})

describe('undo save', () => {
  it('removes the new spot and restores the previous one as active', async () => {
    const first = await createSpot({ notes: 'first' })
    const second = await createSpot({ notes: 'second' })
    const restored = await undoSave(second.record.id, second.archived!.id)
    expect(restored?.id).toBe(first.record.id)
    expect(restored?.status).toBe('active')
    expect(restored?.endedAt).toBeNull()
    expect((await getActive())?.id).toBe(first.record.id)
    expect(await getRecord(second.record.id)).toBeNull()
    expect(await listHistory()).toHaveLength(0)
  })

  it('works when there was no previous spot', async () => {
    const only = await createSpot()
    expect(await undoSave(only.record.id, null)).toBeNull()
    expect(await getActive()).toBeNull()
  })

  it('also removes the new spot photo', async () => {
    const first = await createSpot()
    const second = await createSpot()
    await setPhoto(second.record.id, new Blob(['x'], { type: 'image/jpeg' }))
    await undoSave(second.record.id, first.record.id)
    expect(await getPhoto(second.record.id)).toBeNull()
  })
})

describe('editing', () => {
  it('updates details and bumps updatedAt, not createdAt or status', async () => {
    const { record } = await createSpot({ ...gps })
    await new Promise((r) => setTimeout(r, 3))
    const updated = await updateSpot(record.id, {
      floorLevel: 'B1',
      latitude: 13,
      longitude: 77.6,
      locationSource: 'adjusted',
    })
    expect(updated.floorLevel).toBe('B1')
    expect(updated.locationSource).toBe('adjusted')
    expect(updated.createdAt).toBe(record.createdAt)
    expect(updated.updatedAt > record.updatedAt).toBe(true)
    expect(updated.status).toBe('active')
    expect(await getRecord(record.id)).toEqual(updated)
  })

  it('cannot change status through updateSpot', async () => {
    const { record } = await createSpot()
    const updated = await updateSpot(record.id, { status: 'history' } as never)
    expect(updated.status).toBe('active')
  })

  it('rejects an invalid edit and leaves the record unchanged', async () => {
    const { record } = await createSpot({ ...gps })
    await expect(updateSpot(record.id, { latitude: 500 })).rejects.toBeInstanceOf(ValidationError)
    expect(await getRecord(record.id)).toEqual(record)
  })

  it('rejects editing a missing record', async () => {
    await expect(updateSpot('nope', { notes: 'x' })).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('photos', () => {
  it('stores, reads, replaces and removes a photo, keeping hasPhoto in sync', async () => {
    const { record } = await createSpot()
    const withPhoto = await setPhoto(record.id, new Blob(['one'], { type: 'image/jpeg' }))
    expect(withPhoto.hasPhoto).toBe(true)
    expect(await (await getPhoto(record.id))!.text()).toBe('one')

    await setPhoto(record.id, new Blob(['two'], { type: 'image/jpeg' }))
    expect(await (await getPhoto(record.id))!.text()).toBe('two')

    const cleared = await removePhoto(record.id)
    expect(cleared?.hasPhoto).toBe(false)
    expect(await getPhoto(record.id)).toBeNull()
  })

  it('rejects a photo for a missing record and stores nothing', async () => {
    await expect(setPhoto('nope', new Blob(['x']))).rejects.toBeInstanceOf(ValidationError)
    expect(await getPhoto('nope')).toBeNull()
  })
})

describe('delete and restore', () => {
  it('deletes the record and its photo, and restore brings both back', async () => {
    const { record } = await createSpot({ notes: 'keep me' })
    await setPhoto(record.id, new Blob(['pic'], { type: 'image/jpeg' }))

    const deleted = await deleteSpot(record.id)
    expect(deleted?.record.notes).toBe('keep me')
    expect(await getRecord(record.id)).toBeNull()
    expect(await getPhoto(record.id)).toBeNull()
    expect(await getActive()).toBeNull()

    const restored = await restoreSpot(deleted!)
    expect(restored.status).toBe('active')
    expect((await getActive())?.id).toBe(record.id)
    expect(await (await getPhoto(record.id))!.text()).toBe('pic')
  })

  it('deleting a missing record returns null', async () => {
    expect(await deleteSpot('nope')).toBeNull()
  })

  it('restoring a deleted active spot becomes history if another spot is now active', async () => {
    const a = await createSpot({ notes: 'a' })
    const deleted = await deleteSpot(a.record.id)
    const b = await createSpot({ notes: 'b' })
    const restored = await restoreSpot(deleted!)
    expect(restored.status).toBe('history')
    expect((await getActive())?.id).toBe(b.record.id)
    expect(await listHistory()).toHaveLength(1)
  })
})

describe('storage failures', () => {
  it('reports unavailable storage as a StorageError', async () => {
    injectStorageFailure('unavailable')
    await expect(createSpot()).rejects.toMatchObject({ name: 'StorageError', code: 'unavailable' })
    await expect(getActive()).rejects.toBeInstanceOf(StorageError)
  })

  it('reports a full device as quota on writes only', async () => {
    const { record } = await createSpot({ notes: 'safe' })
    injectStorageFailure('quota')
    await expect(createSpot()).rejects.toMatchObject({ code: 'quota' })
    await expect(setPhoto(record.id, new Blob(['x']))).rejects.toMatchObject({ code: 'quota' })
    expect((await getActive())?.notes).toBe('safe') // reads still work
  })

  it('recovers once storage works again, with earlier data intact', async () => {
    await createSpot({ notes: 'before' })
    injectStorageFailure('unavailable')
    await expect(createSpot({ notes: 'during' })).rejects.toBeInstanceOf(StorageError)
    injectStorageFailure(null)
    expect((await getActive())?.notes).toBe('before')
    expect((await createSpot({ notes: 'after' })).record.notes).toBe('after')
  })

  it('gives every error a plain-language message', async () => {
    injectStorageFailure('quota')
    const err = await createSpot().catch((e) => e)
    expect(err.userMessage).toMatch(/storage space/i)
  })

  it('maps missing IndexedDB to unavailable', async () => {
    const saved = globalThis.indexedDB
    // @ts-expect-error simulate a browser with IndexedDB blocked
    delete globalThis.indexedDB
    try {
      await expect(createSpot()).rejects.toMatchObject({ code: 'unavailable' })
    } finally {
      globalThis.indexedDB = saved
    }
  })
})

describe('reusing a past record', () => {
  it('copies details and photo into a new active spot and leaves the past record alone', async () => {
    const { record: old } = await createSpot({ ...gps, floorLevel: 'B2', row: 'C', notes: 'by the lift', locationLabel: 'City Mall' })
    await setPhoto(old.id, new Blob(['pic'], { type: 'image/jpeg' }))
    await endActive()
    const past = (await getRecord(old.id))!

    const { record, archived } = await reuseSpot(old.id)
    expect(archived).toBeNull()
    expect(record.id).not.toBe(old.id)
    expect(record.status).toBe('active')
    expect(record.endedAt).toBeNull()
    expect(record.createdAt >= past.createdAt).toBe(true)
    expect(record).toMatchObject({ floorLevel: 'B2', row: 'C', notes: 'by the lift', locationLabel: 'City Mall', latitude: 12.97 })
    expect(record.hasPhoto).toBe(true)
    expect(await (await getPhoto(record.id))!.text()).toBe('pic')

    // The source is untouched and still has its own photo.
    expect(await getRecord(old.id)).toEqual(past)
    expect(await (await getPhoto(old.id))!.text()).toBe('pic')
    expect((await getActive())!.id).toBe(record.id)
  })

  it('moves the current active spot to history in the same step, and Undo brings it back', async () => {
    const { record: old } = await createSpot({ ...gps, locationLabel: 'Old place' })
    await endActive()
    const { record: current } = await createSpot({ locationSource: 'manual', locationLabel: 'Current place' })

    const { record, archived } = await reuseSpot(old.id)
    expect(archived!.id).toBe(current.id)
    expect((await getActive())!.id).toBe(record.id)
    expect((await getRecord(current.id))!.status).toBe('history')

    await undoSave(record.id, archived!.id)
    expect((await getActive())!.id).toBe(current.id)
    expect(await getRecord(record.id)).toBeNull()
    expect(await getPhoto(record.id)).toBeNull()
    expect((await getRecord(old.id))!.status).toBe('history')
  })

  it('never leaves two active records', async () => {
    const { record: a } = await createSpot(gps)
    await endActive()
    await createSpot({ locationSource: 'manual', locationLabel: 'b' })
    await reuseSpot(a.id)
    const history = await listHistory()
    expect(history.every((r) => r.status === 'history')).toBe(true)
    expect(history).toHaveLength(2)
  })

  it('refuses a missing or already active record and changes nothing', async () => {
    const { record } = await createSpot(gps)
    await expect(reuseSpot(record.id)).rejects.toBeInstanceOf(ValidationError)
    await expect(reuseSpot('nope')).rejects.toBeInstanceOf(ValidationError)
    expect((await getActive())!.id).toBe(record.id)
    expect(await listHistory()).toHaveLength(0)
  })

  it('reports a storage failure as a StorageError and changes nothing', async () => {
    const { record: old } = await createSpot(gps)
    await endActive()
    injectStorageFailure('quota')
    await expect(reuseSpot(old.id)).rejects.toBeInstanceOf(StorageError)
    injectStorageFailure(null)
    expect(await getActive()).toBeNull()
    expect(await listHistory()).toHaveLength(1)
  })
})
