'use client'

import { Seat } from '@/lib/types'

interface SeatButtonProps {
  seat: Seat
  isAdmin?: boolean
  onClick?: (seat: Seat) => void
  seatW?: number
  seatH?: number
}

function formatName(name: string | null | undefined): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(' ')}`
}

export default function SeatButton({
  seat,
  isAdmin = false,
  onClick,
  seatW = 44,
  seatH = 60,
}: SeatButtonProps) {
  const occupied = seat.is_reserved || !!seat.member_name
  const canClick = !isAdmin

  const bgColor     = occupied ? '#DDD8CC' : '#3A8F3D'
  const borderColor = occupied ? '#C2BBAC' : '#276429'

  return (
    <span
      style={{ display: 'inline-block' }}
      title={isAdmin ? (occupied ? (seat.member_name ?? 'Reserved') : undefined) : 'Click to request this seat'}
    >
    <button
      onClick={() => canClick && onClick?.(seat)}
      disabled={isAdmin}
      className="flex flex-col items-center justify-center rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        width: seatW,
        height: seatH,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        opacity: occupied ? 0.65 : 1,
        cursor: canClick ? 'pointer' : 'default',
      }}
    >
      {occupied ? (
        <span
          className="text-gray-700 font-sans text-center px-0.5"
          style={{
            fontSize: Math.max(7, seatH >= 50 ? 9 : 8),
            fontWeight: 600,
            maxWidth: seatW - 4,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: 1.3,
            display: 'block',
          }}
        >
          {formatName(seat.member_name)}
        </span>
      ) : (
        <>
          <span className="text-white text-xs leading-none">✦</span>
          <span className="text-white font-sans mt-0.5" style={{ fontSize: 8 }}>
            #{seat.position}
          </span>
        </>
      )}
    </button>
    </span>
  )
}
