import { useSyncExternalStore } from 'react'

/*
 * Service worker registration, update prompt and install prompt.
 * The service worker only exists in production builds, so dev never serves stale cached files.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PwaState = {
  /** A newer version is downloaded and waiting. It is never applied without the user's say-so. */
  needRefresh: boolean
  /** The browser offered an install prompt we can trigger. */
  canInstall: boolean
}

let state: PwaState = { needRefresh: false, canInstall: false }
const listeners = new Set<() => void>()
function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
let installEvent: BeforeInstallPromptEvent | null = null

export function registerPwa() {
  if (typeof window === 'undefined') return

  // The install event fires early, so listen from startup. It exists only on Chromium browsers.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent = e as BeforeInstallPromptEvent
    set({ canInstall: true })
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    set({ canInstall: false })
  })

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  void import('virtual:pwa-register').then(({ registerSW }) => {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => set({ needRefresh: true }),
      onRegisteredSW: (_url, registration) => {
        // Long-lived installed apps rarely navigate, so look for a new version whenever the app is brought back.
        if (!registration) return
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {})
        })
      },
    })
  })
}

/** Reload into the waiting version. Anything unsaved on screen is lost, which the banner says. */
export function applyUpdate() {
  void updateSW?.(true)
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = installEvent
  if (!e) return 'unavailable'
  installEvent = null
  set({ canInstall: false })
  try {
    await e.prompt()
    return (await e.userChoice).outcome
  } catch {
    return 'unavailable'
  }
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
    () => state,
  )
}

/** Running as an installed app (home-screen icon) rather than in a browser tab. */
export function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

export type OfflineStatus = 'ready' | 'not-yet' | 'unsupported'

/**
 * Is the app saved on this device so it opens without internet? A service worker only becomes
 * active after it has saved every app file, so an active one means the answer is yes.
 */
export async function getOfflineStatus(): Promise<OfflineStatus> {
  try {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return 'unsupported'
    const reg = await navigator.serviceWorker.getRegistration()
    return reg?.active ? 'ready' : 'not-yet'
  } catch {
    return 'unsupported'
  }
}
