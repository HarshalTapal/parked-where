import { useCallback, useState } from 'react'
import { Button } from '../components/Button'
import { MapPanel } from '../components/MapPanel'
import { StorageErrorNotice } from '../components/StorageErrorNotice'
import { updateSpot } from '../data/records'
import { StorageError, ValidationError } from '../data/types'
import type { ParkingRecord } from '../data/types'
import { coordsText } from '../lib/directions'
import { distanceMeters, offsetPoint } from '../lib/geo'

type Props = {
  record: ParkingRecord
  onBack: () => void
  onSaved: (updated: ParkingRecord) => void
}

const STEP_M = 10

export default function AdjustPin({ record, onBack, onSaved }: Props) {
  const startLat = record.latitude ?? 0
  const startLon = record.longitude ?? 0
  const [pos, setPos] = useState({ latitude: startLat, longitude: startLon })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moved = distanceMeters(startLat, startLon, pos.latitude, pos.longitude)
  const changed = moved > 0.5

  const onMove = useCallback((latitude: number, longitude: number) => setPos({ latitude, longitude }), [])

  function nudge(northM: number, eastM: number) {
    setPos((p) => offsetPoint(p.latitude, p.longitude, northM, eastM))
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      // A hand-placed pin has no GPS accuracy, so the old figure is cleared rather than kept.
      const updated = await updateSpot(record.id, {
        latitude: pos.latitude,
        longitude: pos.longitude,
        locationSource: 'adjusted',
        locationAccuracyMeters: null,
      })
      onSaved(updated)
    } catch (e) {
      setError(
        e instanceof StorageError ? e.userMessage : e instanceof ValidationError ? e.message : 'Something went wrong while saving. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen">
      <div>
        <Button variant="subtle" onClick={onBack}>
          ← Back
        </Button>
      </div>
      <h1 className="t-display-lg">Adjust pin</h1>
      <p className="t-body-md t-secondary">Drag the pin, or tap the map, to where you parked. You can also nudge it with the buttons.</p>

      <MapPanel
        latitude={pos.latitude}
        longitude={pos.longitude}
        accuracyMeters={record.locationAccuracyMeters}
        title="Draggable pin showing where you parked"
        draggable
        onMove={onMove}
      />

      <div className="stack">
        <p className="t-body-sm-strong" data-testid="pin-coords">
          {coordsText(pos.latitude, pos.longitude)}
        </p>
        <p className="t-body-sm t-secondary" aria-live="polite" data-testid="pin-moved">
          {changed ? `Moved ${Math.round(moved)} m from the saved spot.` : 'Not moved yet.'}
        </p>
      </div>

      <div className="nudge" role="group" aria-label={`Move the pin ${STEP_M} metres`}>
        <Button variant="subtle" aria-label={`Move pin ${STEP_M} metres north`} onClick={() => nudge(STEP_M, 0)}>
          ↑ North
        </Button>
        <Button variant="subtle" aria-label={`Move pin ${STEP_M} metres south`} onClick={() => nudge(-STEP_M, 0)}>
          ↓ South
        </Button>
        <Button variant="subtle" aria-label={`Move pin ${STEP_M} metres east`} onClick={() => nudge(0, STEP_M)}>
          → East
        </Button>
        <Button variant="subtle" aria-label={`Move pin ${STEP_M} metres west`} onClick={() => nudge(0, -STEP_M)}>
          ← West
        </Button>
      </div>

      {error && <StorageErrorNotice message={error} onRetry={() => void save()} />}

      <div className="sheet-actions">
        <Button block disabled={!changed || busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save pin'}
        </Button>
        <Button block variant="subtle" disabled={busy} onClick={onBack}>
          Cancel
        </Button>
      </div>
    </main>
  )
}
