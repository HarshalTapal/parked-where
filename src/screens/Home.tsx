import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PinIcon } from '../components/Icons'
import { ParkedCarArt } from '../components/Illustrations'
import { clockTime, formatAccuracy, formatCoords, timeAgo } from '../lib/format'
import { isApproximate } from '../lib/geolocation'
import { usePhotoUrl } from '../lib/usePhotoUrl'
import type { ParkingRecord } from '../data/types'

type HomeProps = {
  active: ParkingRecord | null
  onSave: () => void
  onEdit: () => void
}

function locationSummary(r: ParkingRecord): string {
  if (r.locationLabel) return r.locationLabel
  if (r.latitude !== null && r.longitude !== null) return 'Location saved, not named'
  return 'No location saved'
}

function ActiveSpot({ active, onSave, onEdit }: { active: ParkingRecord; onSave: () => void; onEdit: () => void }) {
  const photoUrl = usePhotoUrl(active.id, active.hasPhoto, active.updatedAt)
  const hasCoords = active.latitude !== null && active.longitude !== null
  const approximate = isApproximate(active.locationAccuracyMeters)
  const clues = [
    ['Floor', active.floorLevel],
    ['Zone', active.zone],
    ['Row', active.row],
    ['Bay / pillar', active.bayOrPillar],
  ].filter(([, value]) => value)

  return (
    <main className="screen screen--with-tabs">
      <h1 className="t-display-lg">Your parked vehicle</h1>
      <Card variant="elevated" data-testid="active-card">
        <div className="stack">
          <span className="badge badge--ink">Active spot</span>

          {active.hasPhoto && (
            <div className="photo-frame">
              {photoUrl && <img src={photoUrl} alt="Photo of where you parked" data-testid="active-photo" />}
            </div>
          )}

          {clues.length > 0 && (
            <dl className="clues" data-testid="active-clues">
              {clues.map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {active.notes && (
            <p className="t-body-md" data-testid="active-notes">
              {active.notes}
            </p>
          )}

          <h2 className="t-display-sm" data-testid="active-label">
            {locationSummary(active)}
          </h2>

          {hasCoords && active.locationAccuracyMeters !== null && (
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
      <Button block onClick={onSave}>
        <PinIcon /> Save a new spot
      </Button>
      <Button block variant="secondary" onClick={onEdit}>
        Edit details
      </Button>
      <p className="t-caption t-secondary">
        Saving a new spot moves this one to history. Directions arrive in a later step of the build.
      </p>
    </main>
  )
}

export default function Home({ active, onSave, onEdit }: HomeProps) {
  if (active) return <ActiveSpot active={active} onSave={onSave} onEdit={onEdit} />

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
