# Parked Where? — Build Plan (free, local-first PWA)

> Audience: Claude Code working inside VS Code, plus the human owner.
> Source documents (put them in `docs/` in the repo):
> - `docs/Parked_Where_AI_App_Builder_Prompt_UX_Spec_v2.md` — functionality, flows, acceptance criteria (source of truth for behaviour)
> - `docs/DESIGN-uber.md` — visual reference (source of truth for look and feel)
>
> This plan **amends** the spec. Where this file and the spec differ, this file wins. Section 2 lists every amendment.

---

## 1. Working rules for Claude Code

1. Work **one phase at a time**. Before each phase, state the plan in a few lines. After it, state what works, what was tested, and what is still a prototype. Stop and wait for approval before starting the next phase.
2. Commit to Git at the end of every phase with a clear message.
3. Never claim a feature works unless it was run and tested (in the browser, not just compiled).
4. No fake capabilities: no indoor positioning, no live tracking, no automatic parking detection, no reminders.
5. Free only: no paid services, no API keys, no accounts beyond GitHub.
6. Visual design follows `docs/DESIGN-uber.md` exactly. Where it is silent, extend using the closest existing pattern and record the choice in `docs/DESIGN_DECISIONS.md`.
7. Do not use Uber's name, logo or artwork. This is a style match only.
8. When a step needs the human (installing software, phone testing, GitHub settings), give exact click-by-click instructions and wait.

---

## 2. Amendments to the spec

| # | Change | Reason |
|---|---|---|
| A1 | **Save on first tap, adjust after.** Merge spec screens C (Confirm location) and D (Add details). Tap "Save parking" → sample GPS → store the record immediately → show a details sheet. | Cuts the flow from ~7 steps to 2 taps; matches "save first, details later". |
| A2 | GPS sampling: use `watchPosition` for up to ~8 s, keep the best fix, stop early when accuracy ≤ 20 m. Always display accuracy; label fixes worse than ~50 m "approximate". | Mitigates saving a poor fix. |
| A3 | **Quick-pick chips** for floor (B3, B2, B1, G, 1, 2, 3, 4, 5 + "Other") and a camera-first photo button. | Less typing, faster capture. |
| A4 | **One active spot at a time.** Saving a new spot archives the previous one to history, with an Undo toast. | Removes the "duplicate/second spot" state. |
| A5 | **Cut from MVP:** parking timers/reminders, vehicle labels/profiles. | Scheduled notifications are unreliable without a push server; vehicle labels are unvalidated. |
| A6 | **Optional:** share via Web Share API (`navigator.share`), shown only where supported. | ~10 lines, no dependencies. |
| A7 | **Bottom tab bar** (Home, History, Settings) instead of the Uber top hamburger. | Thumb reach. This is an extension of the design file (see §5), not a direct copy. |
| A8 | **JSON export/import backup** in Settings. | Safari can evict IndexedDB for non-installed sites; this protects the user's data. |
| A9 | Ask for persistent storage (`navigator.storage.persist()`) after the first successful save. | Lowers eviction risk. |
| A10 | Offline: app shell + saved records + photos + coordinates work offline. **Map tiles do not** (OSM tile policy forbids bulk caching). Show a clear "Map unavailable offline" state. | Honesty and policy compliance. |

---

## 2b. Known limits to state honestly in the app

- Geolocation and service workers need **HTTPS** (or `localhost`). A phone opening `http://192.168.x.x:5173` will not get location.
- Indoor GPS cannot identify floor, row or bay. Directions lead to the general area only.
- Saved records and photos live **only on this device/browser**. No cloud sync, no encryption claims.
- Clearing browser data or uninstalling the PWA deletes records unless the user exported a backup.

---

## 3. Stack (fixed)

