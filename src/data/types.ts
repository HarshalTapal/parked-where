export type LocationSource = 'gps' | 'adjusted' | 'manual' | 'none'

export type ParkingRecord = {
  id: string // crypto.randomUUID()
  createdAt: string // ISO-8601
  updatedAt: string
  status: 'active' | 'history'
  endedAt: string | null // when moved to history
  latitude: number | null
  longitude: number | null
  locationAccuracyMeters: number | null
  locationSource: LocationSource
  locationLabel: string // address, landmark or manual text
  floorLevel: string
  zone: string
  row: string
  bayOrPillar: string
  notes: string
  hasPhoto: boolean // photo Blob stored separately under the same id
}

/** Fields a caller may set. Identity, status and timestamps are managed by the data layer. */
export type SpotFields = Pick<
  ParkingRecord,
  | 'latitude'
  | 'longitude'
  | 'locationAccuracyMeters'
  | 'locationSource'
  | 'locationLabel'
  | 'floorLevel'
  | 'zone'
  | 'row'
  | 'bayOrPillar'
  | 'notes'
>

export type SpotInput = Partial<SpotFields>

export type DeletedSpot = { record: ParkingRecord; photo: Blob | null }

export type StorageErrorCode = 'unavailable' | 'quota' | 'unknown'

const MESSAGES: Record<StorageErrorCode, string> = {
  unavailable:
    'This browser is not letting the app store data. Private browsing or blocked site data can cause this. Your entries are still on screen.',
  quota: 'This device is out of storage space. Free some space or remove the photo, then try again.',
  unknown: 'Something went wrong while saving. Your entries are still on screen. Please try again.',
}

/** Storage failed. Always recoverable from the user's side: nothing entered is discarded. */
export class StorageError extends Error {
  readonly code: StorageErrorCode
  readonly userMessage: string
  constructor(code: StorageErrorCode, cause?: unknown) {
    super(`Storage error: ${code}`, { cause })
    this.name = 'StorageError'
    this.code = code
    this.userMessage = MESSAGES[code]
  }
}

/** The caller supplied data the rules reject. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
