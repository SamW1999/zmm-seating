'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Table, Seat } from '@/lib/types'
import { dedupeTables } from '@/lib/dedupe'
import SeatingGrid from '@/components/SeatingGrid'
import StatsBar from '@/components/StatsBar'
import RequestModal from '@/components/RequestModal'
import Link from 'next/link'

export default function PublicPage() {
  const [supabase] = useState(() => createClient())
  const [tables, setTables]         = useState<Table[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedSeat, setSelectedSeat] = useState<(Seat & { table?: Table }) | null>(null)

  async function fetchData() {
    const { data, error } = await supabase
      .from('tables')
      .select('*, seats(*)')
      .eq('is_active', true)
      .order('row', { ascending: true })
      .order('col',  { ascending: true })

    if (!error && data) {
      setTables(dedupeTables(data as Table[]))
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function handleSeatClick(seat: Seat) {
    const parentTable = tables.find(t => t.seats?.some(s => s.id === seat.id))
    setSelectedSeat({ ...seat, table: parentTable })
  }

  return (
    <main className="min-h-screen font-sans" style={{ background: '#E5DFD1' }}>
      {/* Sticky header + stats */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#E5DFD1' }}>
        {/* Header */}
        <header className="pt-6 pb-3 px-4 text-center relative">
          <Link
            href="/admin/login"
            className="absolute top-0 right-4 px-3 py-1.5 rounded border font-sans"
            style={{ fontSize: 12, fontWeight: 500, color: '#1C2B4A', borderColor: '#1C2B4A', background: 'transparent' }}
          >
            Admin Login
          </Link>
          <div
            style={{
              width: 280,
              height: 110,
              overflow: 'hidden',
              margin: '0 auto',
              WebkitMaskImage: 'linear-gradient(to bottom, black 62%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 62%, transparent 100%)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/zmm-logo.jpg"
              alt="זכרון מנחם משה"
              style={{ width: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
          </div>
          <p className="font-sans text-gray-500 text-sm mt-1">Seating Chart — click a green seat to request it</p>
        </header>

        {/* Stats */}
        <div className="flex justify-center px-4 mb-4">
          <StatsBar tables={tables} />
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto overflow-y-auto pb-8 px-4" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex justify-center" style={{ minWidth: 'max-content', margin: '0 auto' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400 font-sans animate-pulse">Loading seating chart…</div>
            </div>
          ) : (
            <SeatingGrid
              tables={tables}
              isAdmin={false}
              onSeatClick={handleSeatClick}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 pb-8 font-sans text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: '#3A8F3D' }} />
          Available
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: '#DDD8CC', border: '1px solid #9A9080' }} />
          Reserved
        </div>
      </div>

      {/* Request modal */}
      {selectedSeat && (
        <RequestModal
          seat={selectedSeat}
          onClose={() => {
            setSelectedSeat(null)
            fetchData()
          }}
        />
      )}
    </main>
  )
}
