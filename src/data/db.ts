import { deleteDB, openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import { StorageError, ValidationError } from './types'
import type { ParkingRecord } from './types'

const DB_NAME = 'parked-where'
const DB_VERSION = 1

interface Schema extends DBSchema {
  records: {
    key: string
    value: ParkingRecord
    indexes: { status: string }
  }
  photos: {
    key: string
    value: Blob
  }
}

export type Db = IDBPDatabase<Schema>

let dbPromise: Promise<Db> | null = null

/** Test hook: make the next operations fail as if storage were broken. */
export type InjectedFailure = 'unavailable' | 'quota' | null
let injected: InjectedFailure = null
export function injectStorageFailure(mode: InjectedFailure) {
  injected = mode
}

function toStorageError(e: unknown): StorageError {
  if (e instanceof StorageError) return e
  const name = e instanceof Error ? e.name : ''
  if (name === 'QuotaExceededError') return new StorageError('quota', e)
  if (name === 'SecurityError' || name === 'InvalidStateError' || name === 'NotSupportedError') {
    return new StorageError('unavailable', e)
  }
  return new StorageError('unknown', e)
}

function getDb(): Promise<Db> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new StorageError('unavailable'))
  }
  dbPromise ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const records = db.createObjectStore('records', { keyPath: 'id' })
      records.createIndex('status', 'status')
      db.createObjectStore('photos')
    },
  }).catch((e) => {
    dbPromise = null // allow a retry after a failed open
    throw toStorageError(e)
  })
  return dbPromise
}

/** Run a database operation, converting any failure into a StorageError. */
export async function run<T>(fn: (db: Db) => Promise<T>, opts: { write: boolean }): Promise<T> {
  if (injected === 'unavailable') throw new StorageError('unavailable')
  if (injected === 'quota' && opts.write) throw new StorageError('quota')
  try {
    return await fn(await getDb())
  } catch (e) {
    if (e instanceof ValidationError) throw e // a rule was broken, not storage
    throw toStorageError(e)
  }
}

/** Close the connection and delete the database. Used by tests and delete-all. */
export async function destroyDatabase(): Promise<void> {
  if (dbPromise) {
    try {
      ;(await dbPromise).close()
    } catch {
      /* ignore */
    }
    dbPromise = null
  }
  if (typeof indexedDB !== 'undefined') await deleteDB(DB_NAME)
}

/** Ask the browser not to evict our data (amendment A9). Never throws. */
export async function requestPersistence(): Promise<'granted' | 'denied' | 'unsupported'> {
  try {
    if (!navigator.storage?.persist) return 'unsupported'
    if (await navigator.storage.persisted()) return 'granted'
    return (await navigator.storage.persist()) ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}
