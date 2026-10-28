import { run } from './db'
import { ValidationError } from './types'
import type { DeletedSpot, ParkingRecord, SpotInput } from './types'
import { buildFields, pickFields } from './validate'

/*
 * Rule: at most one record has status 'active'. Every operation that could
 * create an active record archives the others inside the same transaction.
 */

const now = () => new Date().toISOString()

function newestFirst(a: ParkingRecord, b: ParkingRecord) {
  const ka = a.endedAt ?? a.createdAt
  const kb = b.endedAt ?? b.createdAt
  return ka < kb ? 1 : ka > kb ? -1 : 0
}

/**
 * Save a new active spot. Any current active spot moves to history (amendment A4).
 * Returns the archived record so the caller can offer Undo.
 */
export async function createSpot(
  input: SpotInput = {},
): Promise<{ record: ParkingRecord; archived: ParkingRecord | null }> {
  const fields = buildFields(null, input) // validate before touching storage
  return run(
    async (db) => {
      const tx = db.transaction('records', 'readwrite')
      const store = tx.objectStore('records')
      const stamp = now()

      const active = await store.index('status').getAll('active')
      active.sort(newestFirst)
      const archivedList: ParkingRecord[] = []
      for (const old of active) {
        const moved: ParkingRecord = { ...old, status: 'history', endedAt: stamp, updatedAt: stamp }
        await store.put(moved)
        archivedList.push(moved)
      }

      const record: ParkingRecord = {
        id: crypto.randomUUID(),
        createdAt: stamp,
        updatedAt: stamp,
        status: 'active',
        endedAt: null,
        hasPhoto: false,
        ...fields,
      }
      await store.put(record)
      await tx.done
      return { record, archived: archivedList[0] ?? null }
    },
    { write: true },
  )
}

/**
 * "Reuse as new spot": copy a past record's place, details and photo into a brand-new
 * active spot. The past record stays in history untouched, and any current active spot
 * moves to history in the same transaction. Returns the archived record for Undo.
 */
export async function reuseSpot(
  sourceId: string,
): Promise<{ record: ParkingRecord; archived: ParkingRecord | null }> {
  return run(
    async (db) => {
      const tx = db.transaction(['records', 'photos'], 'readwrite')
      const store = tx.objectStore('records')
      const source = await store.get(sourceId)
      if (!source) throw new ValidationError('That spot no longer exists.')
      if (source.status === 'active') throw new ValidationError('That spot is already your current spot.')

      const stamp = now()
      const active = await store.index('status').getAll('active')
      active.sort(newestFirst)
      const archivedList: ParkingRecord[] = []
      for (const old of active) {
        const moved: ParkingRecord = { ...old, status: 'history', endedAt: stamp, updatedAt: stamp }
        await store.put(moved)
        archivedList.push(moved)
      }

      const photo = source.hasPhoto ? ((await tx.objectStore('photos').get(sourceId)) ?? null) : null
      const record: ParkingRecord = {
        id: crypto.randomUUID(),
        createdAt: stamp,
        updatedAt: stamp,
        status: 'active',
        endedAt: null,
        hasPhoto: photo !== null,
        ...pickFields(source),
      }
      await store.put(record)
      if (photo) await tx.objectStore('photos').put(photo, record.id)
      await tx.done
      return { record, archived: archivedList[0] ?? null }
    },
    { write: true },
  )
}

/** Undo a save: remove the new spot and make the previously active one active again. */
export async function undoSave(newId: string, archivedId: string | null): Promise<ParkingRecord | null> {
  return run(
    async (db) => {
      const tx = db.transaction(['records', 'photos'], 'readwrite')
      const records = tx.objectStore('records')
      await records.delete(newId)
      await tx.objectStore('photos').delete(newId)

      let restored: ParkingRecord | null = null
      if (archivedId) {
        const old = await records.get(archivedId)
        if (old) {
          restored = { ...old, status: 'active', endedAt: null, updatedAt: now() }
          await records.put(restored)
        }
      }
      await tx.done
      return restored
    },
    { write: true },
  )
}

/**
 * The active spot, or null. Reading works even when storage is full. If storage
 * ever holds several active records, keep the newest and archive the rest.
 */
export async function getActive(): Promise<ParkingRecord | null> {
  const active = await run((db) => db.getAllFromIndex('records', 'status', 'active'), { write: false })
  active.sort(newestFirst)
  const [keep, ...extras] = active
  if (extras.length > 0) {
    await run(
      async (db) => {
        const tx = db.transaction('records', 'readwrite')
        const stamp = now()
        for (const extra of extras) {
          await tx.store.put({ ...extra, status: 'history', endedAt: stamp, updatedAt: stamp })
        }
        await tx.done
      },
      { write: true },
    )
  }
  return keep ?? null
}

