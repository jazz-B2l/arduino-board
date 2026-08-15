'use client'

import { useMemo, useState } from 'react'
import { AlertTriangleIcon, ZapIcon } from 'lucide-react'
import { useBench } from '../BenchContext'
import { METRIC_LABELS, METRIC_UNITS } from '@/lib/types'

type LevelFilter  = 'ALL' | 'WARNING' | 'DANGER'
type MetricFilter = 'ALL' | string

function relativeTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  return `${Math.floor(diff / 3600)} h ago`
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('en-US', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function Alarmes() {
  const { alarms } = useBench()
  const [levelFilter,  setLevelFilter]  = useState<LevelFilter>('ALL')
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('ALL')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const metricKeys = useMemo(() => {
    const keys = new Set(alarms.map(a => a.metric))
    return Array.from(keys)
  }, [alarms])

  const filtered = useMemo(() => {
    let result = [...alarms]
    if (levelFilter  !== 'ALL') result = result.filter(a => a.level  === levelFilter)
    if (metricFilter !== 'ALL') result = result.filter(a => a.metric === metricFilter)
    result.sort((a, b) => sortDir === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp)
    return result
  }, [alarms, levelFilter, metricFilter, sortDir])

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Alarm History
        </h1>
        <span className="text-xs font-mono" style={{ color: '#475569' }}>
          {filtered.length} / {alarms.length} alarms
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Level filter */}
        <div className="flex gap-1">
          {(['ALL', 'WARNING', 'DANGER'] as LevelFilter[]).map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className="px-3 py-1 rounded border text-[11px] font-mono font-medium transition-colors"
              style={{
                borderColor: levelFilter === l
                  ? l === 'DANGER' ? '#ef4444' : l === 'WARNING' ? '#f59e0b' : '#3b82f6'
                  : '#1f2937',
                backgroundColor: levelFilter === l
                  ? l === 'DANGER' ? 'rgba(239,68,68,0.12)' : l === 'WARNING' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)'
                  : 'transparent',
                color: levelFilter === l
                  ? l === 'DANGER' ? '#ef4444' : l === 'WARNING' ? '#f59e0b' : '#3b82f6'
                  : '#475569',
              }}
            >
              {l === 'ALL' ? 'All' : l}
            </button>
          ))}
        </div>

        <span className="opacity-30 text-xs" style={{ color: '#475569' }}>|</span>

        {/* Metric filter */}
        <select
          value={metricFilter}
          onChange={e => setMetricFilter(e.target.value)}
          className="text-xs font-mono rounded border px-2 py-1 outline-none"
          style={{
            backgroundColor: '#111827',
            borderColor: '#1f2937',
            color: '#94a3b8',
          }}
        >
          <option value="ALL">All Metrics</option>
          {metricKeys.map(k => (
            <option key={k} value={k}>{METRIC_LABELS[k] ?? k}</option>
          ))}
        </select>

        <span className="opacity-30 text-xs" style={{ color: '#475569' }}>|</span>

        {/* Sort */}
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="px-3 py-1 rounded border text-[11px] font-mono transition-colors"
          style={{ borderColor: '#1f2937', color: '#64748b', backgroundColor: '#111827' }}
        >
          {sortDir === 'desc' ? '↓ Newest' : '↑ Oldest'}
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-md border overflow-x-auto"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2937', backgroundColor: '#0d1220' }}>
              <th className="px-3 py-2.5 text-left w-8" />
              <th className="px-3 py-2.5 text-left font-semibold tracking-wider uppercase text-[10px]" style={{ color: '#64748b' }}>Timestamp</th>
              <th className="px-3 py-2.5 text-left font-semibold tracking-wider uppercase text-[10px]" style={{ color: '#64748b' }}>Metric</th>
              <th className="px-3 py-2.5 text-left font-semibold tracking-wider uppercase text-[10px]" style={{ color: '#64748b' }}>Level</th>
              <th className="px-3 py-2.5 text-right font-semibold tracking-wider uppercase text-[10px]" style={{ color: '#64748b' }}>Value</th>
              <th className="px-3 py-2.5 text-right font-semibold tracking-wider uppercase text-[10px]" style={{ color: '#64748b' }}>Relative</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center" style={{ color: '#475569' }}>
                  No alarms matching filters
                </td>
              </tr>
            ) : (
              filtered.map(alarm => (
                <tr
                  key={alarm.id}
                  style={{
                    borderBottom: '1px solid #1a2333',
                    backgroundColor: alarm.level === 'DANGER' ? 'rgba(239,68,68,0.03)' : 'rgba(245,158,11,0.02)',
                  }}
                >
                  <td className="px-3 py-2 w-8">
                    {alarm.level === 'DANGER'
                      ? <ZapIcon size={12} style={{ color: '#ef4444' }} />
                      : <AlertTriangleIcon size={12} style={{ color: '#f59e0b' }} />
                    }
                  </td>
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap" style={{ color: '#94a3b8' }}>
                    {formatDateTime(alarm.timestamp)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#e2e8f0' }}>
                    {METRIC_LABELS[alarm.metric] ?? alarm.metric}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="px-2 py-0.5 rounded-sm text-[10px] font-semibold"
                      style={{
                        backgroundColor: alarm.level === 'DANGER' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color:           alarm.level === 'DANGER' ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {alarm.level}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ color: '#e2e8f0' }}>
                    {alarm.metric === 'rpm'
                      ? alarm.value.toLocaleString('en-US')
                      : alarm.value.toFixed(2)
                    }
                    {' '}
                    <span style={{ color: '#475569' }}>{METRIC_UNITS[alarm.metric] ?? ''}</span>
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: '#64748b' }}>
                    {relativeTime(alarm.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
