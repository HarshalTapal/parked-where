import { Button } from './Button'
import { AlertIcon } from './Icons'
import { applyUpdate, usePwa } from '../lib/pwa'
import { useOnline } from '../lib/useOnline'

/** App-wide notices: offline, and a new version waiting. Both are status messages, never blocking. */
export function StatusBanners() {
  const online = useOnline()
  const { needRefresh } = usePwa()
  if (online && !needRefresh) return null

  return (
    <div className="banners">
      {!online && (
        <p className="banner" role="status" data-testid="offline-banner">
          <AlertIcon />
          <span>You are offline. Saved spots and photos still work; maps need internet.</span>
        </p>
      )}
      {needRefresh && (
        <div className="banner" role="status" data-testid="update-banner">
          <span>A new version is ready. Updating reloads the app, so finish any edit first.</span>
          <Button variant="secondary" onClick={applyUpdate}>
            Update now
          </Button>
        </div>
      )}
    </div>
  )
}