/** Past records, newest first. */
export async function listHistory(): Promise<ParkingRecord[]> {
  return run(
    async (db) => {
      const list = await db.getAllFromIndex('records', 'status', 'history')
      return list.sort(newestFirst)
    },
    { write: false },
  )
}

export async function getRecord(id: string): Promise<ParkingRecord | null> {
  return run(async (db) => (await db.get('records', id)) ?? null, { write: false })
}

/** Edit a spot's details. Status, id and timestamps cannot be changed here. */
export async function updateSpot(id: string, patch: SpotInput): Promise<ParkingRecord> {
  return run(
    async (db) => {
      const tx = db.transaction('records', 'readwrite')
      const store = tx.objectStore('records')
      const current = await store.get(id)
      if (!current) throw new ValidationError('That spot no longer exists.')
      const fields = buildFields(pickFields(current), patch)
      const updated: ParkingRecord = { ...current, ...fields, updatedAt: now() }
      await store.put(updated)
      await tx.done
      return updated
    },
    { write: true },
  )
}

/** End the active session ("I found it"): the spot moves to history. */
export async function endActive(): Promise<ParkingRecord | null> {
  return run(
    async (db) => {
      const tx = db.transaction('records', 'readwrite')
      const store = tx.objectStore('records')
      const active = await store.index('status').getAll('active')
      const stamp = now()
      let last: ParkingRecord | null = null
      for (const r of active) {
        last = { ...r, status: 'history', endedAt: stamp, updatedAt: stamp }
        await store.put(last)
      }
      await tx.done
      return last
    },
    { write: true },
  )
}

/** Delete a record and its photo. Returns what was removed so the caller can offer Undo. */
export async function deleteSpot(id: string): Promise<DeletedSpot | null> {
  return run(
    async (db) => {
      const tx = db.transaction(['records', 'photos'], 'readwrite')
      const record = await tx.objectStore('records').get(id)
      if (!record) {
        await tx.done
        return null
      }
      const photo = (await tx.objectStore('photos').get(id)) ?? null
      await tx.objectStore('records').delete(id)
      await tx.objectStore('photos').delete(id)
      await tx.done
      return { record, photo }
    },
    { write: true },
  )
}

/**
 * Undo a delete. If a different spot became active in the meantime, the restored
 * record comes back as history so the one-active rule holds.
 */
export async function restoreSpot(deleted: DeletedSpot): Promise<ParkingRecord> {
  return run(
    async (db) => {
      const tx = db.transaction(['records', 'photos'], 'readwrite')
      const records = tx.objectStore('records')
      let record = deleted.record
      if (record.status === 'active') {
        const others = await records.index('status').getAll('active')
        if (others.some((o) => o.id !== record.id)) {
          record = { ...record, status: 'history', endedAt: record.endedAt ?? now() }
        }
      }
      await records.put(record)
      if (deleted.photo) await tx.objectStore('photos').put(deleted.photo, record.id)
      await tx.done
      return record
    },
    { write: true },
  )
}

/** Store or replace a spot's photo. The record's hasPhoto flag changes in the same transaction. */
export async function setPhoto(id: string, photo: Blob): Promise<ParkingRecord> {
  return run(
    async (db) => {
      const tx = db.transaction(['records', 'photos'], 'readwrite')
      const records = tx.objectStore('records')
      const current = await records.get(id)
      if (!current) throw new ValidationError('That spot no longer exists.')
      await tx.objectStore('photos').put(photo, id)
      const updated = { ...current, hasPhoto: true, updatedAt: now() }
      await records.put(updated)
      await tx.done
      return updated
    },
    { write: true },
  )
}

export async function removePhoto(id: string): Promise<ParkingRecord | null> {
  return run(
    async (db) => {
      const tx = db.transaction(['records', 'photos'], 'readwrite')
      const records = tx.objectStore('records')
      await tx.objectStore('photos').delete(id)
      const current = await records.get(id)
      let updated: ParkingRecord | null = null
      if (current) {
        updated = { ...current, hasPhoto: false, updatedAt: now() }
        await records.put(updated)
      }
      await tx.done
      return updated
    },
    { write: true },
  )
}

export async function getPhoto(id: string): Promise<Blob | null> {
  return run(async (db) => (await db.get('photos', id)) ?? null, { write: false })
}
