'use client'

import { useMemo } from 'react'
import { DownloadIcon, FileTextIcon } from 'lucide-react'
import { useBench } from '../BenchContext'
import { useLanguage } from '../LanguageContext'

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('en-US')
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

function historyToRows(readings: ReturnType<typeof useBench>['history'], t: (k: string) => string) {
  return readings.map(r => ({
    [t('data.timestamp')]:          formatDateTime(r.timestamp),
    [t('data.fuel')]:               r.temp_carburant !== undefined ? r.temp_carburant.toFixed(1) : '',
    [t('data.exhaust')]:            r.temp_echap !== undefined ? r.temp_echap.toFixed(1) : '',
    [t('data.intake')]:             r.temp_admission !== undefined ? r.temp_admission.toFixed(1) : '',
    [t('metric.rpm')]:              r.rpm !== undefined ? r.rpm.toString() : '',
    [t('metric.vitesse')]:          r.vitesse !== undefined ? r.vitesse.toFixed(2) : '',
    [t('metric.vibration')]:        r.vibration !== undefined ? r.vibration.toFixed(3) : '',
  }))
}

export function Rapports() {
  const { history, alarms, stats } = useBench()
  const { t } = useLanguage()

  // Resolve localized units dynamically
  const getUnit = (metric: string) => {
    if (metric.startsWith('temp_')) return t('unit.temp')
    if (metric === 'rpm') return t('unit.rpm')
    if (metric === 'vitesse') return t('unit.vitesse')
    if (metric === 'vibration') return t('unit.vibration')
    return ''
  }

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
    [t('alarms.timestamp')]: formatDateTime(a.timestamp),
    [t('alarms.metric')]:    t('metric.' + a.metric),
    [t('alarms.level')]:     a.level === 'DANGER' ? t('alarms.danger') : t('alarms.warning'),
    [t('alarms.value')]:     a.metric === 'rpm' ? a.value.toLocaleString('en-US') : a.value.toFixed(2),
    [t('alarms.level') === 'Level' ? 'Unit' : 'الوحدة']: getUnit(a.metric),
  })), [alarms, t])

  const exports = [
    {
      id:       'full',
      title:    t('reports.fullSession'),
      icon:     FileTextIcon,
      rows:     history.length,
      timeRange: totalTimeRange,
      color:    '#3b82f6',
      onDownload: () => downloadCsv(`bench_session_${Date.now()}.csv`, historyToRows(history, t)),
    },
    {
      id:       '10min',
      title:    t('reports.last10min'),
      icon:     FileTextIcon,
      rows:     last10min.length,
      timeRange: last10TimeRange,
      color:    '#10b981',
      onDownload: () => downloadCsv(`bench_10min_${Date.now()}.csv`, historyToRows(last10min, t)),
    },
    {
      id:       'alarms',
      title:    t('reports.alarmLog'),
      icon:     FileTextIcon,
      rows:     alarms.length,
      timeRange: alarms.length > 0
        ? `${formatDateTime(alarms[alarms.length - 1].timestamp)} → ${formatDateTime(alarms[0].timestamp)}`
        : '—',
      color:    '#f59e0b',
      onDownload: () => downloadCsv(`bench_alarms_${Date.now()}.csv`, alarmRows),
    },
  ]

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-sm font-semibold uppercase tracking-widest text-bench-text">
        {t('reports.title')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exports.map(exp => (
          <div
            key={exp.id}
            className="rounded-md border flex flex-col gap-4 p-5"
            style={{ backgroundColor: 'var(--bench-surface)', borderColor: 'var(--bench-border)' }}
          >
            <div className="flex items-center gap-2">
              <exp.icon size={16} style={{ color: exp.color }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--bench-text)' }}>
                {exp.title}
              </span>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-2 text-xs font-mono">
              <div className="flex justify-between">
                <span style={{ color: 'var(--bench-muted)' }}>{t('reports.rows')}</span>
                <span style={{ color: 'var(--bench-text)' }}>{exp.rows.toLocaleString('en-US')}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span style={{ color: 'var(--bench-muted)' }}>{t('reports.timeRange')}</span>
                <span className="text-[10px]" style={{ color: 'var(--bench-muted)' }}>{exp.timeRange}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--bench-muted)' }}>{t('reports.format')}</span>
                <span style={{ color: 'var(--bench-text)' }}>{t('reports.formatValue')}</span>
              </div>
            </div>

            <button
              onClick={exp.onDownload}
              disabled={exp.rows === 0}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded border text-xs font-mono font-semibold transition-opacity disabled:opacity-30 cursor-pointer"
              style={{
                borderColor:     exp.color,
                color:           exp.color,
                backgroundColor: `${exp.color}18`,
              }}
            >
              <DownloadIcon size={13} />
              {t('reports.download')} ({exp.rows.toLocaleString('en-US')} {t('reports.rows').toLowerCase()})
            </button>
          </div>
        ))}
      </div>

      {/* Session summary */}
      <div
        className="rounded-md border p-4 text-xs font-mono"
        style={{ backgroundColor: 'var(--bench-surface)', borderColor: 'var(--bench-border)' }}
      >
        <div
          className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
          style={{ color: 'var(--bench-muted)' }}
        >
          {t('reports.sessionSummary')}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('reports.totalFrames'),   value: stats.totalFrames.toLocaleString('en-US') },
            { label: t('reports.invalidFrames'), value: stats.invalidFrames.toString() },
            { label: t('reports.totalAlarms'),   value: alarms.length.toString() },
            { label: t('reports.source'),        value: stats.port !== 'None' ? `${t('reports.serialPort')} (${stats.port})` : t('reports.portDisconnected') },
          ].map(item => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <span style={{ color: 'var(--bench-muted)' }}>{item.label}</span>
              <span style={{ color: 'var(--bench-text)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
