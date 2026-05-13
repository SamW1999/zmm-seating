'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Table, SeatRequest } from '@/lib/types'
import { dedupeTables } from '@/lib/dedupe'
import SeatingGrid from '@/components/SeatingGrid'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import EditDrawer from '@/components/EditDrawer'
import RequestQueue from '@/components/RequestQueue'
import AdminToolbar from '@/components/AdminToolbar'

export default function AdminPage() {
  const [supabase] = useState(() => createClient())
  const [tables, setTables]           = useState<Table[]>([])
  const [requests, setRequests]       = useState<SeatRequest[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [loading, setLoading]         = useState(true)
  const [queueOpen, setQueueOpen]     = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const [initialScale] = useState(() => typeof window !== 'undefined' ? (window.innerWidth < 768 ? window.innerWidth / 1600 : 1) : 1)

  const fetchAll = useCallback(async () => {
    const [tablesRes, requestsRes] = await Promise.all([
      supabase
        .from('tables')
        .select('*, seats(*)')
        .order('row', { ascending: true })
        .order('col',  { ascending: true }),
      supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: true }),
    ])

    if (tablesRes.data) {
      setTables(dedupeTables(tablesRes.data as Table[]))
    }

    if (requestsRes.data) setRequests(requestsRes.data as SeatRequest[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('admin-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' },    () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' },   () => fetchAll())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAll, supabase])

  const pendingCount = requests.filter(r => r.status === 'pending').length

  // EditDrawer fetches its own seat data; we just refresh the grid.
  async function handleRefresh() {
    await fetchAll()
  }

  return (
    <div className="flex flex-col pt-14" style={{ background: '#E5DFD1', height: '100vh', overflow: 'hidden' }}>
      <AdminToolbar
        pendingCount={pendingCount}
        gridRef={gridRef}
        tables={tables}
        onToggleQueue={() => setQueueOpen(o => !o)}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 font-sans animate-pulse">Loading…</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden relative">
          {/* Left: seating chart */}
          <div className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
            <p className="font-sans text-xs text-gray-500 mb-2">Click any table to edit seats &amp; requests</p>
            <TransformWrapper
              initialScale={initialScale}
              minScale={0.3}
              maxScale={3}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <TransformComponent
                    wrapperStyle={{ width: '100%', height: 'calc(100vh - 160px)' }}
                  >
                    <SeatingGrid
                      tables={tables}
                      isAdmin={true}
                      onTableClick={t => setSelectedTable(t)}
                      gridRef={gridRef}
                    />
                  </TransformComponent>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      zIndex: 50,
                    }}
                  >
                    <button
                      onClick={() => zoomIn()}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#1C2B4A', color: '#fff',
                        border: 'none', fontSize: 20, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Zoom in"
                    >+</button>
                    <button
                      onClick={() => zoomOut()}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#1C2B4A', color: '#fff',
                        border: 'none', fontSize: 20, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Zoom out"
                    >−</button>
                    <button
                      onClick={() => resetTransform()}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#1C2B4A', color: '#fff',
                        border: 'none', fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Reset zoom"
                    >⟳</button>
                  </div>
                </>
              )}
            </TransformWrapper>
          </div>

          {/* Right: collapsible request queue panel — full-screen overlay on mobile, side panel on desktop */}
          {queueOpen && (
            <div className="fixed inset-0 z-40 bg-white p-4 overflow-y-auto flex flex-col lg:static lg:inset-auto lg:z-auto lg:w-96 lg:rounded-xl lg:shadow-sm lg:flex-shrink-0 lg:max-h-[calc(100vh-100px)]">
              {/* Panel header with close button */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-garamond text-lg text-gray-800">Requests</span>
                <button
                  onClick={() => setQueueOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-2xl leading-none flex items-center justify-center"
                  style={{ minHeight: 44, minWidth: 44 }}
                  title="Close panel"
                >
                  ✕
                </button>
              </div>
              <RequestQueue
                requests={requests}
                tables={tables}
                onRefresh={fetchAll}
              />
            </div>
          )}

        </div>
      )}

      {/* Edit drawer */}
      {selectedTable && (
        <EditDrawer
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}
