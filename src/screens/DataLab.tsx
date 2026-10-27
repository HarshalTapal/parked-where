import { useCallback, useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { StorageErrorNotice } from '../components/StorageErrorNotice'
import { Toast } from '../components/Toast'
import { injectStorageFailure, requestPersistence } from '../data/db'
import type { InjectedFailure } from '../data/db'
import { createSpot, endActive, getActive, listHistory, undoSave } from '../data/records'
import { StorageError, ValidationError } from '../data/types'
import type { ParkingRecord } from '../data/types'

/** Dev-only harness for the data layer, served at #/data. Not a product screen. */
export default function DataLab() {
  const [active, setActive] = useState<ParkingRecord | null>(null)
  const [history, setHistory] = useState<ParkingRecord[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [undo, setUndo] = useState<{ newId: string; archivedId: string | null } | null>(null)
  const [failure, setFailure] = useState<InjectedFailure>(null)
  const [persist, setPersist] = useState('not requested')

  const refresh = useCallback(async () => {
    try {
      setActive(await getActive())
      setHistory(await listHistory())
    } catch (e) {
      setError(e instanceof StorageError ? e.userMessage : 'Unexpected error.')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function save() {
    setError(null)
    try {
      const { record, archived } = await createSpot({ notes, locationSource: 'manual', locationLabel: 'Dev spot' })
      setUndo({ newId: record.id, archivedId: archived?.id ?? null })
      setPersist(await requestPersistence())
      await refresh()
    } catch (e) {
      // The notes field is left untouched on purpose: entered data survives a failure.
      if (e instanceof StorageError) setError(e.userMessage)
      else if (e instanceof ValidationError) setError(e.message)
      else setError('Unexpected error.')
    }
  }

  function toggleFailure(mode: InjectedFailure) {
    const next = failure === mode ? null : mode
    injectStorageFailure(next)
    setFailure(next)
  }

  return (
    <main
      style={{
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        padding: 'var(--space-2xl) var(--space-lg) 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
      }}
    >
      <h1 className="t-display-lg">Data lab</h1>
      <p className="t-body-sm t-secondary">Dev-only harness for the storage layer.</p>

      <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button block onClick={save}>
        Save spot
      </Button>

      {error && <StorageErrorNotice message={error} onRetry={save} />}
      {undo && (
        <Toast
          message="Spot saved."
          actionLabel="Undo"
          onAction={async () => {
            await undoSave(undo.newId, undo.archivedId)
            setUndo(null)
            await refresh()
          }}
        />
      )}

      <Card variant="elevated" data-testid="active">
        <p className="t-body-md-strong">Active spot</p>
        <p className="t-body-sm t-secondary" data-testid="active-notes">
          {active ? `${active.notes || '(no notes)'} · ${active.id.slice(0, 8)}` : 'none'}
        </p>
      </Card>
      <Card variant="soft" data-testid="history">
        <p className="t-body-md-strong">History</p>
        <p className="t-body-sm t-secondary" data-testid="history-count">
          {history.length}
        </p>
      </Card>

      <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <Button
          variant="subtle"
          onClick={async () => {
            await endActive()
            await refresh()
          }}
        >
          End active
        </Button>
        <Button variant="subtle" aria-pressed={failure === 'quota'} onClick={() => toggleFailure('quota')}>
          {failure === 'quota' ? 'Quota failure ON' : 'Simulate full storage'}
        </Button>
        <Button
          variant="subtle"
          aria-pressed={failure === 'unavailable'}
          onClick={() => toggleFailure('unavailable')}
        >
          {failure === 'unavailable' ? 'Unavailable ON' : 'Simulate blocked storage'}
        </Button>
      </div>
      <p className="t-caption t-secondary" data-testid="persist">
        Persistent storage: {persist}
      </p>
    </main>
  )
}
