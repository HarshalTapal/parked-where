# App icon sources

Black tile, white map pin. Drawn in this repo; no outside artwork.

| Source | Output in `public/` | Use |
|---|---|---|
| `icon-any.svg` | `icon-192.png`, `icon-512.png`, `favicon.svg` | Rounded corners, transparent outside the tile |
| `icon-maskable.svg` | `icon-maskable-512.png` | Full-bleed. The pin sits inside the central safe zone, so any OS mask keeps it |
| `icon-apple.svg` | `apple-touch-icon.png` (180) | Full-bleed. iOS rounds it itself and rejects transparency |

To regenerate the PNGs, render each SVG at the output size (a browser screenshot with a transparent
background works) and save over the files in `public/`. `favicon.svg` is a plain copy of `icon-any.svg`.
