'use client'

import { AlertTriangleIcon, ZapIcon } from 'lucide-react'
import type { AlarmEvent } from '@/lib/types'
import { useLanguage } from './LanguageContext'

interface RecentAlarmsProps {
  alarms: AlarmEvent[]
  limit?: number
}

function relativeTime(ts: number, lang: string) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (lang === 'ar') {
    if (diff < 60)   return `منذ ${diff} ثانية`
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
    return `منذ ${Math.floor(diff / 3600)} ساعة`
  } else {
    if (diff < 60)   return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }
}

export function RecentAlarms({ alarms, limit = 10 }: RecentAlarmsProps) {
  const { t, lang } = useLanguage()
  const shown = alarms.slice(0, limit)

  // Resolve localized units dynamically
  const getUnit = (metric: string) => {
    if (metric.startsWith('temp_')) return t('unit.temp')
    if (metric === 'rpm') return t('unit.rpm')
    if (metric === 'vitesse') return t('unit.vitesse')
    if (metric === 'vibration') return t('unit.vibration')
    return ''
  }

  return (
    <div
      className="rounded-md border flex flex-col shadow-sm"
      style={{ backgroundColor: 'var(--bench-surface)', borderColor: 'var(--bench-border)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: 'var(--bench-border)' }}
      >
        <AlertTriangleIcon size={14} style={{ color: '#f59e0b' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--bench-text)' }}>
          {t('alarms.recent')}
        </span>
        {alarms.length > 0 && (
          <span
            className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            {alarms.length}
          </span>
        )}
      </div>

      <div className="flex flex-col divide-y" style={{ borderColor: 'var(--bench-border)' }}>
        {shown.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--bench-muted)' }}>
            {t('alarms.nominal')}
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
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--bench-text)' }}>
                  {t('metric.' + alarm.metric)}
                </div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--bench-muted)' }}>
                  {alarm.value.toFixed(alarm.metric === 'rpm' ? 0 : 2)}{' '}
                  {getUnit(alarm.metric)}
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
                  {alarm.level === 'DANGER' ? t('alarms.danger') : t('alarms.warning')}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--bench-muted)' }}>{relativeTime(alarm.timestamp, lang)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
