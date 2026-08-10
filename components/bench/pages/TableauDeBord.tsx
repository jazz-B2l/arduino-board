'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBench } from '../BenchContext'
import { AnalogGauge } from '../AnalogGauge'
import { TempDisplay } from '../TempDisplay'
import { Sparkline } from '../Sparkline'
import { RecentAlarms } from '../RecentAlarms'
import { getMetricState, type Thresholds } from '@/lib/types'
import { CheckIcon, CpuIcon, RefreshCwIcon, UsbIcon } from 'lucide-react'

const RPM_ZONES = [
  { from: 0,    to: 0.55,  color: '#3b82f6' },
  { from: 0.55, to: 0.78,  color: '#10b981' },
  { from: 0.78, to: 0.92,  color: '#f59e0b' },
  { from: 0.92, to: 1,     color: '#ef4444' },
]
const VIT_ZONES = [
  { from: 0,    to: 0.4,   color: '#3b82f6' },
  { from: 0.4,  to: 0.75,  color: '#10b981' },
  { from: 0.75, to: 0.9,   color: '#f59e0b' },
  { from: 0.9,  to: 1,     color: '#ef4444' },
]
const VIB_ZONES = [
  { from: 0,    to: 0.45,  color: '#3b82f6' },
  { from: 0.45, to: 0.72,  color: '#10b981' },
  { from: 0.72, to: 0.88,  color: '#f59e0b' },
  { from: 0.88, to: 1,     color: '#ef4444' },
]

