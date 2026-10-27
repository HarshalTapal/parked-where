/*
 * Photos are downscaled to ~1280 px on the longest side and re-encoded as JPEG ~0.8
 * before storing, so a phone photo (often 3-8 MB) becomes a few hundred KB.
 */

export const PHOTO_MAX_SIDE = 1280
export const PHOTO_QUALITY = 0.8
export const PHOTO_MAX_INPUT_BYTES = 30 * 1024 * 1024

/** A photo problem the user can understand. Never blocks saving the spot. */
export class PhotoError extends Error {
  readonly userMessage: string
  constructor(userMessage: string) {
    super(userMessage)
    this.name = 'PhotoError'
    this.userMessage = userMessage
  }
}

export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide) return { width, height }
  const scale = maxSide / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export async function downscaleImage(
  file: Blob,
  maxSide: number = PHOTO_MAX_SIDE,
  quality: number = PHOTO_QUALITY,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new PhotoError("That file isn't a picture. Choose a photo, or skip the photo.")
  }
  if (file.size > PHOTO_MAX_INPUT_BYTES) {
    throw new PhotoError('That photo is too large. Try a smaller one, or skip the photo.')
  }

  let bitmap: ImageBitmap
  try {
    // 'from-image' applies the camera's rotation, so portrait shots are not sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new PhotoError("We couldn't read that photo. Try another one, or skip the photo.")
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new PhotoError("We couldn't process that photo. You can still save without it.")
    ctx.fillStyle = '#ffffff' // JPEG has no transparency
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new PhotoError("We couldn't process that photo. You can still save without it.")
    return blob
  } finally {
    bitmap.close()
  }
}
