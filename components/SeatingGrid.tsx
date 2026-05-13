'use client'

import React from 'react'
import { Table, Seat } from '@/lib/types'
import TableBox, { TABLE_W, getTableH } from './TableBox'
import FrontWall from './FrontWall'

interface SeatingGridProps {
  tables: Table[]
  isAdmin?: boolean
  onSeatClick?: (seat: Seat) => void
  onTableClick?: (table: Table) => void
  gridRef?: React.RefObject<HTMLDivElement | null>
}

const GAP = 12

function toRoman(n: number): string {
  const numerals = [
    'I','II','III','IV','V','VI','VII','VIII','IX','X',
    'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX',
  ]
  return numerals[n - 1] ?? `${n}`
}

export default function SeatingGrid({
  tables,
  isAdmin = false,
  onSeatClick,
  onTableClick,
  gridRef,
}: SeatingGridProps) {
  const tableMap = new Map<string, Table>()
  for (const t of tables) {
    tableMap.set(`${t.row}-${t.col}`, t)
  }

  const baseRows = ['A', 'B', 'C', 'D', 'E', 'F']
  const baseCols = [1, 2, 3, 4, 5]
  const dynamicRows = [...new Set([...baseRows, ...tables.map(t => t.row)])].sort()
  const dynamicCols = [...new Set([...baseCols, ...tables.map(t => t.col)])].sort((a, b) => a - b)

  // Per-grid-row height = max tableH among all tables in that row
  function rowH(row: string): number {
    const heights = dynamicCols.map(col => {
      const t = tableMap.get(`${row}-${col}`)
      return getTableH(t?.seats?.length ?? 3)
    })
    return Math.max(...heights)
  }

  return (
    <div
      ref={gridRef as React.RefObject<HTMLDivElement>}
      className="inline-block p-4 rounded-xl"
      style={{ background: '#E5DFD1' }}
    >
      <FrontWall />

      {/* Column headers */}
      <div className="flex mb-1" style={{ gap: GAP, paddingLeft: 32 }}>
        {dynamicCols.map(col => (
          <div
            key={col}
            className="font-garamond text-xs text-gray-500 text-center"
            style={{ width: TABLE_W, flexShrink: 0 }}
          >
            Col {toRoman(col)}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="rounded-lg p-3" style={{ background: '#EAE4D8' }}>
        {dynamicRows.map(row => {
          const rh = rowH(row)
          return (
            <div
              key={row}
              className="flex items-center"
              style={{ gap: GAP, marginBottom: GAP }}
            >
              {/* Row label */}
              <div
                className="font-garamond text-sm text-gray-500 text-right shrink-0"
                style={{ width: 20 }}
              >
                {row}
              </div>

              {dynamicCols.map(col => {
                const table = tableMap.get(`${row}-${col}`)

                if (!table) {
                  return (
                    <div
                      key={col}
                      style={{ width: TABLE_W, height: rh, flexShrink: 0 }}
                      aria-hidden
                    />
                  )
                }

                return (
                  <div key={col} style={{ width: TABLE_W, height: rh, flexShrink: 0 }}>
                    <TableBox
                      table={table}
                      isAdmin={isAdmin}
                      onSeatClick={onSeatClick}
                      onTableClick={onTableClick}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
