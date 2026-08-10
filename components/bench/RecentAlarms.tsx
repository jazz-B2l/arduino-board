'use client'

import { AlertTriangleIcon, ZapIcon } from 'lucide-react'
import type { AlarmEvent } from '@/lib/types'
import { METRIC_LABELS, METRIC_UNITS } from '@/lib/types'

interface RecentAlarmsProps {
  alarms: AlarmEvent[]
  limit?: number
}

function relativeTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)   return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  return `il y a ${Math.floor(diff / 3600)}h`
}

export function RecentAlarms({ alarms, limit = 10 }: RecentAlarmsProps) {
  const shown = alarms.slice(0, limit)

  return (
    <div
      className="rounded-md border flex flex-col"
      style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: '#1f2937' }}
      >
        <AlertTriangleIcon size={14} style={{ color: '#f59e0b' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Alarmes récentes
        </span>
        {alarms.length > 0 && (
          <span
            className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            {alarms.length}
          </span>
        )}
      </div>

      <div className="flex flex-col divide-y" style={{ borderColor: '#1f2937' }}>
        {shown.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs" style={{ color: '#475569' }}>
            Aucune alarme — système nominal
          </div>
        ) : (
          shown.map(alarm => (
            <div
              key={alarm.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                backgroundColor: alarm.level === 'DANGER' ? 'rgba(239,68,68,0.04)' : 'rgba(245,158,11,0.04)',
              }}
            >
              {alarm.level === 'DANGER'
                ? <ZapIcon size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                : <AlertTriangleIcon size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
              }

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>
                  {METRIC_LABELS[alarm.metric] ?? alarm.metric}
                </div>
                <div className="text-[10px] font-mono" style={{ color: '#64748b' }}>
                  {alarm.value.toFixed(alarm.metric === 'rpm' ? 0 : 2)}{' '}
                  {METRIC_UNITS[alarm.metric] ?? ''}
                </div>
              </div>

              <div className="flex flex-col items-end gap-0.5">
                <span
                  className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: alarm.level === 'DANGER' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: alarm.level === 'DANGER' ? '#ef4444' : '#f59e0b',
                  }}
                >
                  {alarm.level}
                </span>
                <span className="text-[10px]" style={{ color: '#475569' }}>{relativeTime(alarm.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
