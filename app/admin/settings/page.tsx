'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Table } from '@/lib/types'
import { dedupeTables } from '@/lib/dedupe'
import AdminToolbar from '@/components/AdminToolbar'
import toast from 'react-hot-toast'

const BASE_ROWS = ['A', 'B', 'C', 'D', 'E', 'F']
const BASE_COLS = [1, 2, 3, 4, 5]

function nextRowLabel(row: string): string {
  const last = row.charCodeAt(row.length - 1)
  if (last < 90) return row.slice(0, -1) + String.fromCharCode(last + 1)
  return nextRowLabel(row.slice(0, -1) || '@') + 'A'
}

export default function SettingsPage() {
  const [supabase]      = useState(() => createClient())
  const [tables, setTables]         = useState<Table[]>([])
  const [loading, setLoading]       = useState(true)
  const [confirmClear, setConfirmClear] = useState('')
  const [newPassword, setNewPassword]   = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [movingBima, setMovingBima] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  async function fetchTables() {
    const { data } = await supabase.from('tables').select('*, seats(*)')
    if (data) setTables(dedupeTables(data as Table[]))
    setLoading(false)
  }

  useEffect(() => { fetchTables() }, [])

  const { dynamicRows, dynamicCols, tableMap } = useMemo(() => {
    const map = new Map<string, Table>()
    for (const t of tables) map.set(`${t.row}-${t.col}`, t)

    const dataRows = tables.map(t => t.row)
    const dataCols = tables.map(t => t.col)
    const allRows  = [...new Set([...BASE_ROWS, ...dataRows])].sort()
    const allCols  = [...new Set([...BASE_COLS, ...dataCols])].sort((a, b) => a - b)

    const expandRow = nextRowLabel(allRows[allRows.length - 1])
    const expandCol = allCols[allCols.length - 1] + 1

    return {
      dynamicRows: [...allRows, expandRow],
      dynamicCols: [...allCols, expandCol],
      tableMap: map,
    }
  }, [tables])

  const maxExistingCol = Math.max(...[...BASE_COLS, ...tables.map(t => t.col)])
  const maxExistingRow = [...new Set([...BASE_ROWS, ...tables.map(t => t.row)])].sort().at(-1) ?? 'F'

  // ── Bima movement ──
  async function handleMoveBima(row: string, col: number) {
    const bima = tables.find(t => t.is_bima)
    if (!bima) return
    await supabase.from('tables').update({ row, col }).eq('id', bima.id)
    toast.success(`Bima moved to ${row}${col}`)
    setMovingBima(false)
    fetchTables()
  }

  // ── Cell click ──
  async function handleCellClick(row: string, col: number) {
    const existing = tableMap.get(`${row}-${col}`)

    if (movingBima) {
      if (existing?.is_bima) {
        // Click bima again → cancel
        setMovingBima(false)
        toast('Move cancelled')
      } else if (existing) {
        toast.error('That cell already has a table — choose an empty cell.')
      } else {
        await handleMoveBima(row, col)
      }
      return
    }

    if (existing?.is_bima) {
      setMovingBima(true)
      toast('Click any empty cell to move the Bima there. Click the Bima again to cancel.', { icon: 'ℹ️', duration: 4000 })
      return
    }

    if (existing) {
      const hasReservations = existing.seats?.some(s => s.is_reserved || s.member_name)
      if (hasReservations) {
        toast.error('Cannot delete — this table has active reservations.')
        return
      }
      if (!confirm(`Delete table ${row}${col}? This cannot be undone.`)) return
      await supabase.from('tables').delete().eq('id', existing.id)
      toast.success(`Table ${row}${col} deleted`)
      fetchTables()
    } else {
      const { data: newTable } = await supabase
        .from('tables')
        .insert({ row, col, is_bima: false, is_active: true })
        .select()
        .single()
      if (newTable) {
        await supabase.from('seats').insert([
          { table_id: newTable.id, position: 1 },
          { table_id: newTable.id, position: 2 },
          { table_id: newTable.id, position: 3 },
        ])
        toast.success(`Table ${row}${col} added`)
        fetchTables()
      }
    }
  }

  async function clearAllReservations() {
    if (confirmClear !== 'CONFIRM') {
      toast.error('Type CONFIRM to clear all reservations.')
      return
    }
    await supabase
      .from('seats')
      .update({ member_name: null, is_reserved: false })
      .neq('id', '00000000-0000-0000-0000-000000000000')
    toast.success('All reservations cleared')
    setConfirmClear('')
    fetchTables()
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) toast.error(error.message)
    else {
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="flex flex-col min-h-screen pt-14" style={{ background: '#E5DFD1' }}>
      <AdminToolbar pendingCount={0} gridRef={gridRef} tables={tables} />

      <div className="max-w-5xl mx-auto w-full p-4 flex flex-col gap-6">
        <h1 className="font-garamond text-3xl text-gray-800 mt-2">Settings</h1>

        {/* Layout Editor */}
        <section className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-garamond text-xl text-gray-800 mb-1">Layout Editor</h2>
          <p className="text-sm text-gray-500 mb-1">
            Click an empty cell to add a table. Click an existing table to delete it (blocked if it has reservations).
            Click the Bima to move it to any empty cell.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            The grid automatically expands — the last row and column are expansion slots (shown with a +).
          </p>

          {/* Bima-move mode banner */}
          {movingBima && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800 flex items-center justify-between gap-3">
              <span>📍 Click any empty cell to place the Bima there.</span>
              <button
                onClick={() => setMovingBima(false)}
                className="text-amber-600 underline text-xs hover:text-amber-800"
              >
                Cancel
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block rounded-lg p-3" style={{ background: '#EAE4D8' }}>
                {/* Header row */}
                <div className="flex gap-2 mb-1 pl-7">
                  {dynamicCols.map(col => {
                    const isExp = col > maxExistingCol
                    return (
                      <div
                        key={col}
                        className={`w-16 text-center text-xs font-sans ${isExp ? 'text-gray-300' : 'text-gray-500'}`}
                      >
                        {col}
                      </div>
                    )
                  })}
                </div>

                {dynamicRows.map(row => {
                  const isExpRow = row > maxExistingRow
                  return (
                    <div key={row} className="flex items-center gap-2 mb-2">
                      <div className={`w-6 text-right text-xs font-garamond ${isExpRow ? 'text-gray-300' : 'text-gray-500'}`}>
                        {row}
                      </div>

                      {dynamicCols.map(col => {
                        const table      = tableMap.get(`${row}-${col}`)
                        const isBima     = table?.is_bima
                        const isExpCell  = row > maxExistingRow || col > maxExistingCol
                        const isDropTarget = movingBima && !table  // empty cell in move mode

                        let btnClass = ''
                        if (isBima) {
                          btnClass = movingBima
                            ? 'border-amber-400 bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer'
                            : 'border-dashed border-yellow-600 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 cursor-pointer'
                        } else if (table) {
                          btnClass = movingBima
                            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed opacity-40'
                            : 'border-[#C8C0A8] bg-[#F7F3EB] text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                        } else if (isDropTarget) {
                          btnClass = 'border-dashed border-amber-400 bg-amber-50 text-amber-500 hover:border-amber-600 hover:text-amber-700 hover:bg-amber-100 animate-pulse'
                        } else if (isExpCell) {
                          btnClass = 'border-dashed border-green-300 bg-green-50/50 text-green-400 hover:border-green-500 hover:text-green-600 hover:bg-green-50'
                        } else {
                          btnClass = 'border-dashed border-gray-300 bg-transparent text-gray-300 hover:border-green-400 hover:text-green-600 hover:bg-green-50'
                        }

                        return (
                          <button
                            key={col}
                            onClick={() => handleCellClick(row, col)}
                            disabled={movingBima ? (!!table && !isBima) : false}
                            title={
                              movingBima
                                ? isBima
                                  ? 'Click to cancel move'
                                  : table
                                  ? 'Occupied — choose an empty cell'
                                  : `Place Bima at ${row}${col}`
                                : isBima
                                ? 'Click to move the Bima'
                                : table
                                ? `Delete table ${row}${col}`
                                : `Add table ${row}${col}`
                            }
                            className={`w-16 h-10 rounded border-2 text-xs font-medium transition-all ${btnClass}`}
                          >
                            {isBima
                              ? movingBima ? '✕ בימה' : 'בימה'
                              : table
                              ? `${row}${col}`
                              : isDropTarget ? '📍' : '+'}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-xl p-5 shadow-sm border border-red-100">
          <h2 className="font-garamond text-xl text-red-700 mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-3">
            Clear all seat reservations and member names across every table. Type{' '}
            <strong>CONFIRM</strong> to proceed.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={confirmClear}
              onChange={e => setConfirmClear(e.target.value)}
              placeholder="Type CONFIRM"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              onClick={clearAllReservations}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </section>

        {/* Change Password */}
        <section className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-garamond text-xl text-gray-800 mb-3">Change Password</h2>
          <div className="flex flex-col gap-3 max-w-sm">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={changePassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors self-start"
            >
              Update Password
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
