'use client'

import { useMemo, useState } from 'react'
import { useBench } from '../BenchContext'
import { getMetricState } from '@/lib/types'
import { RotateCcw, Play, Pause } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

const PAGE_SIZE = 50

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', {
    day: '2-digit', month: '2-digit',
  })
}

const stateText: Record<string, string> = {
  OK:      '#10b981',
  WARNING: '#f59e0b',
  DANGER:  '#ef4444',
}

export function Donnees() {
  const { history, thresholds, restart } = useBench()
  const { t } = useLanguage()
  const [page, setPage] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [pausedHistory, setPausedHistory] = useState<typeof history | null>(null)

  const displayHistory = isPaused && pausedHistory ? pausedHistory : history
  const totalPages = Math.ceil(displayHistory.length / PAGE_SIZE)

  // Always show newest first
  const rows = useMemo(() => {
    const sorted = [...displayHistory].reverse()
    return sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  }, [displayHistory, page])

  // Identify active sensors
  const activeSensors = useMemo(() => {
    return {
      temp_carburant: displayHistory.some(r => r.temp_carburant !== undefined),
      temp_echap:     displayHistory.some(r => r.temp_echap !== undefined),
      temp_admission: displayHistory.some(r => r.temp_admission !== undefined),
      rpm:            displayHistory.some(r => r.rpm !== undefined),
      vitesse:        displayHistory.some(r => r.vitesse !== undefined),
      vibration:      displayHistory.some(r => r.vibration !== undefined),
    }
  }, [displayHistory])

  // Build active columns dynamically
  const cols = useMemo(() => {
    const allCols = [
      { key: 'timestamp',      label: t('data.timestamp'),  fmt: (v: number) => `${fmtDate(v)} ${fmtTime(v)}`, metric: null },
      { key: 'temp_carburant', label: t('data.fuel'),         fmt: (v: number) => v !== undefined ? v.toFixed(1) : '--',                  metric: 'temp_carburant' },
      { key: 'temp_echap',     label: t('data.exhaust'),      fmt: (v: number) => v !== undefined ? v.toFixed(1) : '--',                  metric: 'temp_echap' },
      { key: 'temp_admission', label: t('data.intake'),       fmt: (v: number) => v !== undefined ? v.toFixed(1) : '--',                  metric: 'temp_admission' },
      { key: 'rpm',            label: t('data.rpm'),          fmt: (v: number) => v !== undefined ? v.toLocaleString('en-US') : '--',     metric: 'rpm' },
      { key: 'vitesse',        label: t('data.speed'),        fmt: (v: number) => v !== undefined ? v.toFixed(2) : '--',                  metric: null },
      { key: 'vibration',      label: t('data.vibration'),    fmt: (v: number) => v !== undefined ? v.toFixed(3) : '--',                  metric: 'vibration' },
    ]
    return allCols.filter(col => {
      if (col.key === 'timestamp') return true
      return activeSensors[col.key as keyof typeof activeSensors]
    })
  }, [activeSensors])

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold uppercase tracking-widest text-bench-text">
            {t('data.title')}
          </h1>
          <button
            onClick={() => {
              if (isPaused) {
                setIsPaused(false)
                setPausedHistory(null)
              } else {
                setIsPaused(true)
                setPausedHistory(history)
              }
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              isPaused
                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/35 hover:border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.05)]'
                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/35 hover:border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.05)]'
            }`}
            title={isPaused ? "Resume registering raw data updates" : "Stop registering raw data updates in this view"}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            {isPaused ? t('action.resume') : t('action.stop')}
          </button>
          <button
            onClick={() => {
              if (window.confirm(t('data.confirmRestore'))) {
                restart()
                setIsPaused(false)
                setPausedHistory(null)
                setPage(0)
              }
            }}
            className="px-2.5 py-1 rounded text-[11px] font-mono border transition-all duration-200 cursor-pointer flex items-center gap-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/35 hover:border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.05)]"
            title="Delete all raw data and restart telemetry feed"
          >
            <RotateCcw size={12} />
            {t('action.restore')}
          </button>
        </div>
        <span className="text-xs font-mono text-bench-muted">
          {displayHistory.length.toLocaleString('en-US')} samples — page {page + 1}/{Math.max(1, totalPages)}
        </span>
      </div>

      <div
        className="rounded-md border overflow-x-auto"
        style={{ backgroundColor: 'var(--bench-surface)', borderColor: 'var(--bench-border)' }}
      >
        <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bench-border)', backgroundColor: 'var(--bench-header-bg)' }}>
              {cols.map(c => (
                <th
                  key={c.key}
                  className="px-3 py-2.5 text-left whitespace-nowrap font-semibold tracking-wider uppercase text-[10px]"
                  style={{ color: 'var(--bench-muted)' }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 || cols.length <= 1 ? (
              <tr>
                <td
                  colSpan={cols.length || 1}
                  className="px-4 py-8 text-center"
                  style={{ color: 'var(--bench-muted)' }}
                >
                  {t('data.waiting')}
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr
                  key={row.timestamp}
                  style={{
                    borderBottom: '1px solid var(--bench-border)',
                    backgroundColor: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  {cols.map(c => {
                    const rawVal = row[c.key as keyof typeof row] as number
                    const mState = c.metric && rawVal !== undefined
                      ? getMetricState(c.metric, rawVal, thresholds)
                      : 'OK'
                    return (
                      <td
                        key={c.key}
                        className="px-3 py-1.5 tabular-nums whitespace-nowrap"
                        style={{ color: c.metric && rawVal !== undefined ? stateText[mState] : 'var(--bench-text)' }}
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
          className="px-3 py-1 rounded border text-xs font-mono disabled:opacity-30 transition-opacity cursor-pointer"
          style={{ borderColor: 'var(--bench-border)', color: 'var(--bench-text)', backgroundColor: 'var(--bench-surface)' }}
        >
          «
        </button>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1 rounded border text-xs font-mono disabled:opacity-30 transition-opacity cursor-pointer"
          style={{ borderColor: 'var(--bench-border)', color: 'var(--bench-text)', backgroundColor: 'var(--bench-surface)' }}
        >
          ‹ {t('data.prev')}
        </button>
        <span className="text-xs font-mono px-2" style={{ color: 'var(--bench-muted)' }}>
          {page + 1} / {Math.max(1, totalPages)}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1 rounded border text-xs font-mono disabled:opacity-30 transition-opacity cursor-pointer"
          style={{ borderColor: 'var(--bench-border)', color: 'var(--bench-text)', backgroundColor: 'var(--bench-surface)' }}
        >
          {t('data.next')} ›
        </button>
        <button
          onClick={() => setPage(Math.max(0, totalPages - 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1 rounded border text-xs font-mono disabled:opacity-30 transition-opacity cursor-pointer"
          style={{ borderColor: 'var(--bench-border)', color: 'var(--bench-text)', backgroundColor: 'var(--bench-surface)' }}
        >
          »
        </button>
      </div>
    </div>
  )
}
