import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Chip } from '../components/Chip'
import { AlertIcon, CameraIcon, PinIcon } from '../components/Icons'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { StorageErrorNotice } from '../components/StorageErrorNotice'
import { Textarea } from '../components/Textarea'
import { removePhoto, setPhoto, updateSpot } from '../data/records'
import { StorageError, ValidationError } from '../data/types'
import type { ParkingRecord, SpotInput } from '../data/types'
import { FLOOR_CHIPS, FLOOR_OTHER, composeFloor, parseFloor } from '../lib/floor'
import { formatAccuracy } from '../lib/format'
import { isApproximate } from '../lib/geolocation'
import { PhotoError, downscaleImage } from '../lib/photo'
import { usePhotoUrl } from '../lib/usePhotoUrl'
import AdjustPin from './AdjustPin'

type Props = {
  record: ParkingRecord
  /** True right after saving: shows the success header and "Skip for now". */
  fresh: boolean
  onDone: (updated: ParkingRecord | null) => void
}

type PhotoChange = { kind: 'none' } | { kind: 'new'; blob: Blob; url: string } | { kind: 'removed' }

export default function DetailsSheet({ record, fresh, onDone }: Props) {
  const [floor, setFloor] = useState(() => parseFloor(record.floorLevel))
  const [zone, setZone] = useState(record.zone)
  const [row, setRow] = useState(record.row)
  const [bay, setBay] = useState(record.bayOrPillar)
  const [notes, setNotes] = useState(record.notes)
  // The label can arrive late (address lookup). Until the user types, follow the record.
  const [labelDraft, setLabelDraft] = useState<string | null>(null)
  const label = labelDraft ?? record.locationLabel

  const [photo, setPhotoChange] = useState<PhotoChange>({ kind: 'none' })
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // The pin is saved on its own screen. The sheet stays mounted underneath, so nothing typed is lost.
  const [adjusting, setAdjusting] = useState(false)
  const [pinned, setPinned] = useState<ParkingRecord | null>(null)

  const storedUrl = usePhotoUrl(record.id, record.hasPhoto, record.updatedAt)
  const photoUrl = photo.kind === 'new' ? photo.url : photo.kind === 'removed' ? null : storedUrl

  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)

  // Free the preview URL of a picked photo when it is replaced or the sheet closes.
  useEffect(() => {
    if (photo.kind !== 'new') return
    const url = photo.url
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const floorValue = composeFloor(floor)
  const dirty =
    floorValue !== record.floorLevel ||
    zone !== record.zone ||
    row !== record.row ||
    bay !== record.bayOrPillar ||
    notes !== record.notes ||
    labelDraft !== null ||
    photo.kind !== 'none'

  async function onPick(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setPhotoError(null)
    setProcessing(true)
    try {
      const blob = await downscaleImage(file)
      setPhotoChange({ kind: 'new', blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      setPhotoError(e instanceof PhotoError ? e.userMessage : "We couldn't use that photo. You can still save without it.")
    } finally {
      setProcessing(false)
    }
  }

  async function save() {
    setBusy(true)
    setSaveError(null)
    try {
      // Write only what changed, so a late-arriving address is never overwritten by an old value.
      const patch: SpotInput = {}
      if (floorValue !== record.floorLevel) patch.floorLevel = floorValue
      if (zone !== record.zone) patch.zone = zone
      if (row !== record.row) patch.row = row
      if (bay !== record.bayOrPillar) patch.bayOrPillar = bay
      if (notes !== record.notes) patch.notes = notes
      if (labelDraft !== null) patch.locationLabel = labelDraft

      let updated = pinned ?? record
      if (Object.keys(patch).length > 0) updated = await updateSpot(record.id, patch)
      if (photo.kind === 'new') updated = await setPhoto(record.id, photo.blob)
      else if (photo.kind === 'removed' && record.hasPhoto) updated = (await removePhoto(record.id)) ?? updated
      onDone(updated)
    } catch (e) {
      // Everything typed stays on screen; the retry button runs this same save again.
      setSaveError(
        e instanceof StorageError
          ? e.userMessage
          : e instanceof ValidationError
            ? e.message
            : 'Something went wrong while saving. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  // A moved pin is already stored, so closing without saving the rest still reports it.
  function leave() {
    if (dirty) setConfirmDiscard(true)
    else onDone(pinned)
  }

  if (adjusting) {
    return (
      <AdjustPin
        record={pinned ?? record}
        onBack={() => setAdjusting(false)}
        onSaved={(updated) => {
          setPinned(updated)
          setAdjusting(false)
        }}
      />
    )
  }

  const hasCoords = record.latitude !== null
  const savedLine = hasCoords
    ? `${isApproximate(record.locationAccuracyMeters) ? 'Approximate location' : 'Location'} ${formatAccuracy(record.locationAccuracyMeters ?? 0)}`
    : 'Saved without map coordinates'

  return (
    <main className="screen">
      <div className="stack">
        {fresh ? (
          <>
            <span className="badge badge--ink" data-testid="saved-badge">
              Spot saved
            </span>
            <h1 className="t-display-lg">Add details to find it faster</h1>
            <p className="t-body-md t-secondary">
              {savedLine}. Everything below is optional. Your spot is already saved.
            </p>
          </>
        ) : (
          <h1 className="t-display-lg">Edit details</h1>
        )}
      </div>

      <section className="stack" aria-labelledby="floor-h">
        <h2 id="floor-h" className="t-body-md-strong">
          Floor or level
        </h2>
        <div className="chip-row" role="group" aria-labelledby="floor-h">
          {[...FLOOR_CHIPS, FLOOR_OTHER].map((f) => (
            <Chip
              key={f}
              selected={floor.choice === f}
              onClick={() => setFloor(floor.choice === f ? { choice: '', other: '' } : { choice: f, other: floor.other })}
            >
              {f}
            </Chip>
          ))}
        </div>
        {floor.choice === FLOOR_OTHER && (
          <Input
            label="Other floor or level"
            value={floor.other}
            maxLength={40}
            placeholder="e.g. Roof, P2"
            onChange={(e) => setFloor({ choice: FLOOR_OTHER, other: e.target.value })}
          />
        )}
      </section>

      <section className="stack" aria-labelledby="photo-h">
        <h2 id="photo-h" className="t-body-md-strong">
          Photo
        </h2>
        {photoUrl ? (
          <div className="photo-frame">
            <img src={photoUrl} alt="Photo of where you parked" data-testid="photo-preview" />
          </div>
        ) : (
          <Card variant="soft">
            <p className="t-body-sm">
              A photo of the nearest pillar, sign or lift helps most. No photo? That is fine.
            </p>
          </Card>
        )}
        <div className="photo-actions">
          <Button variant="secondary" disabled={processing} onClick={() => cameraInput.current?.click()}>
            <CameraIcon /> {photoUrl ? 'Retake photo' : 'Take a photo'}
          </Button>
          <Button variant="subtle" disabled={processing} onClick={() => libraryInput.current?.click()}>
            Choose from library
          </Button>
          {photoUrl && (
            <Button variant="subtle" onClick={() => setPhotoChange({ kind: 'removed' })}>
              Remove photo
            </Button>
          )}
        </div>
        {processing && (
          <p className="t-body-sm t-secondary" role="status">
            Preparing photo…
          </p>
        )}
        {photoError && (
          <p className="status-line" role="alert" data-testid="photo-error">
            <AlertIcon />
            <span>{photoError}</span>
          </p>
        )}
        {/* Camera-first on phones; the second input opens the photo library. */}
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          data-testid="camera-input"
          onChange={(e) => {
            void onPick(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={libraryInput}
          type="file"
          accept="image/*"
          hidden
          data-testid="library-input"
          onChange={(e) => {
            void onPick(e.target.files)
            e.target.value = ''
          }}
        />
      </section>

      <section className="stack stack--lg" aria-label="Where exactly">
        <Input label="Zone" value={zone} maxLength={60} placeholder="e.g. Blue zone" onChange={(e) => setZone(e.target.value)} />
        <Input label="Row" value={row} maxLength={60} placeholder="e.g. C" onChange={(e) => setRow(e.target.value)} />
        <Input
          label="Bay or pillar number"
          value={bay}
          maxLength={60}
          placeholder="e.g. P14"
          onChange={(e) => setBay(e.target.value)}
        />
        <Textarea
          label="Notes"
          value={notes}
          maxLength={1000}
          placeholder="e.g. Next to the red fire exit"
          onChange={(e) => setNotes(e.target.value)}
        />
        <Input
          label="Place name"
          value={label}
          maxLength={200}
          hint={hasCoords ? 'Looked up from the map when possible. Edit it if it is wrong.' : 'Where you parked.'}
          onChange={(e) => setLabelDraft(e.target.value)}
        />
        {hasCoords && (
          <div className="stack">
            <div>
              <Button variant="secondary" onClick={() => setAdjusting(true)} data-testid="adjust-from-sheet">
                <PinIcon /> Adjust pin on map
              </Button>
            </div>
            {pinned && (
              <p className="t-body-sm t-secondary" role="status" data-testid="pin-updated">
                Pin moved and saved.
              </p>
            )}
          </div>
        )}
      </section>

      {saveError && <StorageErrorNotice message={saveError} onRetry={() => void save()} />}

      <div className="sheet-actions">
        <Button block disabled={busy || processing} onClick={() => void save()}>
          {busy ? 'Saving…' : fresh ? 'Done' : 'Save changes'}
        </Button>
        <Button block variant="subtle" disabled={busy} onClick={leave}>
          {fresh ? 'Skip for now' : 'Cancel'}
        </Button>
      </div>

      <Modal
        open={confirmDiscard}
        title="Discard your changes?"
        onClose={() => setConfirmDiscard(false)}
        actions={
          <>
            <Button block onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </Button>
            <Button block variant="secondary" onClick={() => onDone(pinned)}>
              Discard
            </Button>
          </>
        }
      >
        {fresh ? 'Your spot stays saved, but these details will not be added.' : 'These edits will not be saved.'}
      </Modal>
    </main>
  )
}
