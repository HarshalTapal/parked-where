import { useEffect, useRef, useState } from 'react'
import { useOnline } from '../lib/useOnline'
import type { MapHandle } from '../lib/leafletMap'
import { MapOfflineArt } from './Illustrations'

type Props = {
  latitude: number
  longitude: number
  accuracyMeters: number | null
  title: string
  draggable?: boolean
  onMove?: (latitude: number, longitude: number) => void
}

type Status = 'loading' | 'ready' | 'failed'

/**
 * A map that never blocks the screen around it. Leaflet loads on demand; offline, blocked
 * tiles and a failed download each fall back to a clear message, and everything else on the
 * screen (clues, coordinates, links) keeps working.
 */
export function MapPanel({ latitude, longitude, accuracyMeters, title, draggable = false, onMove }: Props) {
  const online = useOnline()
  const el = useRef<HTMLDivElement>(null)
  const handle = useRef<MapHandle | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [tilesFailed, setTilesFailed] = useState(false)

  // Created once with the starting position; later position changes go through setPin below.
  const start = useRef({ latitude, longitude, accuracyMeters, draggable, title, onMove })

  useEffect(() => {
    if (!online) return
    let live = true
    const loaded = { any: false, errors: 0 }
    import('../lib/leafletMap')
      .then((m) => {
        if (!live || !el.current) return
        handle.current = m.createMap(el.current, {
          ...start.current,
          onMove: (la, lo) => start.current.onMove?.(la, lo),
          onTileLoad: () => {
            loaded.any = true
            if (live) setTilesFailed(false)
          },
          onTileError: () => {
            loaded.errors += 1
            if (live && !loaded.any && loaded.errors >= 2) setTilesFailed(true)
          },
        })
        setStatus('ready')
      })
      .catch(() => {
        if (live) setStatus('failed')
      })
    return () => {
      live = false
      handle.current?.destroy()
      handle.current = null
      setStatus('loading')
      setTilesFailed(false)
    }
  }, [online])

  useEffect(() => {
    start.current.onMove = onMove
  }, [onMove])

  useEffect(() => {
    handle.current?.setPin(latitude, longitude)
  }, [latitude, longitude, status])

  const problem = !online ? 'offline' : status === 'failed' ? 'failed' : tilesFailed ? 'tiles' : null

  return (
    <div className="map-frame">
      {online && status !== 'failed' && (
        <div ref={el} className="map-frame__map" role="region" aria-label={title} data-testid="map" />
      )}
      {problem && (
        <div className="map-frame__overlay" data-testid="map-problem" data-problem={problem}>
          <div className="map-frame__art">
            <MapOfflineArt title="A map with a crossed-out marker" />
          </div>
          <p className="t-body-md-strong">{problem === 'offline' ? 'Map unavailable offline' : 'The map could not load'}</p>
          <p className="t-body-sm t-secondary">Your saved details and coordinates are still shown on this screen.</p>
        </div>
      )}
      {!problem && status === 'loading' && (
        <p className="map-frame__loading t-body-sm t-secondary" role="status">
          Loading map…
        </p>
      )}
    </div>
  )
}
