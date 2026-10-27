import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { AlertIcon, PinIcon } from '../components/Icons'
import { Input } from '../components/Input'
import { StorageErrorNotice } from '../components/StorageErrorNotice'
import { createSpot } from '../data/records'
import { StorageError, ValidationError } from '../data/types'
import type { ParkingRecord, SpotInput } from '../data/types'
import { formatAccuracy } from '../lib/format'
import { GeoError, getPermissionState, isApproximate, startSampling } from '../lib/geolocation'
import type { Fix, Sampling } from '../lib/geolocation'

export type SaveResult = { record: ParkingRecord; archived: ParkingRecord | null }

type ProblemCode = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

type Step =
  | { name: 'checking' }
  | { name: 'explainer' }
  | { name: 'sampling' }
  | { name: 'problem'; code: ProblemCode }
  | { name: 'manual' }
  | { name: 'saving' }
  | { name: 'error'; message: string; retry: () => void }

const PROBLEMS: Record<ProblemCode, { title: string; body: string }> = {
  denied: {
    title: 'Location is turned off for this site',
    body: "That's fine. You can type where you parked instead. To use GPS later, open your browser's site settings, set Location to Allow, then try again.",
  },
  unavailable: {
    title: "We couldn't find your position",
    body: 'Your device could not get a location. This often happens indoors or underground. You can type where you parked instead.',
  },
  timeout: {
    title: 'Location is taking too long',
    body: 'No signal arrived in time. Try again near a window or outside, or type where you parked.',
  },
  unsupported: {
    title: "This browser can't share location",
    body: 'You can still save your spot by typing where you parked.',
  },
}

type Props = {
  onClose: () => void
  onSaved: (result: SaveResult) => void
}

