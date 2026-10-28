import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { AlertIcon, PinIcon } from '../components/Icons'
import { ParkedCarArt } from '../components/Illustrations'
import { SpotClues } from '../components/SpotClues'
import { clockTime, formatAccuracy, formatCoords, timeAgo } from '../lib/format'
import { isApproximate } from '../lib/geolocation'
import { isStale, staleMessage } from '../lib/stale'
import type { ParkingRecord } from '../data/types'

type HomeProps = {
  active: ParkingRecord | null
  onSave: () => void
  onEdit: () => void
  onFind: () => void
}

function locationSummary(r: ParkingRecord): string {
  if (r.locationLabel) return r.locationLabel
  if (r.latitude !== null && r.longitude !== null) return 'Location saved, not named'
  return 'No location saved'
}

function ActiveSpot({ active, onSave, onEdit, onFind }: Omit<HomeProps, 'active'> & { active: ParkingRecord }) {
  const hasCoords = active.latitude !== null && active.longitude !== null
  const approximate = isApproximate(active.locationAccuracyMeters)

  return (
    <main className="screen screen--with-tabs">
      <h1 className="t-display-lg">Your parked vehicle</h1>
      <Card variant="elevated" data-testid="active-card">
        <div className="stack">
          <span className="badge badge--ink">Active spot</span>

          {isStale(active.createdAt) && (
            <p className="status-line" role="status" data-testid="stale">
              <AlertIcon />
              <span>{staleMessage(active.createdAt)}</span>
            </p>
          )}

          <SpotClues record={active} />

          <h2 className="t-display-sm" data-testid="active-label">
            {locationSummary(active)}
          </h2>

          {hasCoords && active.locationSource === 'adjusted' && (
            <p className="t-body-md" data-testid="active-adjusted">
              Pin placed by hand
            </p>
          )}
          {hasCoords && active.locationSource !== 'adjusted' && active.locationAccuracyMeters !== null && (
            <p className="t-body-md" data-testid="active-accuracy">
              {approximate ? 'Approximate location' : 'Location'} {formatAccuracy(active.locationAccuracyMeters)}
            </p>
          )}
          {hasCoords && (
            <p className="t-body-sm t-secondary" data-testid="active-coords">
              {formatCoords(active.latitude!, active.longitude!)}
            </p>
          )}
          {!hasCoords && (
            <p className="t-body-sm t-secondary" data-testid="active-nocoords">
              Entered by hand. There are no map coordinates for this spot.
            </p>
          )}
          <p className="t-body-sm t-secondary" data-testid="active-time">
            Saved {timeAgo(active.createdAt)} · {clockTime(active.createdAt)}
          </p>
        </div>
      </Card>
      <Button block onClick={onFind}>
        <PinIcon /> Find my vehicle
      </Button>
      <Button block variant="secondary" onClick={onSave}>
        Save a new spot
      </Button>
      <Button block variant="subtle" onClick={onEdit}>
        Edit details
      </Button>
      <p className="t-caption t-secondary">Saving a new spot moves this one to history.</p>
    </main>
  )
}

export default function Home({ active, onSave, onEdit, onFind }: HomeProps) {
  if (active) return <ActiveSpot active={active} onSave={onSave} onEdit={onEdit} onFind={onFind} />

  return (
    <main className="screen screen--with-tabs">
      <EmptyState
        art={<ParkedCarArt title="A car parked beside a location pin" />}
        title="No parking saved"
        text="Tap Save parking when you leave your vehicle. We save the spot on a map and let you add a photo and floor, row or bay."
        action={
          <Button block onClick={onSave}>
            <PinIcon /> Save parking
          </Button>
        }
      />
      <p className="t-body-sm t-secondary">
        Location is used once, when you tap Save. If you would rather not share it, you can type where
        you parked instead.
      </p>
    </main>
  )
}
