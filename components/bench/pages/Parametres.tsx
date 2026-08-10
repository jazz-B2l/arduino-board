'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckIcon, CpuIcon, RotateCcwIcon, UsbIcon } from 'lucide-react'
import { useBench } from '../BenchContext'
import { DEFAULT_THRESHOLDS, type Thresholds } from '@/lib/types'

const METRIC_CONFIG = [
  { key: 'temp_echap',     label: 'Température Échappement', unit: '°C',    step: 10,   min: 100,  max: 1200 },
  { key: 'temp_carburant', label: 'Température Carburant',   unit: '°C',    step: 1,    min: 20,   max: 150  },
  { key: 'rpm',            label: 'Régime moteur',           unit: 'tr/min', step: 100, min: 500,  max: 12000 },
  { key: 'vibration',      label: 'Vibration',               unit: 'm/s²',  step: 0.1,  min: 0.1,  max: 10   },
  { key: 'temp_admission', label: 'Température Admission',   unit: '°C',    step: 1,    min: 10,   max: 200  },
]

export function Parametres() {
  const {
    thresholds,
    updateThresholds,
    resetThresholds,
    connectionStatus,
    history,
  } = useBench()

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
      <div className="p-6 max-w-md mx-auto text-center flex flex-col gap-4 items-center mt-20 bg-[#111827] rounded-lg border shadow-lg" style={{ borderColor: '#1f2937' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-950/30 text-slate-500 border border-slate-900">
          <UsbIcon size={20} className="animate-pulse" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-slate-300 font-mono">Configuration indisponible</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Veuillez brancher votre carte Arduino et lancer l&apos;acquisition depuis le tableau de bord pour configurer vos capteurs actifs.
          </p>
        </div>
      </div>
    )
  }

  // 2. Connected but no active sensors detected yet
  if (connectionStatus === 'connected' && activeConfigs.length === 0) {
    return (
      <div className="p-6 max-w-md mx-auto text-center flex flex-col gap-4 items-center mt-20 bg-[#111827] rounded-lg border shadow-lg" style={{ borderColor: '#1f2937' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-950/30 text-emerald-500 border border-slate-900">
          <CpuIcon size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-slate-300 font-mono">En attente de capteurs actifs</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Aucun capteur n&apos;a été détecté pour le moment. Transmettez des signaux de télémétrie depuis l&apos;Arduino pour pouvoir les configurer.
          </p>
        </div>
      </div>
    )
  }

  // 3. Active state: Render inputs for active sensors
  return (
    <div className="p-4 flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Paramètres
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-colors"
            style={{ borderColor: '#1f2937', color: '#64748b', backgroundColor: '#111827' }}
          >
            <RotateCcwIcon size={12} />
            Restaurer les valeurs par défaut
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded border text-xs font-mono font-semibold transition-colors"
            style={{
              borderColor:     saved ? '#10b981' : '#3b82f6',
              color:           saved ? '#10b981' : '#3b82f6',
              backgroundColor: saved ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
            }}
          >
            {saved ? <><CheckIcon size={12} /> Sauvegardé</> : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Motor diameter */}
      <div
        className="rounded-md border p-4 flex flex-col gap-3"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>
          Configuration moteur
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium w-36" style={{ color: '#94a3b8' }}>
            Diamètre moteur
          </label>
          <input
            type="number"
            value={diameter}
            onChange={e => setDiameter(e.target.value)}
            className="w-24 rounded px-2.5 py-1.5 text-xs font-mono border outline-none"
            style={{ backgroundColor: '#0d1220', borderColor: '#1f2937', color: '#e2e8f0' }}
            min="10"
            max="500"
            step="1"
          />
          <span className="text-xs font-mono" style={{ color: '#64748b' }}>mm</span>
        </div>
      </div>

      {/* Threshold config */}
      <div
        className="rounded-md border"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        <div
          className="px-4 py-2.5 border-b text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: '#475569', borderColor: '#1f2937' }}
        >
          Seuils d&apos;alarme pour capteurs actifs
        </div>

        <div className="divide-y" style={{ borderColor: '#1f2937' }}>
          {activeConfigs.map(cfg => {
            const t = draft[cfg.key as keyof Thresholds]
            return (
              <div key={cfg.key} className="px-4 py-4 flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: '#475569' }}>{cfg.unit}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Warning */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
                      Seuil Warning
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={t.warning}
                        onChange={e => handleChange(cfg.key, 'warning', e.target.value)}
                        step={cfg.step}
                        min={cfg.min}
                        max={cfg.max}
                        className="flex-1 rounded px-2.5 py-1 text-xs font-mono border outline-none"
                        style={{
                          backgroundColor: '#0d1220',
                          borderColor: '#f59e0b40',
                          color: '#f59e0b',
                        }}
                      />
                      <span className="text-[10px]" style={{ color: '#475569' }}>{cfg.unit}</span>
                    </div>
                  </div>
                  {/* Danger */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#ef4444' }}>
                      Seuil Danger
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={t.danger}
                        onChange={e => handleChange(cfg.key, 'danger', e.target.value)}
                        step={cfg.step}
                        min={cfg.min}
                        max={cfg.max}
                        className="flex-1 rounded px-2.5 py-1 text-xs font-mono border outline-none"
                        style={{
                          backgroundColor: '#0d1220',
                          borderColor: '#ef444440',
                          color: '#ef4444',
                        }}
                      />
                      <span className="text-[10px]" style={{ color: '#475569' }}>{cfg.unit}</span>
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
          Paramètres sauvegardés avec succès
        </div>
      )}
    </div>
  )
}
