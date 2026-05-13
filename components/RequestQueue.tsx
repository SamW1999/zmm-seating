'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SeatRequest, Table } from '@/lib/types'
import toast from 'react-hot-toast'

type FilterTab = 'all' | 'pending' | 'approved' | 'declined'

interface RequestQueueProps {
  requests: SeatRequest[]
  tables: Table[]
  onRefresh: () => void
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function RequestQueue({ requests, tables, onRefresh }: RequestQueueProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<FilterTab>('pending')

  // Build seat->table lookup
  const seatToTable = new Map<string, Table>()
  for (const t of tables) {
    for (const s of t.seats ?? []) {
      seatToTable.set(s.id, t)
    }
  }

  const seatLabel = (req: SeatRequest) => {
    const tbl = seatToTable.get(req.seat_id)
    if (!tbl) return `Seat ${req.seat_id.slice(0, 6)}`
    const seat = tbl.seats?.find((s) => s.id === req.seat_id)
    return `${tbl.row}${tbl.col} — Seat #${seat?.position ?? '?'}`
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const filtered = requests.filter((r) => {
    if (activeTab === 'all') return true
    return r.status === activeTab
  })

  async function approve(req: SeatRequest) {
    const tbl = seatToTable.get(req.seat_id)
    const seat = tbl?.seats?.find((s) => s.id === req.seat_id)
    if (!seat) return

    await supabase.from('seats').update({ member_name: req.requester_name, is_reserved: true }).eq('id', seat.id)
    await supabase.from('requests').update({ status: 'approved' }).eq('id', req.id)
    await supabase.from('requests').update({ status: 'declined' })
      .eq('seat_id', req.seat_id)
      .neq('id', req.id)
      .eq('status', 'pending')

    toast.success(`Approved — ${req.requester_name}`)
    onRefresh()
  }

  async function decline(req: SeatRequest) {
    await supabase.from('requests').update({ status: 'declined' }).eq('id', req.id)
    toast.success('Declined')
    onRefresh()
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'declined', label: 'Declined' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-garamond text-xl text-gray-800">Request Queue</h2>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-12">No requests in this category</div>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              className={`rounded-xl p-3 border ${
                req.status === 'pending'
                  ? 'bg-yellow-50 border-yellow-200'
                  : req.status === 'approved'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 text-sm">{req.requester_name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${
                        req.status === 'pending'
                          ? 'bg-yellow-200 text-yellow-800'
                          : req.status === 'approved'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{req.requester_contact}</p>
                  <p className="text-xs text-blue-600 mt-0.5">{seatLabel(req)}</p>
                  {req.note && (
                    <p className="text-xs text-gray-600 mt-0.5 italic">&ldquo;{req.note}&rdquo;</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(req.created_at)}</p>
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => approve(req)}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => decline(req)}
                      className="px-2 py-1 border border-red-300 text-red-600 text-xs rounded-md hover:bg-red-50 transition-colors"
                    >
                      ✗ Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
