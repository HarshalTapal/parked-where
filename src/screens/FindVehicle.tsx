import { useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { AlertIcon } from '../components/Icons'
import { Input } from '../components/Input'
import { LinkButton } from '../components/LinkButton'
import { MapPanel } from '../components/MapPanel'
import { SpotClues } from '../components/SpotClues'
import type { ParkingRecord } from '../data/types'
import { copyText } from '../lib/clipboard'
import { appleMapsUrl, coordsText, googleMapsUrl, osmDirectionsUrl, shareText } from '../lib/directions'
import { clockTime, formatAccuracy, timeAgo } from '../lib/format'
import { isApproximate } from '../lib/geolocation'
import { isStale, staleMessage } from '../lib/stale'
import { useOnline } from '../lib/useOnline'

type Props = {
  record: ParkingRecord
  onBack: () => void
  onAdjust: () => void
  onEdit: () => void
}

function accuracyMessage(r: ParkingRecord): string {
  if (r.locationSource === 'adjusted') return 'You placed this pin by hand.'
  const acc = r.locationAccuracyMeters
  if (acc === null) return 'No accuracy figure was recorded for this pin.'
  if (isApproximate(acc)) {
    return `Approximate location (${formatAccuracy(acc)}). Your vehicle could be anywhere inside the circle on the map, so rely on the photo and details above once you arrive.`
  }
  return `GPS accuracy ${formatAccuracy(acc)} when you saved. The pin is within about that distance of your phone at the time.`
}

export default function FindVehicle({ record, onBack, onAdjust, onEdit }: Props) {
  const online = useOnline()
  const [note, setNote] = useState('')
  const hasCoords = record.latitude !== null && record.longitude !== null
  const lat = record.latitude ?? 0
  const lon = record.longitude ?? 0
  const coords = hasCoords ? coordsText(lat, lon) : ''
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy(text: string, what: string) {
    setNote((await copyText(text)) ? `${what} copied.` : `Could not copy automatically. Select the ${what.toLowerCase()} and copy it.`)
  }

  async function share() {
    try {
      await navigator.share({
        title: 'Where I parked',
        text: shareText(record),
        ...(hasCoords ? { url: googleMapsUrl(lat, lon) } : {}),
      })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setNote('Sharing did not work on this device.')
    }
  }

  return (
    <main className="screen">
      <div>
        <Button variant="subtle" onClick={onBack}>
          ← Back
        </Button>
      </div>
      <h1 className="t-display-lg">Find my vehicle</h1>

      {isStale(record.createdAt) && (
        <Card variant="soft" role="status" data-testid="stale">
          <p className="status-line">
            <AlertIcon />
            <span>{staleMessage(record.createdAt)}</span>
          </p>
        </Card>
      )}

      <SpotClues record={record} />

      <div className="stack">
        <h2 className="t-display-sm" data-testid="find-label">
          {record.locationLabel || (hasCoords ? 'Location saved, not named' : 'No location saved')}
        </h2>
        <p className="t-body-sm t-secondary">
          Saved {timeAgo(record.createdAt)} · {clockTime(record.createdAt)}
        </p>
      </div>

      {hasCoords ? (
        <>
          {!online && (
            <p className="status-line" role="status" data-testid="offline-note">
              <AlertIcon />
              <span>You are offline. Your details and coordinates still work. The map and directions need a connection.</span>
            </p>
          )}
          <MapPanel
            latitude={lat}
            longitude={lon}
            accuracyMeters={record.locationAccuracyMeters}
            title="Map showing where you parked"
          />

          <Card variant="soft" data-testid="honesty">
            <div className="stack">
              <p className="t-body-md-strong">General area, not the exact bay</p>
              <p className="t-body-sm">
                Directions lead to the area around the pin. GPS cannot tell which floor, row or bay you are in, especially
                indoors or underground. Once you arrive, use the photo and details above.
              </p>
              <p className="t-body-sm" data-testid="accuracy-message">
                {accuracyMessage(record)}
              </p>
            </div>
          </Card>

          <div className="stack">
            <LinkButton variant="primary" block href={googleMapsUrl(lat, lon)} data-testid="link-google">
              Get directions
            </LinkButton>
            <LinkButton block href={appleMapsUrl(lat, lon)} data-testid="link-apple">
              Open in Apple Maps
            </LinkButton>
            <LinkButton block href={osmDirectionsUrl(lat, lon)} data-testid="link-osm">
              Open in OpenStreetMap
            </LinkButton>
          </div>

          <div className="copy-row">
            <Input label="Coordinates" readOnly value={coords} onFocus={(e) => e.currentTarget.select()} data-testid="coords" />
            <Button variant="subtle" onClick={() => void copy(coords, 'Coordinates')}>
              Copy
            </Button>
          </div>

          <div className="stack">
            {canShare && (
              <Button block variant="subtle" onClick={() => void share()} data-testid="share">
                Share this spot
              </Button>
            )}
            <Button block variant="subtle" onClick={onAdjust}>
              Adjust pin
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card variant="soft" data-testid="no-coords">
            <div className="stack">
              <p className="t-body-md-strong">No map coordinates for this spot</p>
              <p className="t-body-sm">
                You typed this location, so there is no pin and directions are not available. Use the place name, photo and
                details above to find your vehicle.
              </p>
            </div>
          </Card>
          <div className="stack">
            <Button block onClick={onEdit}>
              Add or edit details
            </Button>
            {record.locationLabel && (
              <Button block variant="subtle" onClick={() => void copy(record.locationLabel, 'Place name')}>
                Copy place name
              </Button>
            )}
            {canShare && (
              <Button block variant="subtle" onClick={() => void share()} data-testid="share">
                Share this spot
              </Button>
            )}
          </div>
        </>
      )}

      <p className="t-body-sm" role="status" aria-live="polite" data-testid="note">
        {note}
      </p>
    </main>
  )
}
