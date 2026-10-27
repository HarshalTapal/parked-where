/* Monochrome 4:3 illustrations (viewBox 400x300). Black, white and design-file greys only. */

const INK = '#000000'
const SOFT = '#e2e2e2'
const WHITE = '#ffffff'

type ArtProps = { title: string }

function Frame({ title, children }: ArtProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label={title}>
      <rect width="400" height="300" fill={WHITE} />
      {children}
    </svg>
  )
}

/** A car beside a location pin on a parking line. */
export function ParkedCarArt({ title }: ArtProps) {
  return (
    <Frame title={title}>
      <rect x="40" y="220" width="320" height="6" fill={SOFT} />
      <rect x="110" y="190" width="6" height="36" fill={SOFT} />
      <rect x="284" y="190" width="6" height="36" fill={SOFT} />
      <path d="M130 200v-22l14-26h112l18 26v22z" fill={INK} />
      <path d="M152 178l10-18h76l12 18z" fill={WHITE} />
      <circle cx="160" cy="204" r="14" fill={WHITE} stroke={INK} strokeWidth="6" />
      <circle cx="252" cy="204" r="14" fill={WHITE} stroke={INK} strokeWidth="6" />
      <path d="M200 120s26-22 26-42a26 26 0 1 0-52 0c0 20 26 42 26 42z" fill={INK} />
      <circle cx="200" cy="78" r="10" fill={WHITE} />
    </Frame>
  )
}

/** A multi-level garage with a marked level. */
export function GarageLevelsArt({ title }: ArtProps) {
  return (
    <Frame title={title}>
      <rect x="80" y="50" width="240" height="190" fill={WHITE} stroke={INK} strokeWidth="6" />
      <rect x="80" y="110" width="240" height="6" fill={INK} />
      <rect x="80" y="170" width="240" height="6" fill={INK} />
      <rect x="120" y="136" width="52" height="26" rx="6" fill={SOFT} />
      <rect x="228" y="76" width="52" height="26" rx="6" fill={SOFT} />
      <rect x="228" y="196" width="52" height="26" rx="6" fill={SOFT} />
      <rect x="120" y="136" width="52" height="26" rx="6" fill={INK} />
      <rect x="60" y="240" width="280" height="6" fill={INK} />
    </Frame>
  )
}

/** A photo frame with a camera. */
export function PhotoClueArt({ title }: ArtProps) {
  return (
    <Frame title={title}>
      <rect x="90" y="60" width="220" height="170" rx="16" fill={SOFT} />
      <path d="M120 200l50-62 36 40 24-24 50 46z" fill={INK} />
      <circle cx="262" cy="104" r="14" fill={WHITE} />
      <rect x="150" y="236" width="100" height="6" fill={INK} />
    </Frame>
  )
}

/** A map with a crossed-out signal: map unavailable offline. */
export function MapOfflineArt({ title }: ArtProps) {
  return (
    <Frame title={title}>
      <path d="M70 70l86-20 88 22 86-22v180l-86 22-88-22-86 20z" fill={SOFT} />
      <path d="M156 50v180M244 72v180" stroke={WHITE} strokeWidth="6" />
      <circle cx="200" cy="150" r="46" fill={INK} />
      <path d="M178 128l44 44M222 128l-44 44" stroke={WHITE} strokeWidth="8" strokeLinecap="round" />
    </Frame>
  )
}
