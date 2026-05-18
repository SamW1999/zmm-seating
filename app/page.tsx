'use client'

import { useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { createClient } from '@/lib/supabase'
import { Table, Seat } from '@/lib/types'
import { dedupeTables } from '@/lib/dedupe'
import SeatingGrid from '@/components/SeatingGrid'
import StatsBar from '@/components/StatsBar'
import RequestModal from '@/components/RequestModal'
import Link from 'next/link'

const zoomBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: '#1C2B4A',
  color: '#fff',
  border: 'none',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 600,
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

const compactSwatch = (color: string, border?: string): React.CSSProperties => ({
  width: 12, height: 12, borderRadius: 2, background: color, ...(border ? { border } : {}),
})

function CompactLegend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#9A9080', fontFamily: 'sans-serif' }}>
        <div style={compactSwatch('#3A8F3D')} />
        Available
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#9A9080', fontFamily: 'sans-serif' }}>
        <div style={compactSwatch('#DDD8CC', '1px solid #9A9080')} />
        Reserved
      </div>
    </div>
  )
}

export default function PublicPage() {
  const [supabase] = useState(() => createClient())
  const [tables, setTables]         = useState<Table[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedSeat, setSelectedSeat] = useState<(Seat & { table?: Table }) | null>(null)
  const [isMobile, setIsMobile]     = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(200)
  const headerRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [fittedScale, setFittedScale] = useState(0.45)

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

  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth < 1024)
      setIsLandscape(window.matchMedia('(orientation: landscape)').matches)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  useEffect(() => {
    if (!isMobile) return
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile])

  useEffect(() => {
    if (!isMobile || loading) return
    const el = mapContainerRef.current
    if (!el) return
    const containerW = el.offsetWidth
    const containerH = el.offsetHeight
    const scaleW = containerW / 1600
    const scaleH = containerH / 710
    setFittedScale(Math.min(Math.max(scaleW, scaleH), 1))
  }, [isMobile, loading])

  function handleSeatClick(seat: Seat) {
    const parentTable = tables.find(t => t.seats?.some(s => s.id === seat.id))
    setSelectedSeat({ ...seat, table: parentTable })
  }

  let statsTotal = 0
  let statsReserved = 0
  for (const t of tables) {
    if (t.is_bima || !t.is_active) continue
    for (const s of t.seats ?? []) {
      statsTotal++
      if (s.is_reserved || s.member_name) statsReserved++
    }
  }
  const statsAvailable = statsTotal - statsReserved

  return (
    <main
      className="font-sans"
      style={{
        background: '#E5DFD1',
        minHeight: !isMobile ? '100vh' : undefined,
        height: isMobile ? '100vh' : undefined,
        display: isMobile ? 'flex' : undefined,
        flexDirection: isMobile ? 'column' : undefined,
      }}
    >
      <style>{`
        @media (orientation: landscape) and (max-width: 1024px) {
          .zmm-landscape-bar { display: flex !important; }
          .zmm-portrait-content { display: none !important; }
          .zmm-map-container { height: calc(100vh - 56px - 32px) !important; }
          .zmm-legend-mobile { height: 32px !important; }
        }
      `}</style>

      {/* Sticky header — ref measured for portrait mobile map height */}
      <div
        ref={isMobile ? headerRef : null}
        style={{ position: 'sticky', top: 0, zIndex: 50, background: '#E5DFD1' }}
      >
        {/* Landscape bar — hidden by default, shown by CSS media query in landscape mobile */}
        <div
          className="zmm-landscape-bar"
          style={{ display: 'none', alignItems: 'center', height: 56, background: '#E5DFD1', padding: '0 12px', gap: 8 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zmm-logo.jpg" alt="זכרון מנחם משה" style={{ height: 48, width: 110, objectFit: 'contain' }} />
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#4A4030', fontFamily: 'sans-serif' }}>
            {statsAvailable} available · {statsReserved} reserved · {statsTotal} total
          </div>
          <Link
            href="/admin/login"
            className="px-3 py-1.5 rounded border font-sans"
            style={{ fontSize: 12, fontWeight: 500, color: '#1C2B4A', borderColor: '#1C2B4A', background: 'transparent', whiteSpace: 'nowrap' }}
          >
            Admin
          </Link>
        </div>

        {/* Portrait header — shown by default, hidden by CSS in landscape mobile */}
        <div className="zmm-portrait-content">
          <header className="pt-6 pb-3 px-4 text-center relative">
            <Link
              href="/admin/login"
              className="absolute top-0 right-4 px-3 py-1.5 rounded border font-sans"
              style={{ fontSize: 12, fontWeight: 500, color: '#1C2B4A', borderColor: '#1C2B4A', background: 'transparent' }}
            >
              {isMobile ? 'Admin' : 'Admin Login'}
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
          <div className="flex justify-center px-4 mb-4">
            <StatsBar tables={tables} />
          </div>
        </div>
      </div>

      {/* Map area */}
      {isMobile ? (
        loading ? (
          <div ref={mapContainerRef} className="zmm-map-container" style={{ height: isLandscape ? 'calc(100vh - 56px - 32px)' : '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-gray-400 font-sans animate-pulse">Loading seating chart…</span>
          </div>
        ) : (
          <div ref={mapContainerRef} className="zmm-map-container" style={{ position: 'relative', height: isLandscape ? 'calc(100vh - 56px - 32px)' : '60vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TransformWrapper initialScale={fittedScale} minScale={fittedScale} maxScale={3} centerOnInit={true} limitToBounds={true}>
              <>
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                  <SeatingGrid tables={tables} isAdmin={false} onSeatClick={handleSeatClick} />
                </TransformComponent>
                <ZoomControls />
              </>
            </TransformWrapper>
          </div>
        )
      ) : (
        /* Desktop: unchanged */
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
      )}

      {/* Legend */}
      {isMobile ? (
        <div className="zmm-legend-mobile" style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CompactLegend />
        </div>
      ) : (
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
      )}

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