export default function SaveFlow({ onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>({ name: 'checking' })
  const [best, setBest] = useState<Fix | null>(null)
  const sampling = useRef<Sampling | null>(null)

  const persist = useCallback(
    async function run(input: SpotInput): Promise<void> {
      setStep({ name: 'saving' })
      try {
        onSaved(await createSpot(input))
      } catch (e) {
        const message =
          e instanceof StorageError
            ? e.userMessage
            : e instanceof ValidationError
              ? e.message
              : 'Something went wrong while saving. Please try again.'
        // Keep the input in the retry closure so nothing the user entered is lost.
        setStep({ name: 'error', message, retry: () => void run(input) })
      }
    },
    [onSaved],
  )

  // Decide where to start: skip the explainer if the browser already knows the answer.
  useEffect(() => {
    let live = true
    void getPermissionState().then((state) => {
      if (!live) return
      if (state === 'granted') setStep({ name: 'sampling' })
      else if (state === 'denied') setStep({ name: 'problem', code: 'denied' })
      else setStep({ name: 'explainer' })
    })
    return () => {
      live = false
    }
  }, [])

  // GPS sampling lives for as long as the sampling step is showing.
  const stepName = step.name
  useEffect(() => {
    if (stepName !== 'sampling') return
    let live = true
    const s = startSampling({ onBest: (b) => live && setBest(b) })
    sampling.current = s
    s.done
      .then((fix) => {
        if (!live) return
        void persist({
          latitude: fix.latitude,
          longitude: fix.longitude,
          locationAccuracyMeters: fix.accuracyMeters,
          locationSource: 'gps',
        })
      })
      .catch((e: unknown) => {
        if (!live || !(e instanceof GeoError) || e.code === 'cancelled') return
        setStep({ name: 'problem', code: e.code as ProblemCode })
      })
    return () => {
      live = false
      s.cancel()
      setBest(null)
    }
  }, [stepName, persist])

  if (step.name === 'checking' || step.name === 'saving') {
    return (
      <main className="screen">
        <p className="t-body-lg" role="status">
          {step.name === 'saving' ? 'Saving your spot…' : 'One moment…'}
        </p>
      </main>
    )
  }

  if (step.name === 'explainer') {
    return (
      <main className="screen">
        <div className="screen__spacer" />
        <div className="stack">
          <PinIcon width={32} height={32} />
          <h1 className="t-display-lg">Allow location to save your spot</h1>
          <p className="t-body-md t-secondary">
            Your browser will ask to share your location. We use it once, when you tap Save, to pin
            where you parked. We do not track you in the background.
          </p>
          <p className="t-body-md t-secondary">
            GPS cannot tell which floor or bay you are on, so you can add that yourself afterwards.
          </p>
        </div>
        <div className="screen__spacer" />
        <div className="stack">
          <Button block onClick={() => setStep({ name: 'sampling' })}>
            Continue
          </Button>
          <Button block variant="secondary" onClick={() => setStep({ name: 'manual' })}>
            Enter location manually
          </Button>
          <Button block variant="subtle" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </main>
    )
  }

  if (step.name === 'sampling') {
    const approximate = best !== null && isApproximate(best.accuracyMeters)
    return (
      <main className="screen">
        <div className="screen__spacer" />
        <div className="stack">
          <h1 className="t-display-lg">Finding your location…</h1>
          <div aria-live="polite" data-testid="sampling-status">
            {best ? (
              <>
                <p className="accuracy">{formatAccuracy(best.accuracyMeters)}</p>
                <p className="t-body-md t-secondary">
                  {approximate
                    ? 'Approximate location. Waiting for a stronger signal.'
                    : 'Good signal. Improving for a few more seconds.'}
                </p>
              </>
            ) : (
              <p className="t-body-md t-secondary">Waiting for the first GPS reading.</p>
            )}
          </div>
          <p className="t-body-sm t-secondary">
            This takes up to 8 seconds. Your spot is saved as soon as we have a good reading.
          </p>
        </div>
        <div className="screen__spacer" />
        <div className="stack">
          <Button block disabled={!best} onClick={() => sampling.current?.finishNow()}>
            Use this location
          </Button>
          <Button block variant="secondary" onClick={() => setStep({ name: 'manual' })}>
            Enter location manually
          </Button>
          <Button block variant="subtle" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </main>
    )
  }

  if (step.name === 'problem') {
    const p = PROBLEMS[step.code]
    return (
      <main className="screen">
        <div className="screen__spacer" />
        <div className="stack">
          <AlertIcon width={32} height={32} />
          <h1 className="t-display-lg" data-testid="problem-title">
            {p.title}
          </h1>
          <p className="t-body-md t-secondary">{p.body}</p>
        </div>
        <div className="screen__spacer" />
        <div className="stack">
          <Button block onClick={() => setStep({ name: 'manual' })}>
            Enter location manually
          </Button>
          {step.code !== 'unsupported' && (
            <Button block variant="secondary" onClick={() => setStep({ name: 'sampling' })}>
              Try again
            </Button>
          )}
          <Button block variant="subtle" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </main>
    )
  }

  if (step.name === 'manual') {
    return <ManualEntry onCancel={onClose} onSubmit={(label) => void persist({ locationSource: 'manual', locationLabel: label })} />
  }

  return (
    <main className="screen">
      <div className="screen__spacer" />
      <StorageErrorNotice message={step.message} onRetry={step.retry} />
      <div className="screen__spacer" />
      <Button block variant="subtle" onClick={onClose}>
        Cancel
      </Button>
    </main>
  )
}

function ManualEntry({ onSubmit, onCancel }: { onSubmit: (label: string) => void; onCancel: () => void }) {
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | undefined>()

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = label.trim()
    if (!v) return setError('Type where you parked, for example "City Mall, level 3, near the lift".')
    if (v.length > 200) return setError('Please keep this under 200 characters.')
    onSubmit(v)
  }

  return (
    <main className="screen">
      <form className="screen" style={{ padding: 0, minHeight: 'auto', flex: 1 }} onSubmit={submit} noValidate>
        <div className="screen__spacer" />
        <div className="stack stack--lg">
          <h1 className="t-display-lg">Where did you park?</h1>
          <Card variant="soft">
            <p className="t-body-sm">
              This spot will be saved without map coordinates, so directions will not be available
              for it. The place and any clues you add are still saved on this device.
            </p>
          </Card>
          <Input
            label="Place or landmark"
            placeholder="e.g. City Mall, level 3, near the lift"
            value={label}
            error={error}
            maxLength={200}
            onChange={(e) => {
              setLabel(e.target.value)
              setError(undefined)
            }}
          />
        </div>
        <div className="screen__spacer" />
        <div className="stack">
          <Button block type="submit">
            Save parking
          </Button>
          <Button block variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </main>
  )
}
