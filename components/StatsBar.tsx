'use client'

import { Table } from '@/lib/types'

interface StatsBarProps {
  tables: Table[]
}

export default function StatsBar({ tables }: StatsBarProps) {
  let total = 0
  let reserved = 0

  for (const t of tables) {
    if (t.is_bima || !t.is_active) continue
    for (const s of t.seats ?? []) {
      total++
      if (s.is_reserved || s.member_name) reserved++
    }
  }

  const available = total - reserved

  return (
    <div className="flex gap-6 justify-center py-2 px-4 rounded-lg bg-white/40 backdrop-blur-sm font-sans text-sm">
      <Stat label="Available" value={available} color="text-green-700" />
      <div className="w-px bg-gray-300" />
      <Stat label="Reserved" value={reserved} color="text-gray-600" />
      <div className="w-px bg-gray-300" />
      <Stat label="Total" value={total} color="text-gray-800" />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-xl font-semibold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  )
}
