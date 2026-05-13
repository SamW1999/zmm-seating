'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { createClient } from '@/lib/supabase'
import { Table, SeatRequest } from '@/lib/types'
import { dedupeTables } from '@/lib/dedupe'
import SeatingGrid from '@/components/SeatingGrid'
import EditDrawer from '@/components/EditDrawer'
import RequestQueue from '@/components/RequestQueue'
import AdminToolbar from '@/components/AdminToolbar'

const zoomBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', background: '#1C2B4A', color: '#fff',
  border: 'none', fontSize: 18, lineHeight: 1, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
      <button style={zoomBtnStyle} onClick={() => zoomIn()}>+</button>
      <button style={zoomBtnStyle} onClick={() => zoomOut()}>−</button>
      <button style={zoomBtnStyle} onClick={() => resetTransform()}>⟳</button>
    </div>
  )
}

export default function AdminPage() {
  const [supabase] = useState(() => createClient())
  const [tables, setTables]           = useState<Table[]>([])
  const [requests, setRequests]       = useState<SeatRequest[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [loading, setLoading]         = useState(true)
  const [queueOpen, setQueueOpen]     = useState(false)
  const [isMobile, setIsMobile]       = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    function update() { setIsMobile(window.innerWidth < 1024) }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

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
          {/* Left: seating chart — expands when queue is closed */}
          {isMobile ? (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <p className="font-sans text-xs text-gray-500 mb-2">Click any table to edit seats &amp; requests</p>
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <TransformWrapper initialScale={0.45} minScale={0.3} maxScale={3} centerOnInit={true} limitToBounds={true}>
                  <>
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                      <SeatingGrid
                        tables={tables}
                        isAdmin={true}
                        onTableClick={t => setSelectedTable(t)}
                        gridRef={gridRef}
                      />
                    </TransformComponent>
                    <ZoomControls />
                  </>
                </TransformWrapper>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <p className="font-sans text-xs text-gray-500 mb-2">Click any table to edit seats &amp; requests</p>
              <div style={{ minWidth: 'max-content' }}>
                <SeatingGrid
                  tables={tables}
                  isAdmin={true}
                  onTableClick={t => setSelectedTable(t)}
                  gridRef={gridRef}
                />
              </div>
            </div>
          )}

          {/* Right: collapsible request queue panel */}
          {queueOpen && (
            <div
              className="w-full lg:w-96 bg-white rounded-xl shadow-sm p-4 overflow-y-auto flex-shrink-0"
              style={{ maxHeight: 'calc(100vh - 100px)' }}
            >
              {/* Panel header with close button */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-garamond text-lg text-gray-800">Requests</span>
                <button
                  onClick={() => setQueueOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none"
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
