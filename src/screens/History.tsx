import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { AlertIcon, CameraIcon } from '../components/Icons'
import { GarageLevelsArt } from '../components/Illustrations'
import { listHistory } from '../data/records'
import type { ParkingRecord } from '../data/types'
import { dateTime, spotTitle } from '../lib/format'

type Props = {
  /** Changes whenever history may have changed (save, edit, delete, undo). */
  version: number
}

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; list: ParkingRecord[] }

function clueLine(r: ParkingRecord): string {
  return [r.floorLevel && `Floor ${r.floorLevel}`, r.zone, r.row && `Row ${r.row}`, r.bayOrPillar && `Bay ${r.bayOrPillar}`]
    .filter(Boolean)
    .join(' · ')
}

export default function History({ version }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    listHistory()
      .then((list) => live && setState({ kind: 'ok', list }))
      .catch(() => live && setState({ kind: 'error' }))
    return () => {
      live = false
    }
  }, [version, attempt])

  return (
    <main className="screen screen--with-tabs">
      <h1 className="t-display-lg">History</h1>

      {state.kind === 'error' && (
        <Card variant="soft" role="alert" data-testid="history-error">
          <div className="stack">
            <p className="status-line">
              <AlertIcon />
              <span>We could not read your past records. Nothing has been deleted.</span>
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  setState({ kind: 'loading' })
                  setAttempt((n) => n + 1)
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {state.kind === 'ok' && state.list.length === 0 && (
        <EmptyState
          art={<GarageLevelsArt title="Stacked parking levels" />}
          title="No past records yet"
          text="When you save a new spot, the one before it is kept here, so you can look back or reuse it."
        />
      )}

      {state.kind === 'ok' && state.list.length > 0 && (
        <>
          <p className="t-body-md t-secondary">
            Earlier spots, newest first. These are not your current parking.
          </p>
          <ul className="history-list" data-testid="history-list">
            {state.list.map((r) => (
              <li key={r.id}>
                <a className="history-item" href={`#/history/${r.id}`} data-testid="history-item">
                  <span className="badge">Past record</span>
                  <span className="t-body-md-strong history-item__title">{spotTitle(r)}</span>
                  {clueLine(r) && <span className="t-body-sm">{clueLine(r)}</span>}
                  <span className="t-body-sm t-secondary history-item__meta">
                    {dateTime(r.createdAt)}
                    {r.hasPhoto && (
                      <>
                        {' · '}
                        <CameraIcon aria-hidden="true" /> Photo
                      </>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
