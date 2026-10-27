export const FLOOR_CHIPS = ['B3', 'B2', 'B1', 'G', '1', '2', '3', '4', '5'] as const
export const FLOOR_OTHER = 'Other'

export type FloorState = { choice: string; other: string }

/** Turn a stored floor string back into chip state. Unknown text becomes "Other". */
export function parseFloor(value: string): FloorState {
  const v = value.trim()
  if (!v) return { choice: '', other: '' }
  if ((FLOOR_CHIPS as readonly string[]).includes(v)) return { choice: v, other: '' }
  return { choice: FLOOR_OTHER, other: v }
}

export function composeFloor(state: FloorState): string {
  return state.choice === FLOOR_OTHER ? state.other.trim() : state.choice
}
