'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckIcon, CpuIcon, RotateCcwIcon, UsbIcon } from 'lucide-react'
import { useBench } from '../BenchContext'
import { DEFAULT_THRESHOLDS, type Thresholds } from '@/lib/types'
import { useLanguage } from '../LanguageContext'

const METRIC_CONFIG = [
  { key: 'temp_echap',     label: 'Exhaust Temperature', unit: '°C',    step: 10,   min: 100,  max: 1200 },
  { key: 'temp_carburant', label: 'Fuel Temperature',   unit: '°C',    step: 1,    min: 20,   max: 150  },
  { key: 'rpm',            label: 'Engine Speed',        unit: 'rpm',   step: 100,  min: 500,  max: 12000 },
  { key: 'vibration',      label: 'Vibration',           unit: 'm/s²',  step: 0.1,  min: 0.1,  max: 10   },
  { key: 'temp_admission', label: 'Intake Temperature',   unit: '°C',    step: 1,    min: 10,   max: 200  },
]

export function Parametres() {
  const {
    thresholds,
    updateThresholds,
    resetThresholds,
    connectionStatus,
    history,
  } = useBench()

  const { t } = useLanguage()
  const [draft, setDraft] = useState<Thresholds>(() => ({ ...thresholds }))
  const [saved, setSaved]   = useState(false)
  const [diameter, setDiameter] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bench_motor_diam') ?? '85'
    }
    return '85'
  })

  // Sync draft with thresholds when context changes
  useEffect(() => {
    setDraft({ ...thresholds })
  }, [thresholds])

  // Detect which sensors are active during the session
  const activeSensors = useMemo(() => {
    return {
      temp_carburant: history.some(r => r.temp_carburant !== undefined),
      temp_echap:     history.some(r => r.temp_echap !== undefined),
      temp_admission: history.some(r => r.temp_admission !== undefined),
      rpm:            history.some(r => r.rpm !== undefined),
      vibration:      history.some(r => r.vibration !== undefined),
    }
  }, [history])

  // Filter configuration list to show only active metrics
  const activeConfigs = useMemo(() => {
    return METRIC_CONFIG.filter(cfg => activeSensors[cfg.key as keyof typeof activeSensors])
  }, [activeSensors])

  const handleChange = (metric: string, level: 'warning' | 'danger', value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    setDraft(prev => ({
      ...prev,
      [metric]: { ...prev[metric as keyof Thresholds], [level]: num },
    }))
    setSaved(false)
  }

  const handleSave = () => {
    updateThresholds(draft)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bench_motor_diam', diameter)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setDraft({ ...DEFAULT_THRESHOLDS })
    resetThresholds()
    setSaved(false)
  }

  // 1. Disconnected State
  if (connectionStatus !== 'connected') {
    return (
      <div className="p-6 max-w-md mx-auto text-center flex flex-col gap-4 items-center mt-20 bg-bench-surface rounded-lg border border-bench-border shadow-lg">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-bench-bg text-bench-muted border border-bench-border">
          <UsbIcon size={20} className="animate-pulse" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-bench-text font-mono">{t('settings.noSensors')}</h2>
          <p className="text-xs text-bench-muted leading-relaxed">
            {t('settings.connectFirst')}
          </p>
        </div>
      </div>
    )
  }

  // 2. Connected but no active sensors detected yet
  if (connectionStatus === 'connected' && activeConfigs.length === 0) {
    return (
      <div className="p-6 max-w-md mx-auto text-center flex flex-col gap-4 items-center mt-20 bg-bench-surface rounded-lg border border-bench-border shadow-lg">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-bench-bg text-emerald-500 border border-bench-border">
          <CpuIcon size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-bench-text font-mono">{t('settings.noSensors')}</h2>
          <p className="text-xs text-bench-muted leading-relaxed">
            {t('settings.connectFirst')}
          </p>
        </div>
      </div>
    )
  }

  // 3. Active state: Render inputs for active sensors
  return (
    <div className="p-4 flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-bench-muted">
          {t('settings.title')}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-colors cursor-pointer"
            style={{ borderColor: 'var(--bench-border)', color: 'var(--bench-muted)', backgroundColor: 'var(--bench-surface)' }}
          >
            <RotateCcwIcon size={12} />
            {t('settings.resetThresholds')}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded border text-xs font-mono font-semibold transition-colors cursor-pointer"
            style={{
              borderColor:     saved ? '#10b981' : 'var(--bench-info)',
              color:           saved ? '#10b981' : 'var(--bench-info)',
              backgroundColor: saved ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
            }}
          >
            {saved ? <><CheckIcon size={12} /> {t('action.saved')}</> : t('action.save')}
          </button>
        </div>
      </div>

      {/* Engine diameter */}
      <div
        className="rounded-md border p-4 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--bench-surface)', borderColor: 'var(--bench-border)' }}
      >
        <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--bench-muted)' }}>
          Engine Configuration
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium w-36" style={{ color: 'var(--bench-text)' }}>
            Engine Diameter
          </label>
          <input
            type="number"
            value={diameter}
            onChange={e => setDiameter(e.target.value)}
            className="w-24 rounded px-2.5 py-1.5 text-xs font-mono border outline-none"
            style={{ backgroundColor: 'var(--bench-input-bg)', borderColor: 'var(--bench-border)', color: 'var(--bench-text)' }}
            min="10"
            max="500"
            step="1"
          />
          <span className="text-xs font-mono" style={{ color: 'var(--bench-muted)' }}>mm</span>
        </div>
      </div>


      {/* Threshold config */}
      <div
        className="rounded-md border"
        style={{ backgroundColor: 'var(--bench-surface)', borderColor: 'var(--bench-border)' }}
      >
        <div
          className="px-4 py-2.5 border-b text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: 'var(--bench-muted)', borderColor: 'var(--bench-border)' }}
        >
          Alarm Thresholds for Active Sensors
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--bench-border)' }}>
          {activeConfigs.map(cfg => {
            const thr = draft[cfg.key as keyof Thresholds]
            return (
              <div key={cfg.key} className="px-4 py-4 flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold" style={{ color: 'var(--bench-text)' }}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--bench-muted)' }}>{cfg.unit}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Warning */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bench-warning)' }}>
                      {t('settings.warning')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={thr.warning}
                        onChange={e => handleChange(cfg.key, 'warning', e.target.value)}
                        step={cfg.step}
                        min={cfg.min}
                        max={cfg.max}
                        className="flex-1 rounded px-2.5 py-1 text-xs font-mono border outline-none font-semibold"
                        style={{
                          backgroundColor: 'var(--bench-input-bg)',
                          borderColor: 'var(--bench-warning)',
                          color: 'var(--bench-warning)',
                        }}
                      />
                      <span className="text-[10px]" style={{ color: 'var(--bench-muted)' }}>{cfg.unit}</span>
                    </div>
                  </div>
                  {/* Danger */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bench-danger)' }}>
                      {t('settings.danger')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={thr.danger}
                        onChange={e => handleChange(cfg.key, 'danger', e.target.value)}
                        step={cfg.step}
                        min={cfg.min}
                        max={cfg.max}
                        className="flex-1 rounded px-2.5 py-1 text-xs font-mono border outline-none font-semibold"
                        style={{
                          backgroundColor: 'var(--bench-input-bg)',
                          borderColor: 'var(--bench-danger)',
                          color: 'var(--bench-danger)',
                        }}
                      />
                      <span className="text-[10px]" style={{ color: 'var(--bench-muted)' }}>{cfg.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {saved && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded border text-xs font-mono"
          style={{ borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981' }}
          role="status"
          aria-live="polite"
        >
          <CheckIcon size={13} />
          {t('settings.thresholdsSaved')}
        </div>
      )}
    </div>
  )
}
