'use client'

import { useMemo } from 'react'
import { useBench } from '../BenchContext'
import { AnalogGauge } from '../AnalogGauge'
import { TempDisplay } from '../TempDisplay'
import { Sparkline } from '../Sparkline'
import { RecentAlarms } from '../RecentAlarms'
import { getMetricState } from '@/lib/types'

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
  const { latest, history, thresholds, alarms } = useBench()

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
