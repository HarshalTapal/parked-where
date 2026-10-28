import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { AlertIcon } from '../components/Icons'
import { Modal } from '../components/Modal'
import { BackupError, backupFileName, deleteAll, exportAll, getStats, importBackup, parseBackup } from '../data/backup'
import type { ParsedBackup, Stats } from '../data/backup'
import { requestPersistence } from '../data/db'
import { StorageError } from '../data/types'
import { dateTime } from '../lib/format'
import { getPermissionState } from '../lib/geolocation'
import type { PermissionState } from '../lib/geolocation'
import { getOfflineStatus, isStandalone, promptInstall, usePwa } from '../lib/pwa'
import type { OfflineStatus } from '../lib/pwa'

type Props = {
  /** Called after import or delete-all so Home and History reload. */
  onDataChanged: () => void | Promise<void>
}

type Persisted = 'yes' | 'no' | 'unknown'
type Notice = { kind: 'ok' | 'error'; text: string } | null

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

function mb(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function messageFor(e: unknown): string {
  if (e instanceof BackupError) return e.message
  if (e instanceof StorageError) return e.userMessage
  return 'Something went wrong. Nothing was changed. Please try again.'
}

const PERMISSION_TEXT: Record<PermissionState, string> = {
  granted: 'Allowed. The app asks for your location only when you tap Save parking.',
  denied:
    'Blocked. Saving still works: you can type where you parked instead. To turn location back on, follow the steps below.',
  prompt: 'Not asked yet. Your browser will ask the first time you save a spot.',
  unknown:
    'This browser does not say whether location is allowed. If saving cannot find you, follow the steps below.',
}

function NoticeLine({ notice, testId }: { notice: Notice; testId: string }) {
  if (!notice) return null
  return (
    <p className="status-line" role={notice.kind === 'error' ? 'alert' : 'status'} data-testid={testId}>
      {notice.kind === 'error' && <AlertIcon />}
      <span>{notice.text}</span>
    </p>
  )
}

export default function Settings({ onDataChanged }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsFailed, setStatsFailed] = useState(false)
  const [persisted, setPersisted] = useState<Persisted>('unknown')
  const [persistSupported, setPersistSupported] = useState(false)
  const [usage, setUsage] = useState<number | null>(null)
  const [permission, setPermission] = useState<PermissionState | null>(null)

  const [exportBusy, setExportBusy] = useState(false)
  const [exportNotice, setExportNotice] = useState<Notice>(null)

  const fileInput = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<{ name: string; parsed: ParsedBackup } | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importNotice, setImportNotice] = useState<Notice>(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null)

  const loadStats = useCallback(async () => {
    try {
      setStats(await getStats())
      setStatsFailed(false)
    } catch {
      setStatsFailed(true)
    }
  }, [])

  useEffect(() => {
    let live = true
    getStats()
      .then((s) => live && setStats(s))
      .catch(() => live && setStatsFailed(true))
    return () => {
      live = false
    }
  }, [])

  // Storage protection and size, where the browser can tell us.
  useEffect(() => {
    let live = true
    async function read() {
      try {
        if (!navigator.storage?.persisted) return
        const p = await navigator.storage.persisted()
        if (!live) return
        setPersistSupported(typeof navigator.storage.persist === 'function')
        setPersisted(p ? 'yes' : 'no')
        const est = await navigator.storage.estimate?.()
        if (live && est?.usage !== undefined) setUsage(est.usage)
      } catch {
        /* leave "unknown" */
      }
    }
    void read()
    return () => {
      live = false
    }
  }, [])

  // Permission can change in system settings; look again when the user comes back to the page.
  useEffect(() => {
    let live = true
    const read = () => void getPermissionState().then((s) => live && setPermission(s))
    read()
    document.addEventListener('visibilitychange', read)
    window.addEventListener('focus', read)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', read)
      window.removeEventListener('focus', read)
    }
  }, [])

  const { canInstall } = usePwa()
  const [offline, setOffline] = useState<OfflineStatus | null>(null)
  const [installNote, setInstallNote] = useState<string | null>(null)
  const standalone = isStandalone()

  useEffect(() => {
    let live = true
    getOfflineStatus().then((s) => live && setOffline(s))
    return () => {
      live = false
    }
  }, [])

  async function install() {
    const result = await promptInstall()
    if (result === 'dismissed') setInstallNote('Installation was cancelled. You can try again any time.')
    else if (result === 'accepted') setInstallNote('Installing. Look for the app icon on your device.')
    else setInstallNote('Your browser did not offer to install. Use the steps below instead.')
  }

  async function askPersistence() {
    const result = await requestPersistence()
    setPersisted(result === 'granted' ? 'yes' : 'no')
  }

  async function doExport() {
    setExportBusy(true)
    setExportNotice(null)
    try {
      const file = await exportAll()
      const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const name = backupFileName()
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      const photos = file.records.filter((r) => r.photo).length
      setExportNotice({
        kind: 'ok',
        text: `Backup created: ${plural(file.records.length, 'record')}, ${plural(photos, 'photo')}. Look for ${name} in your Downloads folder, and keep it somewhere private.`,
      })
    } catch (e) {
      setExportNotice({ kind: 'error', text: messageFor(e) })
    } finally {
      setExportBusy(false)
    }
  }

  async function onPickFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setImportNotice(null)
    setPicked(null)
    try {
      const parsed = parseBackup(await file.text(), file.size)
      setPicked({ name: file.name, parsed })
    } catch (e) {
      setImportNotice({ kind: 'error', text: `${messageFor(e)} Nothing was imported.` })
    }
  }

  async function doImport() {
    if (!picked) return
    setImportBusy(true)
    setImportNotice(null)
    try {
      const r = await importBackup(picked.parsed)
      setPicked(null)
      const parts = [`Added ${plural(r.added, 'record')} (${plural(r.photos, 'photo')}).`]
      if (r.skipped > 0) parts.push(`${plural(r.skipped, 'record')} already on this device ${r.skipped === 1 ? 'was' : 'were'} left as they were.`)
      if (r.demoted) parts.push('Your current spot stayed current. The backed-up current spot was added to History.')
      setImportNotice({ kind: 'ok', text: parts.join(' ') })
      await loadStats()
      await onDataChanged()
    } catch (e) {
      setImportNotice({ kind: 'error', text: `${messageFor(e)} Nothing was imported.` })
    } finally {
      setImportBusy(false)
    }
  }

  async function doDelete() {
    setDeleteBusy(true)
    setDeleteNotice(null)
    try {
      await deleteAll()
      setConfirmDelete(false)
      setPicked(null)
      setExportNotice(null)
      setImportNotice(null)
      setDeleteNotice({ kind: 'ok', text: 'Everything was deleted from this device.' })
      await loadStats()
      await onDataChanged()
    } catch (e) {
      setConfirmDelete(false)
      setDeleteNotice({ kind: 'error', text: `${messageFor(e)} Nothing was deleted.` })
    } finally {
      setDeleteBusy(false)
    }
  }

  const total = stats?.records ?? 0
  const pickedPhotos = picked ? picked.parsed.items.filter((i) => i.photo).length : 0
  const pickedHasActive = picked ? picked.parsed.items.some((i) => i.record.status === 'active') : false

  return (
    <main className="screen screen--with-tabs">
      <h1 className="t-display-lg">Settings</h1>

      {/* ---------- Storage and privacy ---------- */}
      <Card variant="content" data-testid="privacy-card">
        <div className="stack">
          <h2 className="t-display-sm">Your data stays on this device</h2>
          <p className="t-body-md">
            Your records, photos and coordinates are stored in this browser, on this device only. There is no account,
            no server and no cloud copy, and the app does not encrypt them: anyone who can open this browser can see them.
          </p>
          <h3 className="t-body-md-strong">What does use the internet</h3>
          <ul className="plain-list t-body-md">
            <li>
              <strong>Map tiles</strong> are loaded from OpenStreetMap when a map is on screen. That shows OpenStreetMap
              roughly which area you are looking at.
            </li>
            <li>
              <strong>Address lookup:</strong> when you save a spot, its coordinates are sent once to OpenStreetMap&rsquo;s
              Nominatim service to find an address.
            </li>
            <li>
              <strong>Directions and Share</strong> send the saved coordinates to Google Maps, Apple Maps,
              OpenStreetMap or the app you pick, only when you tap them.
            </li>
          </ul>
          <p className="t-body-md">There are no analytics, ads or tracking in this app.</p>
          <p className="t-body-md">
            <strong>If you clear this browser&rsquo;s site data, or remove the installed app, your records are deleted.</strong>{' '}
            Safari can also clear stored data for websites you have not used for a while, unless the app is added to
            the Home Screen. A backup (below) is the way to protect your records.
          </p>

          <div className="stack" data-testid="storage-facts">
            {statsFailed && (
              <p className="status-line" role="alert">
                <AlertIcon />
                <span>We could not read the saved data. Nothing has been deleted.</span>
              </p>
            )}
            {stats && (
              <p className="t-body-md" data-testid="stats-line">
                Saved here: {plural(stats.records, 'record')} ({stats.active} current, {stats.history} past),{' '}
                {plural(stats.photos, 'photo')}.
              </p>
            )}
            {usage !== null && (
              <p className="t-body-sm t-secondary" data-testid="usage-line">
                Your browser reports about {mb(usage)} used by this app, including its cached files.
              </p>
            )}
            <p className="t-body-md" data-testid="persist-line">
              {persisted === 'yes' && 'Your browser has agreed to keep this data unless you clear it yourself.'}
              {persisted === 'no' &&
                'Your browser has not promised to keep this data. It may be cleared if the device runs low on space.'}
              {persisted === 'unknown' && 'This browser does not say whether it will keep this data.'}
            </p>
            {persisted === 'no' && persistSupported && (
              <div>
                <Button variant="secondary" onClick={() => void askPersistence()}>
                  Ask the browser to keep my data
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ---------- Location permission ---------- */}
      <Card variant="content" data-testid="permission-card">
        <div className="stack">
          <h2 className="t-display-sm">Location permission</h2>
          <p className="t-body-md" data-testid="permission-status">
            {permission ? PERMISSION_TEXT[permission] : 'Checking…'}
          </p>
          <p className="t-body-sm t-secondary">
            The app cannot change this setting for you. Your phone or browser controls it. Location is used once, when
            you tap Save parking, and never in the background.
          </p>
          <details className="disclosure">
            <summary>iPhone or iPad</summary>
            <ol className="steps t-body-md">
              <li>Open the Settings app, then Privacy &amp; Security, then Location Services.</li>
              <li>Make sure Location Services is on at the top.</li>
              <li>Scroll to Safari Websites and choose &ldquo;Ask Next Time&rdquo; or &ldquo;While Using the App&rdquo;.</li>
              <li>If you added this app to your Home Screen, look for it by name in the same list.</li>
              <li>Come back here and reload the page.</li>
            </ol>
          </details>
          <details className="disclosure">
            <summary>Android</summary>
            <ol className="steps t-body-md">
              <li>In Chrome, tap the icon at the left of the address bar, then Permissions, then Location, and choose Allow.</li>
              <li>Or open Chrome&rsquo;s menu, then Settings, then Site settings, then Location, and make sure it is not blocked.</li>
              <li>For the installed app: press and hold its icon, tap App info, then Permissions, then Location.</li>
              <li>Make sure Android&rsquo;s own Location switch is on in Quick settings.</li>
              <li>Come back here and reload the page.</li>
            </ol>
          </details>
          <details className="disclosure">
            <summary>Computer (Chrome or Edge)</summary>
            <ol className="steps t-body-md">
              <li>Click the icon at the left of the address bar (a lock or sliders).</li>
              <li>Find Location and set it to Allow.</li>
              <li>Reload the page.</li>
            </ol>
          </details>
        </div>
      </Card>

      {/* ---------- Install and offline ---------- */}
      <Card variant="content" data-testid="install-card">
        <div className="stack">
          <h2 className="t-display-sm">Install and offline</h2>
          <p className="t-body-md" data-testid="offline-status">
            {offline === null && 'Checking…'}
            {offline === 'ready' &&
              'Ready for offline use. The app is saved on this device, so it opens without internet. Maps and address lookup still need internet.'}
            {offline === 'not-yet' &&
              'Not saved for offline use yet. Open the app once while you are online and wait a few seconds.'}
            {offline === 'unsupported' &&
              'This browser cannot save the app for offline use. Your saved spots are still stored on this device.'}
          </p>
          {standalone ? (
            <p className="t-body-md" data-testid="install-status">
              You are using the installed app.
            </p>
          ) : (
            <>
              <p className="t-body-md">
                Installing gives the app its own icon and opens it full screen. On iPhone it can also make Safari less
                likely to clear your saved data.
              </p>
              {canInstall && (
                <div>
                  <Button variant="secondary" onClick={() => void install()} data-testid="install-btn">
                    Install app
                  </Button>
                </div>
              )}
              {installNote && (
                <p className="t-body-sm" role="status" data-testid="install-note">
                  {installNote}
                </p>
              )}
              <details className="disclosure">
                <summary>How to install on a phone</summary>
                <ol className="steps t-body-md">
                  <li>iPhone or iPad: open this page in Safari, tap the Share button, then Add to Home Screen.</li>
                  <li>Android: in Chrome, open the menu (three dots), then tap Install app or Add to Home screen.</li>
                  <li>Computer (Chrome or Edge): use the install icon at the right of the address bar.</li>
                </ol>
              </details>
            </>
          )}
        </div>
      </Card>

      {/* ---------- Backup ---------- */}
      <Card variant="content" data-testid="backup-card">
        <div className="stack">
          <h2 className="t-display-sm">Backup and restore</h2>
          <p className="t-body-md">
            A backup is one file with all your records and photos. It is not encrypted and contains your coordinates and
            photos, so keep it private. Restoring adds the records to this device and never overwrites a record that is
            already here.
          </p>

          <Button block disabled={exportBusy || total === 0} onClick={() => void doExport()} data-testid="export-btn">
            {exportBusy ? 'Preparing…' : 'Download a backup'}
          </Button>
          {stats && total === 0 && <p className="t-body-sm t-secondary">Nothing saved yet, so there is nothing to back up.</p>}
          <NoticeLine notice={exportNotice} testId="export-notice" />

          <Button block variant="secondary" disabled={importBusy} onClick={() => fileInput.current?.click()}>
            Restore from a backup file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-input"
            onChange={(e) => {
              void onPickFile(e.target.files)
              e.target.value = ''
            }}
          />

          {picked && (
            <Card variant="soft" data-testid="import-preview">
              <div className="stack">
                <p className="t-body-md-strong">Ready to restore</p>
                <p className="t-body-md">
                  {picked.name} has {plural(picked.parsed.items.length, 'record')} and {plural(pickedPhotos, 'photo')}
                  {picked.parsed.exportedAt ? `, backed up ${dateTime(picked.parsed.exportedAt)}` : ''}.
                </p>
                <p className="t-body-sm">
                  Records already on this device are kept as they are.
                  {pickedHasActive && (stats?.active ?? 0) > 0
                    ? ' You already have a current spot, so the backed-up current spot will be added to History.'
                    : ''}
                </p>
                <Button block variant="secondary" disabled={importBusy} onClick={() => void doImport()} data-testid="import-confirm">
                  {importBusy ? 'Restoring…' : 'Add these records'}
                </Button>
                <Button block variant="subtle" disabled={importBusy} onClick={() => setPicked(null)}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}
          <NoticeLine notice={importNotice} testId="import-notice" />
        </div>
      </Card>

      {/* ---------- Delete all ---------- */}
      <Card variant="content" data-testid="delete-card">
        <div className="stack">
          <h2 className="t-display-sm">Delete everything</h2>
          <p className="t-body-md">
            Removes every record and photo from this device, including your current spot. This cannot be undone, so
            download a backup first if you might want them back.
          </p>
          <Button block variant="subtle" disabled={total === 0 || deleteBusy} onClick={() => setConfirmDelete(true)} data-testid="delete-all-btn">
            Delete all records and photos
          </Button>
          {stats && total === 0 && !deleteNotice && <p className="t-body-sm t-secondary">Nothing is saved on this device.</p>}
          <NoticeLine notice={deleteNotice} testId="delete-notice" />
        </div>
      </Card>

      <p className="t-caption t-secondary">
        Map data &copy; OpenStreetMap contributors. Maps drawn with Leaflet.
      </p>

      <Modal
        open={confirmDelete}
        title="Delete everything?"
        onClose={() => !deleteBusy && setConfirmDelete(false)}
        actions={
          <>
            <Button block disabled={deleteBusy} onClick={() => void doDelete()}>
              {deleteBusy ? 'Deleting…' : 'Delete everything'}
            </Button>
            <Button block variant="secondary" disabled={deleteBusy} onClick={() => setConfirmDelete(false)}>
              Keep my data
            </Button>
          </>
        }
      >
        This permanently removes {plural(total, 'record')} and {plural(stats?.photos ?? 0, 'photo')} from this device.
        There is no undo.
      </Modal>
    </main>
  )
}