| Concern | Choice |
|---|---|
| Build | Vite + React + TypeScript |
| PWA | `vite-plugin-pwa` (manifest + service worker) |
| Storage | IndexedDB via `idb` (records in one store, photos as Blobs in another) |
| Map | `leaflet` + OpenStreetMap tiles, **lazy-loaded** only when a map is shown; visible OSM attribution |
| Reverse geocode | Nominatim, once per save, optional; failure falls back to a manual label |
| Directions | External deep links only: Google Maps, Apple Maps, OSM, plus copyable coordinates |
| Fonts | `@fontsource/inter` (self-hosted, works offline). No Google Fonts CDN |
| Routing | Hash-based (GitHub Pages friendly), no server config |
| Tests | Vitest for the data layer; manual test matrix for the rest (§8) |

No backend, no environment variables, no API keys.

---

## 4. Data model

```ts
type ParkingRecord = {
  id: string;                      // crypto.randomUUID()
  createdAt: string;               // ISO-8601
  updatedAt: string;
  status: 'active' | 'history';
  endedAt: string | null;          // when moved to history
  latitude: number | null;
  longitude: number | null;
  locationAccuracyMeters: number | null;
  locationSource: 'gps' | 'adjusted' | 'manual' | 'none';
  locationLabel: string;           // address, landmark or manual text
  floorLevel: string;
  zone: string;
  row: string;
  bayOrPillar: string;
  notes: string;
  hasPhoto: boolean;               // photo Blob stored separately under same id
};
```

Rules: coordinates and accuracy are populated only when genuinely available. No registration numbers. Only one record may have `status: 'active'`. Photos are downscaled to ~1280 px longest side, JPEG ~0.8, before storing.

---

## 5. Design mapping (Uber design system → this app)

Tokens come straight from `docs/DESIGN-uber.md`. Implement them as CSS custom properties.

**Colour:** `#000000` primary/ink, `#ffffff` canvas, `#efefef` canvas-soft, `#f3f3f3` canvas-softer, `#e2e2e2` pressed, `#5e5e5e` body. No second accent colour.

**Contrast rule:** `#afafaf` (mute) is ~2.2:1 on white and fails WCAG. Use it only for non-essential decoration. All real secondary text uses `#5e5e5e` (~6.5:1).

**Type:** Inter 700 (display, with `font-feature-settings: "ss01"`) for headlines, sentence case, no letter-spacing changes; Inter 400/500 for everything else. Sizes/line-heights per the typography table in the design file.

