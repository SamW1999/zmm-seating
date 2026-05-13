'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Seat, Table } from '@/lib/types'
import toast from 'react-hot-toast'

interface RequestModalProps {
  seat: Seat & { table?: Table }
  onClose: () => void
}

export default function RequestModal({ seat, onClose }: RequestModalProps) {
  const supabase  = createClient()
  const [name, setName]       = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const tableLabel = seat.table
    ? `${seat.table.row}${seat.table.col} — Seat #${seat.position}`
    : `Seat #${seat.position}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !contact.trim()) return
    setLoading(true)
    const { error } = await supabase.from('requests').insert({
      seat_id:           seat.id,
      requester_name:    name.trim(),
      requester_contact: contact.trim(),
      note:              note.trim() || null,
      status:            'pending',
    })
    setLoading(false)
    if (error) {
      toast.error('Failed to submit request. Please try again.')
    } else {
      setSubmitted(true)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 font-sans">
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-garamond text-2xl text-gray-800 mb-2">Request Submitted!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Your request for <strong>{tableLabel}</strong> has been received. The gabbai will
              review it and be in touch.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#3A8F3D] text-white rounded-lg font-medium hover:bg-[#276429] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-garamond text-2xl text-gray-800">Request a Seat</h2>
                <p className="text-gray-500 text-sm mt-0.5">{tableLabel}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3A8F3D]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone or Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  required
                  placeholder="How we can reach you"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3A8F3D]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Any special requests or context…"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3A8F3D] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !contact.trim()}
                  className="flex-1 py-2.5 bg-[#3A8F3D] text-white rounded-lg font-medium hover:bg-[#276429] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
