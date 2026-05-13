'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase'
import { Table } from '@/lib/types'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface AdminToolbarProps {
  pendingCount: number
  gridRef: React.RefObject<HTMLDivElement | null>
  tables?: Table[]   // required for PNG/PDF export
  onToggleQueue?: () => void
}

export default function AdminToolbar({ pendingCount, gridRef, tables, onToggleQueue }: AdminToolbarProps) {
  const router = useRouter()
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportLabel, setExportLabel] = useState('')
  const [exportType, setExportType] = useState<'png' | 'pdf'>('png')
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  function openExport(type: 'png' | 'pdf') {
    setExportType(type)
    setExportLabel('')
    setShowExportModal(true)
  }

  async function doExport(label: string) {
    setShowExportModal(false)
    if (!tables) return
    const id = exportType
    toast.loading(`Generating ${id.toUpperCase()}…`, { id })
    try {
      const { buildExportCanvas } = await import('@/lib/buildExportCanvas')
      const canvas = await buildExportCanvas(tables, label || undefined)
      if (id === 'png') {
        const link = document.createElement('a')
        link.download = 'zmm-seating-chart.png'
        link.href = canvas.toDataURL('image/png')
        link.click()
        toast.success('PNG exported', { id })
      } else {
        const { default: jsPDF } = await import('jspdf')
        // canvas is @2x; logical dims are half
        const w = canvas.width  / 2
        const h = canvas.height / 2
        const orientation = w > h ? 'landscape' : 'portrait'
        const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] })
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
        pdf.save('zmm-seating-chart.pdf')
        toast.success('PDF exported', { id })
      }
    } catch (e) {
      console.error(e)
      toast.error(`${id.toUpperCase()} export failed`, { id })
    }
  }

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-2 bg-[#1C2B4A] text-white gap-3 flex-wrap"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}
      >
        <div className="flex items-center gap-2">
          <span className="font-garamond text-xl">ZMM Admin</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <a href="/admin"          className="px-3 py-1.5 text-blue-200 hover:text-white text-sm transition-colors">Dashboard</a>
          <a href="/admin/settings" className="px-3 py-1.5 text-blue-200 hover:text-white text-sm transition-colors">Settings</a>
          <a href="/" target="_blank" className="px-3 py-1.5 text-blue-200 hover:text-white text-sm transition-colors">Public View ↗</a>
        </nav>

        {/* Mobile hamburger */}
        <div className="relative md:hidden">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-2 text-white flex items-center justify-center"
            style={{ minHeight: 44, minWidth: 44 }}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 bg-[#1C2B4A] border border-blue-800 rounded-lg shadow-lg py-1 min-w-[160px] z-[100] mt-1">
              <a href="/admin"          className="block px-4 py-3 text-blue-200 hover:text-white text-sm transition-colors">Dashboard</a>
              <a href="/admin/settings" className="block px-4 py-3 text-blue-200 hover:text-white text-sm transition-colors">Settings</a>
              <a href="/" target="_blank" className="block px-4 py-3 text-blue-200 hover:text-white text-sm transition-colors">Public View ↗</a>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Inbox / queue toggle button */}
          {onToggleQueue && (
            <div className="relative">
              <button
                onClick={onToggleQueue}
                title="Toggle request queue"
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
                style={{ minHeight: 44 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
                </svg>
                Requests
              </button>
              {pendingCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#DC2626',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    pointerEvents: 'none',
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </div>
          )}

          {tables && (
            <>
              <button
                onClick={() => openExport('png')}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                style={{ minHeight: 44 }}
              >
                📷 PNG
              </button>
              <button
                onClick={() => openExport('pdf')}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                style={{ minHeight: 44 }}
              >
                📄 PDF
              </button>
            </>
          )}

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
            style={{ minHeight: 44 }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Export label modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="font-garamond text-xl text-gray-800 mb-1">Export Label</h2>
            <p className="text-sm text-gray-500 mb-3">
              Optional subtitle for the chart (leave blank for none)
            </p>
            <input
              type="text"
              value={exportLabel}
              onChange={e => setExportLabel(e.target.value)}
              placeholder="e.g. Shabbos Parshas Bamidbar"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              onKeyDown={e => e.key === 'Enter' && doExport(exportLabel)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => doExport(exportLabel)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