**Shapes:** pill `999px` on every button/chip; cards `16px`; inputs `8px` (the file's YAML says 0px, its prose says 8px; 8px is used); large form CTA may use the documented 16px exception.

**Elevation:** Level 0 flat by default. The **active spot card** is the one `card-elevated` (Level 1 shadow) so it stands out. Floating pills use Level 3. Other cards are flat `canvas-soft`.

**Rules to enforce:** one black primary pill per visible viewport; no gradients; no red/green; errors are black text + icon + hairline, never colour-only.

| UI element | Component |
|---|---|
| Save parking / Get directions | `button-primary` (black pill, ≥44 px tall) |
| Secondary actions | `button-secondary` / `button-subtle` |
| Floor/zone chips, filters | `category-button` |
| Text fields | `text-input` |
| Active spot | `card-elevated` |
| Info panels, history rows | `card-soft-tinted` / `card-content` |
| Past/archived record emphasis | polarity flip: `promo-card-on-dark` for the *active* summary where needed; "Past record" text label on history items |
| Toasts / Undo | black pill, `ex-toast` pattern |
| Dialogs | `ex-modal-card` |
| Empty states / onboarding | monochrome 4:3 SVG illustration inside a card |
| Tab bar (extension) | white canvas bar; active tab = black pill with white label, inactive = ink text; no new colours |

Record every extension (tab bar, error styling, toast placement) in `docs/DESIGN_DECISIONS.md`.

---

## 6. Screens (after amendments)

1. **Onboarding** — one screen: "Remember exactly where you parked." One black pill.
2. **Home, no active spot** — empty state, big "Save parking", one line on what is saved.
3. **Permission explainer** — shown immediately before the browser prompt; never traps the user (always a "Enter location manually" path).
4. **Saving…** — GPS sampling with live accuracy.
5. **Saved + details sheet** — success state, then chips, photo, row/bay/notes, all skippable; "Adjust pin" and "Edit label" available.
6. **Home, active spot** — active card with map preview, photo, clues, saved time, "Get directions".
7. **Find my vehicle** — clues and photo first; map; directions links; copy-coordinates fallback; explicit text separating "general area" from "exact bay".
8. **Edit spot** — draggable pin (when map available), label, details, replace photo, delete.
9. **History** — list; active vs past clearly distinct; view or "Reuse as new spot" (never silently becomes active).
10. **Settings & privacy** — permission guidance, how data is stored (local only), export/import, delete all records and photos.

States to handle: permission denied, GPS weak/timeout, offline, camera denied, storage full/failed, stale record (e.g. >24 h old shows "Saved 2 days ago — confirm your vehicle is still here"), directions link unavailable.

---

## 7. Phases

Each phase ends with a commit and a short report. **Do not start the next phase without approval.**

### Phase 0 — Tooling *(manual)*
**Human does:**
1. Install **Node.js LTS** from nodejs.org. Verify: `node -v`, `npm -v`.
2. Install **Git**. Verify: `git --version`. Set identity: `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.
3. Create a free **GitHub** account (needed in Phase 9).
4. Create the project folder, open it in VS Code, create `docs/`, and copy in the two source `.md` files and this plan.

**Claude Code does:** scaffold Vite + React + TS, install dependencies (§3), set up folder structure, `git init`, first commit, confirm `npm run dev` serves on `localhost`.
**Done when:** a blank app runs at `http://localhost:5173`.

### Phase 1 — Design foundation
Tokens as CSS variables; self-hosted Inter; components (Button variants, Card variants, Input, Chip, Toast, Modal, TabBar, EmptyState); 3–4 monochrome 4:3 SVG illustrations; a dev-only `/kit` page showing every component.
**Done when:** the kit page matches the design file's tokens and every button is ≥44 px tall.

### Phase 2 — Data layer
IndexedDB wrapper (records + photos), CRUD, single-active-spot rule, archive with undo, error handling for quota/unavailable storage, persistence request, Vitest tests for the rules.
**Done when:** unit tests pass; records survive reload; storage failure shows a recoverable error.

### Phase 3 — Save flow
Onboarding, Home (both states), permission explainer, GPS sampling (A2), denied/timeout/unavailable fallbacks, manual location entry.
**Human does:** open `localhost` on the desktop and test grant/deny; phone testing waits for Phase 9 hosting unless using a tunnel (§9).
**Done when:** a spot can be saved with granted, denied and unavailable location.

### Phase 4 — Details and photo
Details sheet (chips, fields, notes), camera/file input (`<input type="file" accept="image/*" capture="environment">`), downscaling, photo preview, preserved input on error.
**Done when:** a record with photo and clues saves and reloads.

### Phase 5 — Active spot and Find my vehicle
Lazy Leaflet map, draggable pin, accuracy messaging, directions deep links, clipboard fallback, stale-record notice, indoor-honesty copy, optional Web Share.
**Done when:** directions open in a maps app; with the map blocked/offline the clues and coordinates still show.

### Phase 6 — History, edit, delete
History list (active vs past), view, "Reuse as new spot", edit, replace photo, delete with confirmation and Undo.
**Done when:** every history action works and an old record is never shown as current.

### Phase 7 — Settings and privacy
Accurate storage statement, permission guidance (how to re-enable location per OS), export/import JSON (photos included), delete-all.
**Done when:** export → delete all → import restores everything.

### Phase 8 — PWA and offline
Manifest (name, icons 192/512 + maskable, `display: standalone`), service worker precaching the shell, offline indicator, "Map unavailable offline" state.
**Done when:** with network off, the installed/served app opens and shows the active spot's details and photo.

### Phase 9 — QA and deploy *(manual)*
Run the test matrix (§8), then deploy (§9), then install on the phone and re-run the matrix on the device.

---

## 8. Test matrix (must pass before calling the MVP done)

| Scenario | Expect |
|---|---|
| No saved spot / active spot / 5+ history records | Correct Home state; history distinct |
| Location granted / denied / timeout / unavailable | Saves, or falls back to manual with "no coordinates" label |
| Poor accuracy (>50 m) | "Approximate location" shown |
| Photo granted / camera denied / no photo | Save never blocked |
| Network off | Saved details, photo and coordinates visible; map shows offline state |
| Storage failure (simulate) | Error shown, entered data preserved |
| Save a second spot | Previous archived; Undo restores it |
| Delete spot | Confirmation + Undo |
| Directions link blocked | Coordinates + clues + copy button |
| Export → delete all → import | Full restore |
| Keyboard/screen reader | All controls labelled, visible focus, tab order logical |
| Widths 360, 390, 430 px and desktop | No horizontal scroll; centred container on desktop |
| Every button and tab | Works, or is clearly marked unavailable |

---

## 9. Hosting and phone use

**Development:** `npm run dev` on `localhost` (secure context; geolocation and service worker work).

**Phone use (recommended): GitHub Pages — free HTTPS.**
1. Create a GitHub repo and push the project.
2. Set `base: '/<repo-name>/'` in `vite.config.ts` (hash routing is already used).
3. Add `.github/workflows/deploy.yml` (Claude Code will generate it: checkout → setup-node → `npm ci` → `npm run build` → upload-pages-artifact → deploy-pages).
4. GitHub repo → **Settings → Pages → Source: GitHub Actions**.
5. Open `https://<username>.github.io/<repo-name>/` on the phone.
6. Install:
   - **iPhone:** Safari → Share → **Add to Home Screen**. (Must be Safari; this also reduces storage eviction.)
   - **Android:** Chrome → ⋮ → **Install app**.
7. Grant location when prompted. If previously denied: iPhone → Settings → Privacy & Security → Location Services → Safari Websites (or the installed app); Android → Chrome → Site settings → Location.

The code is public in this setup; **user data is not**, because it never leaves the device.

**Alternative — test local dev build on the phone without deploying:** a free quick tunnel (e.g. Cloudflare `cloudflared tunnel --url http://localhost:5173`) gives a temporary HTTPS URL. Vite may need `server.allowedHosts` set for the tunnel host. Fiddly but useful for quick checks.

**Last resort — local HTTPS with `mkcert`:** generate a cert for `localhost` and your LAN IP, configure Vite `server.https`, install the root CA on the phone. On iPhone the CA must also be enabled under Settings → General → About → Certificate Trust Settings. Highest effort; avoid unless needed.

---

## 10. Out of scope (do not build)

Timers/reminders, vehicle profiles, accounts, cloud sync, indoor navigation, automatic parking detection, live vehicle tracking, parking availability, social features, AI features, registration-number storage.

Possible later (P1, only if validated): distance/bearing to the car using the user's own location (works offline, no vehicle tracking).

---

## 11. First prompt to paste into Claude Code

```
Read docs/PROJECT_PLAN.md first, then docs/Parked_Where_AI_App_Builder_Prompt_UX_Spec_v2.md and docs/DESIGN-uber.md. The plan overrides the spec where they differ.

Follow section 1 working rules. Start with Phase 0: check whether Node and Git are installed (do not install them yourself; tell me what is missing and how to install it). If both are present, scaffold the project per section 3, create docs/DESIGN_DECISIONS.md, commit, and report. Do not begin Phase 1 until I approve.
```
