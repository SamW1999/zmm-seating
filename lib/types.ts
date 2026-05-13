export interface Table {
  id: string
  row: string
  col: number
  is_bima: boolean
  is_active: boolean
  label: string | null
  seats?: Seat[]
}

export interface Seat {
  id: string
  table_id: string
  position: number
  member_name: string | null
  is_reserved: boolean
  requests?: SeatRequest[]
}

export interface SeatRequest {
  id: string
  seat_id: string
  requester_name: string
  requester_contact: string
  note: string | null
  status: 'pending' | 'approved' | 'declined'
  created_at: string
  seat?: Seat & { table?: Table }
}

export type GridCell = Table | null

export interface GridPosition {
  row: string
  col: number
}

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export const COLS = [1, 2, 3, 4, 5] as const
