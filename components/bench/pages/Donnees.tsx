'use client'

import { useMemo, useState } from 'react'
import { useBench } from '../BenchContext'
import { getMetricState } from '@/lib/types'

const PAGE_SIZE = 50

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit',
  })
}

const stateText: Record<string, string> = {
  OK:      '#10b981',
  WARNING: '#f59e0b',
  DANGER:  '#ef4444',
}

export function Donnees() {
  const { history, thresholds } = useBench()
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(history.length / PAGE_SIZE)

  // Always show newest first
  const rows = useMemo(() => {
    const sorted = [...history].reverse()
    return sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  }, [history, page])

  const cols = [
    { key: 'timestamp',      label: 'Horodatage',     fmt: (v: number) => `${fmtDate(v)} ${fmtTime(v)}`, metric: null },
    { key: 'temp_carburant', label: 'Carburant (°C)',  fmt: (v: number) => v.toFixed(1),                  metric: 'temp_carburant' },
    { key: 'temp_echap',     label: 'Échapp. (°C)',    fmt: (v: number) => v.toFixed(1),                  metric: 'temp_echap' },
    { key: 'temp_admission', label: 'Admiss. (°C)',    fmt: (v: number) => v.toFixed(1),                  metric: 'temp_admission' },
    { key: 'rpm',            label: 'RPM',              fmt: (v: number) => v.toLocaleString('fr-FR'),     metric: 'rpm' },
    { key: 'vitesse',        label: 'Vitesse (m/s)',   fmt: (v: number) => v.toFixed(2),                  metric: null },
    { key: 'vibration',      label: 'Vibration (m/s²)',fmt: (v: number) => v.toFixed(3),                  metric: 'vibration' },
  ]

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Données brutes
        </h1>
        <span className="text-xs font-mono" style={{ color: '#475569' }}>
          {history.length.toLocaleString('fr-FR')} échantillons — page {page + 1}/{Math.max(1, totalPages)}
        </span>
      </div>

      <div
        className="rounded-md border overflow-x-auto"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2937', backgroundColor: '#0d1220' }}>
              {cols.map(c => (
                <th
                  key={c.key}
                  className="px-3 py-2.5 text-left whitespace-nowrap font-semibold tracking-wider uppercase text-[10px]"
                  style={{ color: '#64748b' }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={cols.length}
                  className="px-4 py-8 text-center"
                  style={{ color: '#475569' }}
                >
                  En attente de données...
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr
                  key={row.timestamp}
                  style={{
                    borderBottom: '1px solid #1a2333',
                    backgroundColor: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  {cols.map(c => {
                    const rawVal = row[c.key as keyof typeof row] as number
                    const mState = c.metric
                      ? getMetricState(c.metric, rawVal, thresholds)
                      : 'OK'
                    return (
                      <td
                        key={c.key}
                        className="px-3 py-1.5 tabular-nums whitespace-nowrap"
                        style={{ color: c.metric ? stateText[mState] : '#94a3b8' }}
                      >
                        {c.fmt(rawVal)}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setPage(0)}
          disabled={page === 0}
          className="px-3 py-1 rounded border text-xs font-mono disabled:opacity-30 transition-opacity"
          style={{ borderColor: '#1f2937', color: '#94a3b8', backgroundColor: '#111827' }}
        >
          «
        </button>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1 rounded border text-xs font-mono disabled:opacity-30 transition-opacity"
          style={{ borderColor: '#1f2937', color: '#94a3b8', backgroundColor: '#111827' }}
        >
          ‹ Préc.
        </button>
        <span className="text-xs font-mono px-2" style={{ color: '#64748b' }}>
          {page + 1} / {Math.max(1, totalPages)}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1 rounded border text-xs font-mono disabled:opacity-30 transition-opacity"
          style={{ borderColor: '#1f2937', color: '#94a3b8', backgroundColor: '#111827' }}
        >
          Suiv. ›
        </button>
        <button
          onClick={() => setPage(Math.max(0, totalPages - 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1 rounded border text-xs font-mono disabled:opacity-30 transition-opacity"
          style={{ borderColor: '#1f2937', color: '#94a3b8', backgroundColor: '#111827' }}
        >
          »
        </button>
      </div>
    </div>
  )
}
