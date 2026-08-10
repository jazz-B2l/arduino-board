'use client'

import { useMemo } from 'react'
import { DownloadIcon, FileTextIcon } from 'lucide-react'
import { useBench } from '../BenchContext'
import { METRIC_LABELS, METRIC_UNITS } from '@/lib/types'

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('fr-FR')
}

function rowToCsv(r: Record<string, unknown>) {
  return Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(';'), ...rows.map(rowToCsv)].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function historyToRows(readings: ReturnType<typeof useBench>['history']) {
  return readings.map(r => ({
    'Horodatage':         formatDateTime(r.timestamp),
    'Temp. Carburant (°C)': r.temp_carburant.toFixed(1),
    'Temp. Échap. (°C)':  r.temp_echap.toFixed(1),
    'Temp. Admiss. (°C)': r.temp_admission.toFixed(1),
    'Régime (tr/min)':    r.rpm.toString(),
    'Vitesse (m/s)':      r.vitesse.toFixed(2),
    'Vibration (m/s²)':   r.vibration.toFixed(3),
  }))
}

export function Rapports() {
  const { history, alarms, stats } = useBench()

  // Last 10 minutes
  const last10min = useMemo(() => {
    const cutoff = Date.now() - 10 * 60 * 1000
    return history.filter(r => r.timestamp >= cutoff)
  }, [history])

  const totalTimeRange = history.length > 0
    ? `${formatDateTime(history[0].timestamp)} → ${formatDateTime(history[history.length - 1].timestamp)}`
    : '—'

  const last10TimeRange = last10min.length > 0
    ? `${formatDateTime(last10min[0].timestamp)} → ${formatDateTime(last10min[last10min.length - 1].timestamp)}`
    : '—'

  const alarmRows = useMemo(() => alarms.map(a => ({
    'Horodatage': formatDateTime(a.timestamp),
    'Métrique':   METRIC_LABELS[a.metric] ?? a.metric,
    'Niveau':     a.level,
    'Valeur':     a.metric === 'rpm' ? a.value.toLocaleString('fr-FR') : a.value.toFixed(2),
    'Unité':      METRIC_UNITS[a.metric] ?? '',
  })), [alarms])

  const exports = [
    {
      id:       'full',
      title:    'Session complète',
      icon:     FileTextIcon,
      rows:     history.length,
      timeRange: totalTimeRange,
      color:    '#3b82f6',
      onDownload: () => downloadCsv(`bench_session_${Date.now()}.csv`, historyToRows(history)),
    },
    {
      id:       '10min',
      title:    'Dernières 10 minutes',
      icon:     FileTextIcon,
      rows:     last10min.length,
      timeRange: last10TimeRange,
      color:    '#10b981',
      onDownload: () => downloadCsv(`bench_10min_${Date.now()}.csv`, historyToRows(last10min)),
    },
    {
      id:       'alarms',
      title:    'Journal des alarmes',
      icon:     FileTextIcon,
      rows:     alarms.length,
      timeRange: alarms.length > 0
        ? `${formatDateTime(alarms[alarms.length - 1].timestamp)} → ${formatDateTime(alarms[0].timestamp)}`
        : '—',
      color:    '#f59e0b',
      onDownload: () => downloadCsv(`bench_alarmes_${Date.now()}.csv`, alarmRows),
    },
  ]

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
        Rapports &amp; Export CSV
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exports.map(exp => (
          <div
            key={exp.id}
            className="rounded-md border flex flex-col gap-4 p-5"
            style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
          >
            <div className="flex items-center gap-2">
              <exp.icon size={16} style={{ color: exp.color }} />
              <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                {exp.title}
              </span>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-2 text-xs font-mono">
              <div className="flex justify-between">
                <span style={{ color: '#64748b' }}>Lignes</span>
                <span style={{ color: '#94a3b8' }}>{exp.rows.toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span style={{ color: '#64748b' }}>Plage temporelle</span>
                <span className="text-[10px]" style={{ color: '#64748b' }}>{exp.timeRange}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#64748b' }}>Format</span>
                <span style={{ color: '#94a3b8' }}>CSV (UTF-8, séparateur ;)</span>
              </div>
            </div>

            <button
              onClick={exp.onDownload}
              disabled={exp.rows === 0}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded border text-xs font-mono font-semibold transition-opacity disabled:opacity-30"
              style={{
                borderColor:     exp.color,
                color:           exp.color,
                backgroundColor: `${exp.color}18`,
              }}
            >
              <DownloadIcon size={13} />
              Télécharger ({exp.rows.toLocaleString('fr-FR')} lignes)
            </button>
          </div>
        ))}
      </div>

      {/* Session summary */}
      <div
        className="rounded-md border p-4 text-xs font-mono"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        <div
          className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
          style={{ color: '#475569' }}
        >
          Résumé de session
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Trames totales',   value: stats.totalFrames.toLocaleString('fr-FR') },
            { label: 'Trames invalides', value: stats.invalidFrames.toString() },
            { label: 'Alarmes total',    value: alarms.length.toString() },
            { label: 'Mode',             value: 'Démo — Simulation' },
          ].map(item => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <span style={{ color: '#475569' }}>{item.label}</span>
              <span style={{ color: '#94a3b8' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
