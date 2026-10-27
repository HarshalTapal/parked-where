import { useEffect, useState } from 'react'
import { getPhoto } from '../data/records'

/**
 * Object URL for a stored photo, or null. `version` (e.g. the record's updatedAt)
 * reloads it after a replace. The URL is revoked when it changes or the component goes away.
 */
export function usePhotoUrl(id: string | null, hasPhoto: boolean, version: string): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !hasPhoto) return
    let live = true
    let made: string | null = null
    getPhoto(id)
      .then((blob) => {
        if (!live || !blob) return
        made = URL.createObjectURL(blob)
        setUrl(made)
      })
      .catch(() => {
        if (live) setUrl(null)
      })
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [id, hasPhoto, version])

  return hasPhoto ? url : null
}
