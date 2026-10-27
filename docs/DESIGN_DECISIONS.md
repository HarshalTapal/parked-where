# Design Decisions

Where `docs/DESIGN-uber.md` is silent or the plan extends it, the choice is recorded here (plan section 1, rule 6; section 5).

This is a style match only. No Uber name, logo or artwork is used.

## Recorded decisions

| # | Decision | Reason | Phase |
|---|---|---|---|
| D1 | Inputs use an 8px radius. The design file's YAML says 0px, its prose says 8px. | Plan section 5 resolves the conflict in favour of the prose. | 1 |
| D2 | `#afafaf` is decoration only. Secondary text uses `#5e5e5e`. | `#afafaf` is about 2.2:1 on white and fails WCAG. | 1 |
| D3 | Bottom tab bar (Home, History, Settings), active tab as a black pill. | Amendment A7: thumb reach. Extends the design file, no new colours. | 1 |

## To record as they arise

- Error styling (black text, icon and hairline, never colour-only)
- Toast placement
- Any other extension of the design file
