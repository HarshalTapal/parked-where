import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { AlertIcon } from '../components/Icons'
import { Modal } from '../components/Modal'
import { SpotClues } from '../components/SpotClues'
import { StorageErrorNotice } from '../components/StorageErrorNotice'
import { deleteSpot, getRecord, reuseSpot } from '../data/records'
import { StorageError, ValidationError } from '../data/types'
import type { DeletedSpot, ParkingRecord } from '../data/types'
import { dateTime, formatAccuracy, formatCoords, spotTitle } from '../lib/format'

type Props = {
  id: string
  /** Changes when the record may have been edited elsewhere. */
  version: number
  hasActive: boolean
  onBack: () => void
  onEdit: (record: ParkingRecord) => void
  onReused: (result: { record: ParkingRecord; archived: ParkingRecord | null }) => void
  onDeleted: (deleted: DeletedSpot) => void
}

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'missing' } | { kind: 'current' } | { kind: 'ok'; record: ParkingRecord }

function errorMessage(e: unknown): string {
  return e instanceof StorageError
    ? e.userMessage
    : e instanceof ValidationError
      ? e.message
      : 'Something went wrong. Please try again.'
}

export default function HistoryDetail({ id, version, hasActive, onBack, onEdit, onReused, onDeleted }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [confirm, setConfirm] = useState<'reuse' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<{ message: string; retry: () => void } | null>(null)

  useEffect(() => {
    let live = true
    getRecord(id)
      .then((record) => {
        if (!live) return
        // Only past records are shown here, so an old record is never presented as current.
        setState(!record ? { kind: 'missing' } : record.status === 'active' ? { kind: 'current' } : { kind: 'ok', record })
      })
      .catch(() => live && setState({ kind: 'error' }))
    return () => {
      live = false
    }
  }, [id, version])

  async function reuse() {
    setBusy(true)
    setActionError(null)
    try {
      const result = await reuseSpot(id)
      setConfirm(null)
      onReused(result)
    } catch (e) {
      setConfirm(null)
      setActionError({ message: errorMessage(e), retry: () => setConfirm('reuse') })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setActionError(null)
    try {
      const deleted = await deleteSpot(id)
      setConfirm(null)
      if (deleted) onDeleted(deleted)
      else onBack()
    } catch (e) {
      setConfirm(null)
      setActionError({ message: errorMessage(e), retry: () => setConfirm('delete') })
    } finally {
      setBusy(false)
    }
  }

  const back = (
    <div>
      <Button variant="subtle" onClick={onBack}>
        ← History
      </Button>
    </div>
  )

  if (state.kind === 'loading') return <main className="screen screen--with-tabs">{back}</main>

  if (state.kind !== 'ok') {
    const text =
      state.kind === 'current'
        ? { title: 'This is your current spot', body: 'It is not a past record. You can find it on the Home tab.' }
        : state.kind === 'error'
          ? { title: 'Could not open this record', body: 'We could not read it. Nothing has been deleted.' }
          : { title: 'Record not found', body: 'It may have been deleted.' }
    return (
      <main className="screen screen--with-tabs">
        {back}
        <Card variant="soft" role="status" data-testid="history-unavailable">
          <p className="t-body-md-strong">{text.title}</p>
          <p className="t-body-md t-secondary">{text.body}</p>
        </Card>
      </main>
    )
  }

  const { record } = state
  const hasCoords = record.latitude !== null && record.longitude !== null

  return (
    <main className="screen screen--with-tabs">
      {back}
      <h1 className="t-display-lg">Record details</h1>

      <Card variant="content" data-testid="history-card">
        <div className="stack">
          <span className="badge">Past record</span>
          <p className="status-line">
            <AlertIcon />
            <span>This is an earlier spot, not your current parking.</span>
          </p>

          <SpotClues record={record} />

          <h2 className="t-display-sm" data-testid="history-label">
            {spotTitle(record)}
          </h2>

          {hasCoords && (
            <p className="t-body-sm t-secondary" data-testid="history-coords">
              {formatCoords(record.latitude!, record.longitude!)}
              {record.locationSource === 'adjusted'
                ? ' · pin placed by hand'
                : record.locationAccuracyMeters !== null
                  ? ` · ${formatAccuracy(record.locationAccuracyMeters)}`
                  : ''}
            </p>
          )}
          {!hasCoords && (
            <p className="t-body-sm t-secondary">Entered by hand. There are no map coordinates for this spot.</p>
          )}
          <p className="t-body-sm t-secondary" data-testid="history-times">
            Saved {dateTime(record.createdAt)}
            {record.endedAt ? ` · Ended ${dateTime(record.endedAt)}` : ''}
          </p>
        </div>
      </Card>

      {actionError && <StorageErrorNotice message={actionError.message} onRetry={actionError.retry} />}

      <Button block disabled={busy} onClick={() => setConfirm('reuse')}>
        Reuse as new spot
      </Button>
      <Button block variant="secondary" disabled={busy} onClick={() => onEdit(record)}>
        Edit details
      </Button>
      <Button block variant="subtle" disabled={busy} onClick={() => setConfirm('delete')}>
        Delete this record
      </Button>

      <Modal
        open={confirm === 'reuse'}
        title="Use this as your current spot?"
        onClose={() => !busy && setConfirm(null)}
        actions={
          <>
            <Button block disabled={busy} onClick={() => void reuse()}>
              {busy ? 'Working…' : 'Use as current spot'}
            </Button>
            <Button block variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
          </>
        }
      >
        {hasActive
          ? 'This copies the place, details and photo into a new current spot. Your current spot moves to history. You can undo this.'
          : 'This copies the place, details and photo into a new current spot. This record stays in history. You can undo this.'}
      </Modal>

      <Modal
        open={confirm === 'delete'}
        title="Delete this record?"
        onClose={() => !busy && setConfirm(null)}
        actions={
          <>
            <Button block disabled={busy} onClick={() => void remove()}>
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
            <Button block variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
              Keep it
            </Button>
          </>
        }
      >
        The record and its photo are removed from this device. You can undo this for a few seconds.
      </Modal>
    </main>
  )
}
