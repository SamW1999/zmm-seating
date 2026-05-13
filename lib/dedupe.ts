import { Table, Seat } from './types'

/**
 * Deduplicate tables by (row, col) position.
 * Also deduplicates seats within each table by position number.
 * This handles databases where the seed SQL was run multiple times.
 */
export function dedupeTables(tables: Table[]): Table[] {
  const seen = new Map<string, Table>()

  for (const t of tables) {
    const key = `${t.row}-${t.col}`
    if (seen.has(key)) continue // keep the first occurrence per position

    // Deduplicate seats by position number within this table
    const seatsByPos = new Map<number, Seat>()
    for (const s of t.seats ?? []) {
      if (!seatsByPos.has(s.position)) seatsByPos.set(s.position, s)
    }

    seen.set(key, { ...t, seats: Array.from(seatsByPos.values()) })
  }

  return Array.from(seen.values())
}
