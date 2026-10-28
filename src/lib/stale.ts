import { timeAgo } from './format'

export const STALE_AFTER_HOURS = 24

/** A saved pin does not mean the vehicle is still there. Older than 24 h counts as stale. */
export function isStale(createdAtIso: string, nowMs: number = Date.now()): boolean {
  return nowMs - new Date(createdAtIso).getTime() > STALE_AFTER_HOURS * 3600 * 1000
}

export function staleMessage(createdAtIso: string, nowMs: number = Date.now()): string {
  return `Saved ${timeAgo(createdAtIso, nowMs)} — confirm your vehicle is still here.`
}
