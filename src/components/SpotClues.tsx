import type { ParkingRecord } from '../data/types'
import { usePhotoUrl } from '../lib/usePhotoUrl'

/** The recognition cues first: photo, floor/zone/row/bay and notes. Shared by Home and Find. */
export function SpotClues({ record }: { record: ParkingRecord }) {
  const photoUrl = usePhotoUrl(record.id, record.hasPhoto, record.updatedAt)
  const clues = [
    ['Floor', record.floorLevel],
    ['Zone', record.zone],
    ['Row', record.row],
    ['Bay / pillar', record.bayOrPillar],
  ].filter(([, value]) => value)

  if (!record.hasPhoto && clues.length === 0 && !record.notes) return null

  return (
    <>
      {record.hasPhoto && (
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
      {record.notes && (
        <p className="t-body-md" data-testid="active-notes">
          {record.notes}
        </p>
      )}
    </>
  )
}