export function TableauDeBord() {
  const {
    latest,
    history,
    thresholds,
    alarms,
    connect,
    connectionStatus,
    serialError,
    serialSupported,
    updateThresholds,
  } = useBench()

  const [draft, setDraft] = useState<Thresholds>(() => ({ ...thresholds }))
  const [saved, setSaved] = useState(false)

  // Sync draft with thresholds when context changes
  useEffect(() => {
    setDraft({ ...thresholds })
  }, [thresholds])

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
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Sparkline data — last 60 samples
  const sparkData = useMemo(() => {
    const recent = history.slice(-60)
    return {
      temp_carburant: recent.map(r => r.temp_carburant),
      temp_echap:     recent.map(r => r.temp_echap),
      temp_admission: recent.map(r => r.temp_admission),
    }
  }, [history])

  // Min/Max tracking over the session
  const sessionStats = useMemo(() => {
    if (!history.length) return null
    return {
      temp_carburant: {
        min: Math.min(...history.map(r => r.temp_carburant)),
        max: Math.max(...history.map(r => r.temp_carburant)),
      },
      temp_echap: {
        min: Math.min(...history.map(r => r.temp_echap)),
        max: Math.max(...history.map(r => r.temp_echap)),
      },
      temp_admission: {
        min: Math.min(...history.map(r => r.temp_admission)),
        max: Math.max(...history.map(r => r.temp_admission)),
      },
    }
  }, [history])

  const v = latest

  const rpmState   = v ? getMetricState('rpm',       v.rpm,       thresholds) : 'OK'
  const vitState   = v ? getMetricState('vitesse',   v.vitesse,   thresholds) : 'OK'
  const vibState   = v ? getMetricState('vibration', v.vibration, thresholds) : 'OK'
  const tcarbState = v ? getMetricState('temp_carburant', v.temp_carburant, thresholds) : 'OK'
  const techapState = v ? getMetricState('temp_echap',    v.temp_echap,    thresholds) : 'OK'
  const tadmState  = v ? getMetricState('temp_admission', v.temp_admission, thresholds) : 'OK'

  // Clean state when disconnected
  if (connectionStatus !== 'connected') {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Main Connect Panel */}
        <div
          className="rounded-lg border p-8 text-center flex flex-col gap-5 items-center relative overflow-hidden shadow-2xl"
          style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
        >
          {/* Subtle gradient effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
          
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-950/30 text-blue-400 border border-blue-900/40 relative">
            <span className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping opacity-75" />
            <UsbIcon size={26} />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-slate-100">Prêt pour l&apos;acquisition</h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Branchez votre carte Arduino par USB et lancez la connexion pour démarrer la télémétrie en temps réel.
            </p>
          </div>

          {serialError && (
            <div className="p-3 text-xs rounded border bg-red-950/20 text-red-400 border-red-900/50 font-mono max-w-md w-full">
              {serialError}
            </div>
          )}

          {!serialSupported && (
            <div className="text-xs text-amber-500 font-semibold max-w-md">
              Attention : l&apos;API Web Serial n&apos;est pas supportée par votre navigateur actuel. Veuillez utiliser Chrome, Edge ou Opera sur desktop.
            </div>
          )}

          <button
            onClick={connect}
            disabled={!serialSupported || connectionStatus === 'connecting'}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded text-sm font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
            style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
          >
            <RefreshCwIcon
              size={14}
              className={connectionStatus === 'connecting' ? 'animate-spin' : ''}
            />
            {connectionStatus === 'connecting' ? 'Connexion en cours...' : 'Associer & Connecter l\'Arduino'}
          </button>
        </div>

        {/* Threshold Pre-Configuration Panel */}
        <div
          className="rounded-lg border p-6 flex flex-col gap-4 shadow-lg"
          style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#1f2937' }}>
            <div className="flex items-center gap-2">
              <CpuIcon size={14} className="text-emerald-400" />
              <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">
                Pré-Configuration des Seuils de Télémétrie
              </span>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded border text-xs font-mono font-semibold transition-colors"
              style={{
                borderColor:     saved ? '#10b981' : '#3b82f6',
                color:           saved ? '#10b981' : '#3b82f6',
                backgroundColor: saved ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
              }}
            >
              {saved ? <><CheckIcon size={12} /> Sauvegardé</> : 'Appliquer les Seuils'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Configurez les seuils Warning / Danger pour chaque capteur avant de démarrer l&apos;acquisition. Ces valeurs seront utilisées pour déclencher les alertes visuelles.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {[
              { key: 'rpm',            label: 'Régime Moteur (tr/min)', warning: draft.rpm.warning, danger: draft.rpm.danger, step: 100, min: 500, max: 12000 },
              { key: 'vibration',      label: 'Vibration (m/s²)',       warning: draft.vibration.warning, danger: draft.vibration.danger, step: 0.1, min: 0.1, max: 10 },
              { key: 'temp_echap',     label: 'Temp. Échappement (°C)',  warning: draft.temp_echap.warning, danger: draft.temp_echap.danger, step: 10, min: 100, max: 1200 },
              { key: 'temp_carburant', label: 'Temp. Carburant (°C)',   warning: draft.temp_carburant.warning, danger: draft.temp_carburant.danger, step: 1, min: 20, max: 150 },
            ].map(cfg => (
              <div key={cfg.key} className="p-3.5 rounded border flex flex-col gap-2.5 bg-slate-950/20" style={{ borderColor: 'rgba(31,41,55,0.5)' }}>
                <span className="text-xs font-semibold text-slate-300">{cfg.label}</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-amber-500 uppercase tracking-wider">Warning</span>
                    <input
                      type="number"
                      value={cfg.warning}
                      onChange={e => handleChange(cfg.key, 'warning', e.target.value)}
                      step={cfg.step}
                      min={cfg.min}
                      max={cfg.max}
                      className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                      style={{ borderColor: '#f59e0b40', color: '#f59e0b' }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-red-500 uppercase tracking-wider">Danger</span>
                    <input
                      type="number"
                      value={cfg.danger}
                      onChange={e => handleChange(cfg.key, 'danger', e.target.value)}
                      step={cfg.step}
                      min={cfg.min}
                      max={cfg.max}
                      className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                      style={{ borderColor: '#ef444440', color: '#ef4444' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Active dashboard view when connected
  return (
    <div className="p-4 flex flex-col gap-5">
      {/* ── Analog Gauges ── */}
      <section aria-labelledby="gauges-heading">
        <h2
          id="gauges-heading"
          className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
          style={{ color: '#475569' }}
        >
          Indicateurs principaux
        </h2>
        <div
          className="rounded-md border p-5 grid grid-cols-3 gap-6 place-items-center"
          style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
        >
          <AnalogGauge
            label="Régime"
            value={v?.rpm ?? 0}
            unit="tr/min"
            min={0}
            max={9000}
            state={rpmState}
            zones={RPM_ZONES}
            size={220}
          />
          <AnalogGauge
            label="Vitesse"
            value={v?.vitesse ?? 0}
            unit="m/s"
            min={0}
            max={25}
            state={vitState}
            zones={VIT_ZONES}
            size={220}
          />
          <AnalogGauge
            label="Vibration"
            value={v?.vibration ?? 0}
            unit="m/s²"
            min={0}
            max={4}
            state={vibState}
            zones={VIB_ZONES}
            size={220}
          />
        </div>
      </section>

      {/* ── Temperatures ── */}
      <section aria-labelledby="temps-heading">
        <h2
          id="temps-heading"
          className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
          style={{ color: '#475569' }}
        >
          Températures
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <TempDisplay
            label="Carburant"
            value={v?.temp_carburant ?? null}
            unit="°C"
            state={tcarbState}
            minVal={sessionStats?.temp_carburant.min ?? null}
            maxVal={sessionStats?.temp_carburant.max ?? null}
            size="md"
          />
          <TempDisplay
            label="Échappement"
            value={v?.temp_echap ?? null}
            unit="°C"
            state={techapState}
            minVal={sessionStats?.temp_echap.min ?? null}
            maxVal={sessionStats?.temp_echap.max ?? null}
            size="md"
          />
          <TempDisplay
            label="Admission"
            value={v?.temp_admission ?? null}
            unit="°C"
            state={tadmState}
            minVal={sessionStats?.temp_admission.min ?? null}
            maxVal={sessionStats?.temp_admission.max ?? null}
            size="md"
          />
        </div>
      </section>

      {/* ── Sparklines ── */}
      <section aria-labelledby="sparklines-heading">
        <h2
          id="sparklines-heading"
          className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
          style={{ color: '#475569' }}
        >
          Tendances (60 derniers points)
        </h2>
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Sparkline
              data={sparkData.temp_carburant}
              label="Carburant"
              unit="°C"
              color="#3b82f6"
              state={tcarbState}
              height={56}
              width={160}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Sparkline
              data={sparkData.temp_echap}
              label="Échappement"
              unit="°C"
              color="#3b82f6"
              state={techapState}
              height={56}
              width={160}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Sparkline
              data={sparkData.temp_admission}
              label="Admission"
              unit="°C"
              color="#3b82f6"
              state={tadmState}
              height={56}
              width={160}
            />
          </div>
        </div>
      </section>

      {/* ── Recent Alarms ── */}
      <section aria-labelledby="alarms-heading">
        <h2
          id="alarms-heading"
          className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
          style={{ color: '#475569' }}
        >
          Historique des alarmes
        </h2>
        <RecentAlarms alarms={alarms} limit={10} />
      </section>
    </div>
  )
}
