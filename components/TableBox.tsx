'use client'

import { Table, Seat } from '@/lib/types'
import SeatButton from './SeatButton'

interface TableBoxProps {
  table: Table
  isAdmin?: boolean
  onSeatClick?: (seat: Seat) => void
  onTableClick?: (table: Table) => void
}

export const TABLE_W = 300

/** All tables use the same height — seats always in a single horizontal row. */
export function getTableH(_seatCount: number): number {
  return 88
}

/** Legacy constant kept for any external imports. */
export const TABLE_H = 88

function formatName(name: string | null | undefined): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(' ')}`
}

export default function TableBox({ table, isAdmin = false, onSeatClick, onTableClick }: TableBoxProps) {
  if (table.is_bima) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded"
        style={{
          width: TABLE_W,
          height: TABLE_H,
          background: 'rgba(180,140,0,0.09)',
          border: '2px dashed #B8960A',
        }}
      >
        <span className="font-garamond text-yellow-800 text-lg leading-tight">בימה</span>
        <span className="font-garamond text-yellow-700 text-xs tracking-widest">BIMA</span>
      </div>
    )
  }

  const seats  = (table.seats ?? []).slice().sort((a, b) => a.position - b.position)
  const tableH = TABLE_H

  // ── Family mode: all seats same name ──
  const firstName  = seats[0]?.member_name
  const familyMode =
    seats.length > 0 &&
    !!firstName &&
    seats.every(s => s.member_name === firstName && (s.is_reserved || !!s.member_name))

  return (
    <div
      onClick={() => isAdmin && onTableClick?.(table)}
      className="relative flex flex-col rounded overflow-hidden"
      style={{
        width: TABLE_W,
        height: tableH,
        background: table.is_active ? '#F7F3EB' : '#E0DBD0',
        border: `2px solid ${table.is_active ? '#C8C0A8' : '#A8A098'}`,
        opacity: table.is_active ? 1 : 0.5,
        cursor: isAdmin ? 'pointer' : 'default',
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between px-1.5 pt-1 shrink-0" style={{ minHeight: 18 }}>
        <span className="font-garamond text-[10px] text-gray-500 leading-none">
          {table.row}{table.col}
        </span>
        {table.label && (
          <span className="font-sans text-[8px] text-gray-500 font-medium truncate max-w-[180px] leading-none">
            {table.label}
          </span>
        )}
        {!table.is_active && (
          <span className="font-sans text-[8px] text-red-400 leading-none">inactive</span>
        )}
      </div>

      {/* Body */}
      {familyMode ? (
        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <span
            className="font-sans text-center text-gray-700 leading-tight"
            style={{
              fontSize: 12,
              fontWeight: 700,
              maxWidth: TABLE_W - 16,
              whiteSpace: 'normal',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {formatName(firstName)}
          </span>
          <span className="font-sans text-gray-400 mt-0.5" style={{ fontSize: 8 }}>
            {seats.length} seats
          </span>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center gap-1 px-1.5 py-0.5">
          {seats.length === 0 ? (
            <span className="text-gray-400 text-[9px]">no seats</span>
          ) : (
            (() => {
              const seatW = Math.floor((TABLE_W - 12 - (seats.length - 1) * 4) / seats.length)
              return seats.map(seat => (
                <SeatButton
                  key={seat.id}
                  seat={seat}
                  isAdmin={isAdmin}
                  onClick={onSeatClick}
                  seatW={seatW}
                  seatH={60}
                />
              ))
            })()
          )}
        </div>
      )}
    </div>
  )
}
