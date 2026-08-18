'use client'

import { useMemo, useState } from 'react'
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useBench } from '../BenchContext'
import { useLanguage } from '../LanguageContext'

const METRICS = [
  { key: 'temp_carburant', label: 'Fuel (°C)',    color: '#3b82f6' },
  { key: 'temp_echap',     label: 'Exhaust (°C)', color: '#f59e0b' },
  { key: 'temp_admission', label: 'Intake (°C)',    color: '#8b5cf6' },
  { key: 'rpm',            label: 'RPM (rpm)',       color: '#10b981' },
  { key: 'vitesse',        label: 'Speed (m/s)',     color: '#06b6d4' },
  { key: 'vibration',      label: 'Vibration (m/s²)', color: '#ef4444' },
]

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string | number
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded border p-3 text-xs font-mono flex flex-col gap-1 shadow-md"
      style={{ backgroundColor: 'var(--bench-header-bg)', borderColor: 'var(--bench-border)' }}
    >
      <div className="mb-1" style={{ color: 'var(--bench-muted)' }}>{typeof label === 'number' ? formatTime(label) : label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: 'var(--bench-text)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--bench-text)' }}>{typeof p.value === 'number' ? p.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function Graphiques() {
  const { history } = useBench()
  const { t } = useLanguage()
  const [visible, setVisible] = useState<Set<string>>(new Set(METRICS.map(m => m.key)))

  // Identify active sensors from session history
  const activeMetrics = useMemo(() => {
    const activeSensors = {
      temp_carburant: history.some(r => r.temp_carburant !== undefined),
      temp_echap:     history.some(r => r.temp_echap !== undefined),
      temp_admission: history.some(r => r.temp_admission !== undefined),
      rpm:            history.some(r => r.rpm !== undefined),
      vitesse:        history.some(r => r.vitesse !== undefined),
      vibration:      history.some(r => r.vibration !== undefined),
    }
    return METRICS.filter(m => activeSensors[m.key as keyof typeof activeSensors])
  }, [history])

  // Last 600 samples (10 minutes at 1 Hz)
  const chartData = useMemo(() => {
    return history.slice(-600).map(r => ({
      timestamp:      r.timestamp,
      temp_carburant: r.temp_carburant,
      temp_echap:     r.temp_echap,
      temp_admission: r.temp_admission,
      rpm:            r.rpm,
      vitesse:        r.vitesse,
      vibration:      r.vibration,
    }))
  }, [history])

  const toggle = (key: string) => {
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-bench-text">
          {t('charts.title')}
        </h1>
        <span className="text-xs font-mono text-bench-muted">
          {chartData.length} {t('charts.points')}
        </span>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-2">
        {activeMetrics.map(m => (
          <button
            key={m.key}
            onClick={() => toggle(m.key)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-opacity cursor-pointer"
            style={{
              borderColor:     visible.has(m.key) ? m.color : 'var(--bench-border)',
              backgroundColor: visible.has(m.key) ? `${m.color}18` : 'transparent',
              color:           visible.has(m.key) ? m.color : 'var(--bench-muted)',
              opacity: 1,
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: visible.has(m.key) ? m.color : 'var(--bench-border)' }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div
        className="rounded-md border p-4 shadow-sm"
        style={{ backgroundColor: 'var(--bench-surface)', borderColor: 'var(--bench-border)' }}
      >
        {chartData.length < 2 || activeMetrics.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-bench-muted">
            {t('charts.waiting')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="var(--bench-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                tick={{ fill: 'var(--bench-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                stroke="var(--bench-border)"
                minTickGap={60}
              />
              <YAxis
                tick={{ fill: 'var(--bench-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                stroke="var(--bench-border)"
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Brush
                dataKey="timestamp"
                tickFormatter={formatTime}
                height={24}
                stroke="var(--bench-border)"
                fill="var(--bench-bg)"
                travellerWidth={6}
                style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
              />
              {activeMetrics.filter(m => visible.has(m.key)).map(m => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
