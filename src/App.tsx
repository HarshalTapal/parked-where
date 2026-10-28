import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { HistoryIcon, HomeIcon, SettingsIcon } from './components/Icons'
import { TabBar } from './components/TabBar'
import { Toast, ToastRegion } from './components/Toast'
import { requestPersistence } from './data/db'
import { getActive, getRecord, undoSave, updateSpot } from './data/records'
import type { ParkingRecord } from './data/types'
import { reverseGeocode } from './lib/geocode'
import ComingSoon from './screens/ComingSoon'
import AdjustPin from './screens/AdjustPin'
import DetailsSheet from './screens/DetailsSheet'
import FindVehicle from './screens/FindVehicle'
import Home from './screens/Home'
import Onboarding from './screens/Onboarding'
import SaveFlow from './screens/SaveFlow'
import type { SaveResult } from './screens/SaveFlow'

// Dev-only pages: the dynamic imports are dropped from production builds.
const Kit = import.meta.env.DEV ? lazy(() => import('./screens/Kit')) : null
const DataLab = import.meta.env.DEV ? lazy(() => import('./screens/DataLab')) : null

const ONBOARDED_KEY = 'pw.onboarded'

function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

type ToastState = { message: string; undo?: { newId: string; archivedId: string } } | null

const TOAST_MS = 8000

function Main() {
  const route = useHashRoute()
  const [onboarded, setOnboarded] = useState(readOnboarded)
  const [active, setActive] = useState<ParkingRecord | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [details, setDetails] = useState<{ fresh: boolean } | null>(null)
  const pendingToast = useRef<ToastState>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    try {
      setActive(await getActive())
    } catch {
      setActive(null)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const showToast = useCallback((next: ToastState) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(next)
    if (next) toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  // Runs after the record is already stored, so none of this can block or lose a save.
  const handleSaved = useCallback(
    ({ record, archived }: SaveResult) => {
      setActive(record)
      setSaving(false)
      // The details sheet opens first; the Undo toast starts when it closes, so its 8 s are not used up while typing.
      pendingToast.current = {
        message: archived ? 'Spot saved. Previous spot moved to history.' : 'Spot saved.',
        undo: archived ? { newId: record.id, archivedId: archived.id } : undefined,
      }
      setDetails({ fresh: true })
      void requestPersistence()
      if (record.latitude !== null && record.longitude !== null && !record.locationLabel) {
        void reverseGeocode(record.latitude, record.longitude).then(async (label) => {
          if (!label) return
          try {
            // The user may have typed their own name while we waited: never overwrite it.
            const current = await getRecord(record.id)
            if (!current || current.locationLabel) return
            await updateSpot(record.id, { locationLabel: label })
            await refresh()
          } catch {
            /* record was undone or storage failed: keep the unnamed spot */
          }
        })
      }
    },
    [refresh],
  )

  function closeDetails(updated: ParkingRecord | null) {
    if (updated) setActive(updated)
    const fresh = details?.fresh
    setDetails(null)
    if (fresh && pendingToast.current) showToast(pendingToast.current)
    pendingToast.current = null
  }

  async function undo(u: { newId: string; archivedId: string }) {
    showToast(null)
    try {
      await undoSave(u.newId, u.archivedId)
    } finally {
      await refresh()
    }
  }

  function finishOnboarding() {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      /* private mode: onboarding simply shows again next visit */
    }
    setOnboarded(true)
  }

  if (!loaded) return null

  if (saving) return <SaveFlow onClose={() => setSaving(false)} onSaved={handleSaved} />
  if (details && active) {
    return <DetailsSheet key={active.id} record={active} fresh={details.fresh} onDone={closeDetails} />
  }
  if (!onboarded && !active) return <Onboarding onDone={finishOnboarding} />

  // Sub-screens of the active spot. Without an active spot they fall back to Home.
  if (active && route === '#/find') {
    return (
      <FindVehicle
        record={active}
        onBack={() => (window.location.hash = '#/')}
        onAdjust={() => (window.location.hash = '#/adjust')}
        onEdit={() => {
          window.location.hash = '#/'
          setDetails({ fresh: false })
        }}
      />
    )
  }
  if (active && route === '#/adjust' && active.latitude !== null) {
    return (
      <AdjustPin
        key={active.id}
        record={active}
        onBack={() => (window.location.hash = '#/find')}
        onSaved={(updated) => {
          setActive(updated)
          window.location.hash = '#/find'
        }}
      />
    )
  }

  const tab = route === '#/history' ? 'history' : route === '#/settings' ? 'settings' : 'home'

  return (
    <>
      {tab === 'home' && (
        <Home
          active={active}
          onSave={() => setSaving(true)}
          onEdit={() => setDetails({ fresh: false })}
          onFind={() => (window.location.hash = '#/find')}
        />
      )}
      {tab === 'history' && <ComingSoon title="History" />}
      {tab === 'settings' && <ComingSoon title="Settings" />}

      {toast && (
        <ToastRegion>
          <Toast
            message={toast.message}
            actionLabel={toast.undo ? 'Undo' : undefined}
            onAction={toast.undo ? () => void undo(toast.undo!) : undefined}
          />
        </ToastRegion>
      )}

      <TabBar
        activeId={tab}
        onSelect={(id) => {
          window.location.hash = id === 'home' ? '#/' : `#/${id}`
        }}
        items={[
          { id: 'home', label: 'Home', icon: <HomeIcon /> },
          { id: 'history', label: 'History', icon: <HistoryIcon /> },
          { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
        ]}
      />
    </>
  )
}

export default function App() {
  const route = useHashRoute()

  if (Kit && route === '#/kit') {
    return (
      <Suspense fallback={null}>
        <Kit />
      </Suspense>
    )
  }
  if (DataLab && route === '#/data') {
    return (
      <Suspense fallback={null}>
        <DataLab />
      </Suspense>
    )
  }
  return <Main />
}
