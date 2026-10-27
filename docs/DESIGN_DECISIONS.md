# Design Decisions

Where `docs/DESIGN-uber.md` is silent or the plan extends it, the choice is recorded here (plan section 1, rule 6; section 5).

This is a style match only. No Uber name, logo or artwork is used.

## Recorded decisions

| # | Decision | Reason | Phase |
|---|---|---|---|
| D1 | Inputs use an 8px radius. The design file's YAML says 0px, its prose says 8px. | Plan section 5 resolves the conflict in favour of the prose. | 1 |
| D2 | `#afafaf` is decoration only. Secondary text uses `#5e5e5e`. | `#afafaf` is about 2.2:1 on white and fails WCAG. | 1 |
| D3 | Bottom tab bar (Home, History, Settings), active tab as a black pill, inactive tabs ink text on white, hairline top border. | Amendment A7: thumb reach. Extends the design file, no new colours. | 1 |
| D4 | Errors: black text + alert icon + 2px black inset outline on the field, announced with `role="alert"`. No red. | Plan section 5: never colour-only. | 1 |
| D5 | Toast: black pill with white text and an underlined white action (e.g. Undo), Level 2 shadow, floating above the tab bar. | Plan says black pill using the `ex-toast` pattern. The file's toast is white and 16px; the plan overrides it. | 1 |
| D6 | Modal: `ex-modal-card` (white, 16px, Level 2 shadow) on a 50% black backdrop. Focus is trapped, Esc closes, focus returns to the trigger. | The file gives no backdrop value. | 1 |
| D7 | Secondary button gets a 1px black inset outline. | The file's white pill on a white canvas would be invisible. | 1 |
| D8 | `card-content` gets a 1px `#e2e2e2` inset edge. | The file says "no shadow" on a white card, which disappears on a white canvas. The edge reuses the existing `surface-pressed` colour. | 1 |
| D9 | Selected chip is black with white text. Unselected is `canvas-soft`. | No selected state is defined. Reuses the primary polarity. | 1 |
| D10 | Disabled controls use 40% opacity and `not-allowed`. | No disabled state is defined. | 1 |
| D11 | Focus ring: 3px solid black, 2px offset, on every interactive element. | No focus style is defined. WCAG 2.4.7. | 1 |
| D12 | Placeholder text uses `#5e5e5e`, not `#afafaf`. | The file assigns `mute` to placeholders, but it fails contrast (D2). | 1 |
| D13 | Display sizes step down below 600px: XXL 52 to 36, XL 36 to 32. | 52px does not fit a 360px phone. The file only says the nav collapses. | 1 |
| D14 | Pressed and hover on black buttons use `#282828` (`black-elevated`). Pressed on white and soft buttons uses `#e2e2e2`. | Both colours are in the file. | 1 |
| D15 | Icons are inline 24px SVG line icons (2px stroke, round caps), drawn in this repo. | The file defines no icon set. No third-party icon library, no Uber artwork. | 1 |
| D16 | Illustrations are 4:3 SVGs in black, white and `#e2e2e2` only, set inside a `canvas-soft` empty-state card. | Plan section 5: monochrome 4:3 illustrations. | 1 |
| D17 | Content container caps at 560px and centres on desktop. | The file's ~1200px marketing container is too wide for a phone-first utility. | 1 |
| D18 | Storage error notice: `card-soft-tinted` with an alert icon, black heading and message, and a secondary "Try again" pill. Announced with `role="alert"`. | Reuses D4. The plan asks for a recoverable error that never traps the user. | 2 |

## To record as they arise

- Any further extension of the design file
