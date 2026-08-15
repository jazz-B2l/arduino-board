'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useBench } from '../BenchContext'
import { AnalogGauge } from '../AnalogGauge'
import { TempDisplay } from '../TempDisplay'
import { Sparkline } from '../Sparkline'
import { RecentAlarms } from '../RecentAlarms'
import { getMetricState, type Thresholds } from '@/lib/types'
import { CheckIcon, CpuIcon, RefreshCwIcon, UsbIcon, TerminalIcon, AlertTriangleIcon, InfoIcon, FileCode2Icon, HelpCircleIcon } from 'lucide-react'

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
    rawLines,
    stats,
    handshakeStatus,
    sendHandshake,
    selectedBoard,
    setSelectedBoard,
    boardName,
  } = useBench()

  const [draft, setDraft] = useState<Thresholds>(() => ({ ...thresholds }))
  const [saved, setSaved] = useState(false)
  const [tempSelectedBoard, setTempSelectedBoard] = useState<string | null>(null)

  // Sync draft with thresholds when context changes
  useEffect(() => {
    setDraft({ ...thresholds })
  }, [thresholds])

  // Reset local selection when selectedBoard is cleared (e.g. on disconnect)
  useEffect(() => {
    if (!selectedBoard) {
      setTempSelectedBoard(null)
    }
  }, [selectedBoard])

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

  // Detect which sensors are actively transmitting data during the session
  const activeSensors = useMemo(() => {
    return {
      rpm:            history.some(r => r.rpm !== undefined),
      vitesse:        history.some(r => r.vitesse !== undefined),
      vibration:      history.some(r => r.vibration !== undefined),
      temp_carburant: history.some(r => r.temp_carburant !== undefined),
      temp_echap:     history.some(r => r.temp_echap !== undefined),
      temp_admission: history.some(r => r.temp_admission !== undefined),
    }
  }, [history])

  // Sparkline data — last 60 samples
  const sparkData = useMemo(() => {
    const recent = history.slice(-60)
    return {
      temp_carburant: recent.map(r => r.temp_carburant ?? 0),
      temp_echap:     recent.map(r => r.temp_echap ?? 0),
      temp_admission: recent.map(r => r.temp_admission ?? 0),
    }
  }, [history])

  // Min/Max tracking over the session
  const sessionStats = useMemo(() => {
    if (!history.length) return null
    
    const validCarburant = history.map(r => r.temp_carburant).filter((v): v is number => v !== undefined)
    const validEchap     = history.map(r => r.temp_echap).filter((v): v is number => v !== undefined)
    const validAdmission = history.map(r => r.temp_admission).filter((v): v is number => v !== undefined)

    return {
      temp_carburant: {
        min: validCarburant.length ? Math.min(...validCarburant) : null,
        max: validCarburant.length ? Math.max(...validCarburant) : null,
      },
      temp_echap: {
        min: validEchap.length ? Math.min(...validEchap) : null,
        max: validEchap.length ? Math.max(...validEchap) : null,
      },
      temp_admission: {
        min: validAdmission.length ? Math.min(...validAdmission) : null,
        max: validAdmission.length ? Math.max(...validAdmission) : null,
      },
    }
  }, [history])

  const v = latest

  const rpmState   = v && v.rpm !== undefined ? getMetricState('rpm', v.rpm, thresholds) : 'OK'
  const vitState   = v && v.vitesse !== undefined ? getMetricState('vitesse', v.vitesse, thresholds) : 'OK'
  const vibState   = v && v.vibration !== undefined ? getMetricState('vibration', v.vibration, thresholds) : 'OK'
  const tcarbState = v && v.temp_carburant !== undefined ? getMetricState('temp_carburant', v.temp_carburant, thresholds) : 'OK'
  const techapState = v && v.temp_echap !== undefined ? getMetricState('temp_echap', v.temp_echap, thresholds) : 'OK'
  const tadmState  = v && v.temp_admission !== undefined ? getMetricState('temp_admission', v.temp_admission, thresholds) : 'OK'

  // 1. Clean state when disconnected
  if (connectionStatus !== 'connected') {
    return (
      <div className="p-6 max-w-xl mx-auto flex flex-col gap-6 mt-12">
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
            <h1 className="text-xl font-bold text-slate-100">Ready for Acquisition</h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Connect your Arduino board via USB and start the connection to launch real-time telemetry.
            </p>
          </div>

          {serialError && (
            <div className="p-3 text-xs rounded border bg-red-950/20 text-red-400 border-red-900/50 font-mono w-full">
              {serialError}
            </div>
          )}

          {!serialSupported && (
            <div className="text-xs text-amber-500 font-semibold">
              Warning: Web Serial API is not supported by your current browser. Please use Chrome, Edge, or Opera on desktop.
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
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Pair & Connect Arduino'}
          </button>
        </div>
      </div>
    )
  }

  // Helper flags
  const showGauges = activeSensors.rpm || activeSensors.vitesse || activeSensors.vibration
  const showTemps = activeSensors.temp_carburant || activeSensors.temp_echap || activeSensors.temp_admission
  const hasAnySensor = showGauges || showTemps

  // 2. Connected but no active captures/sensors detected yet
  if (connectionStatus === 'connected' && !hasAnySensor) {
    const detectedName = stats.port && stats.port !== 'Aucun' ? stats.port : 'Appareil Arduino'
    const isGeneric = stats.port.includes('Clone') || stats.port.includes('Serial Port') || stats.port === 'Arduino' || stats.port === 'Appareil Arduino'

    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6 mt-10">
        {/* Connection status notification */}
        <div
          className="rounded-lg border p-6 flex flex-col items-center text-center gap-4 relative overflow-hidden"
          style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
        >
          <button
            onClick={sendHandshake}
            disabled={handshakeStatus === 'sending'}
            className="w-14 h-14 rounded-full flex items-center justify-center border relative transition-all hover:scale-[1.05] disabled:opacity-80 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            style={{
              backgroundColor: handshakeStatus === 'success'
                ? 'rgba(16, 185, 129, 0.2)'
                : handshakeStatus === 'error'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(6, 78, 59, 0.4)', // bg-emerald-950/40
              borderColor: handshakeStatus === 'success'
                ? '#10b981' // emerald-500
                : handshakeStatus === 'error'
                  ? '#ef4444' // red-500
                  : 'rgba(16, 185, 129, 0.2)', // border-emerald-500/20
              color: handshakeStatus === 'success'
                ? '#34d399' // emerald-400
                : handshakeStatus === 'error'
                  ? '#f87171' // red-400
                  : '#34d399', // emerald-400
            }}
            title="Test communication with Arduino (LED 13)"
          >
            {/* Pulsing ring */}
            {handshakeStatus === 'idle' && (
              <span className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-75" />
            )}

            {/* Spinning/pulsing CPU Icon or Status icon */}
            {handshakeStatus === 'sending' ? (
              <RefreshCwIcon size={20} className="animate-spin text-emerald-400" />
            ) : handshakeStatus === 'success' ? (
              <CheckIcon size={20} className="text-emerald-400 animate-bounce" />
            ) : handshakeStatus === 'error' ? (
              <AlertTriangleIcon size={20} className="text-red-400 animate-pulse" />
            ) : (
              <CpuIcon size={20} className="animate-pulse group-hover:rotate-12 transition-transform" />
            )}
          </button>

          <div className="flex flex-col gap-1.5 items-center w-full">
            <h2 className="text-base font-bold text-slate-100 font-mono">
              {handshakeStatus === 'success' ? (
                <span className="text-emerald-400">Arduino Communication Verified!</span>
              ) : handshakeStatus === 'error' ? (
                <span className="text-red-400">Communication Test Failed</span>
              ) : handshakeStatus === 'sending' ? (
                <span className="text-emerald-500 animate-pulse">Communication test in progress...</span>
              ) : (
                `${boardName} Connected`
              )}
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {handshakeStatus === 'success' ? (
                "The Arduino responded successfully (LED 13 verified). Waiting for your physical measurement frames..."
              ) : handshakeStatus === 'error' ? (
                <span>
                  No response received. Please make sure the required sketch has been uploaded. You can find the code in the{" "}
                  <Link href="/programmation" className="text-blue-400 underline hover:text-blue-300 font-semibold">
                    Programming tab
                  </Link>
                  .
                </span>
              ) : handshakeStatus === 'sending' ? (
                "Sending 'HANDSHAKE' signal and waiting for 'ARDUINO,READY' response..."
              ) : (
                <span>
                  Serial connection established! <strong className="text-blue-400">First Time?</strong> Please upload the required sketch from the{" "}
                  <Link href="/programmation" className="text-blue-400 underline hover:text-blue-300 font-semibold">
                    Programming tab
                  </Link>{" "}
                  first. Then click the CPU icon above to test communication.
                </span>
              )}
            </p>

            {isGeneric && !selectedBoard && (
              <div className="mt-4 flex flex-col items-center gap-2 bg-[#1e293b]/50 p-4 rounded-lg border border-blue-500/30 w-full max-w-md shadow-xl animate-in fade-in slide-in-from-top-2">
                <span className="text-xs font-semibold text-blue-400 font-mono flex items-center gap-1.5">
                  <HelpCircleIcon size={14} /> Ambiguous Device Detected
                </span>
                <p className="text-[11px] text-slate-300 text-center leading-relaxed">
                  The connected USB serial chip (CH340) is shared by multiple boards. Please select which microcontroller you are using for this session:
                </p>
                <div className="flex gap-3 mt-1">
                  <button
                    onClick={() => setTempSelectedBoard('Arduino Uno')}
                    className={`px-4 py-1.5 rounded text-xs font-mono font-bold border transition-all ${tempSelectedBoard === 'Arduino Uno' ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white'}`}
                  >
                    Arduino Uno
                  </button>
                  <button
                    onClick={() => setTempSelectedBoard('Arduino Mega 2560')}
                    className={`px-4 py-1.5 rounded text-xs font-mono font-bold border transition-all ${tempSelectedBoard === 'Arduino Mega 2560' ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white'}`}
                  >
                    Arduino Mega 2560
                  </button>
                </div>
                {tempSelectedBoard && (
                  <button
                    onClick={() => setSelectedBoard(tempSelectedBoard)}
                    className="mt-3 w-full px-4 py-2 rounded text-xs font-mono font-bold border transition-all bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 hover:border-emerald-300 shadow-lg shadow-emerald-600/20 animate-in fade-in slide-in-from-top-1"
                  >
                    Confirm Selection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Serial Terminal */}
        <div
          className="rounded-lg border overflow-hidden flex flex-col"
          style={{ backgroundColor: '#090d16', borderColor: '#1f2937' }}
        >
          {/* Terminal Header */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{ backgroundColor: '#0d1220', borderColor: '#1f2937' }}
          >
            <div className="flex items-center gap-2">
              <TerminalIcon size={13} className="text-emerald-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-semibold text-slate-300">
                Serial Console (9600 Baud)
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9px] text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACQUISITION IN PROGRESS</span>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            className="p-3 h-48 overflow-y-auto font-mono text-[11px] flex flex-col gap-1 selection:bg-emerald-500/30 select-text"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          >
            {rawLines.length > 0 ? (
              rawLines.map((line, idx) => (
                <div key={idx} className="truncate text-emerald-400/90 font-mono">
                  <span className="text-emerald-600/70 select-none mr-2">&gt;</span>
                  {line}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-1 font-mono text-center py-8">
                <span className="animate-pulse text-xs">No frames received yet...</span>
                <span className="text-[10px] text-slate-600">(Verify that your Arduino transmits data via Serial.print)</span>
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting & Sample Code section */}
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          {/* Troubleshooting checklist */}
          <div
            className="rounded-lg border p-4 flex flex-col gap-3"
            style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
          >
            <div className="flex items-center gap-2 text-amber-500 font-semibold uppercase tracking-wider text-[10px]">
              <AlertTriangleIcon size={12} />
              Connection & Troubleshooting Guide
            </div>
            <ul className="list-disc pl-4 flex flex-col gap-2 text-slate-400 font-medium font-sans">
              <li>
                <span className="text-slate-300">Expected Data Format:</span> The bench expects CSV or JSON messages containing key fields (e.g. <code className="text-emerald-400 font-mono text-[10px]">rpm</code>, <code className="text-emerald-400 font-mono text-[10px]">vitesse</code>, etc.).
              </li>
              <li>
                <span className="text-slate-300">Baud Rate:</span> Configure your Arduino at <code className="text-emerald-400 font-mono text-[10px]">9600 baud</code> using <code className="text-emerald-400 font-mono text-[10px]">Serial.begin(9600);</code>.
              </li>
              <li>
                <span className="text-slate-300">Exclusive Access:</span> Close the serial monitor in the Arduino IDE or any other application connected to the same port.
              </li>
              <li>
                <span className="text-slate-300">USB Wiring:</span> Ensure that the USB cable is securely connected and that no short-circuits are present on the board shield.
              </li>
            </ul>
          </div>

          {/* Quick Arduino Code Preview */}
          <div
            className="rounded-lg border p-4 flex flex-col gap-3 justify-between"
            style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-blue-400 font-semibold uppercase tracking-wider text-[10px]">
                <FileCode2Icon size={12} />
                Arduino Code Example
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Here is the standard CSV format expected by the Dashboard:
              </p>
              <pre className="p-2 rounded bg-black/40 text-[9px] text-emerald-400 font-mono border border-slate-900/60 leading-normal max-h-24 overflow-y-auto">
{`// Send CSV at 9600 baud:
// Temp_Carb, Temp_Echap, Temp_Adm, RPM, Vitesse, Vibration
void loop() {
  Serial.print(40.2);   Serial.print(",");
  Serial.print(575.0);  Serial.print(",");
  Serial.print(32.1);   Serial.print(",");
  Serial.print(2800);   Serial.print(",");
  Serial.print(10.5);   Serial.print(",");
  Serial.println(0.60); // final println!
  delay(1000);
}`}
              </pre>
            </div>
            <div className="flex gap-2 mt-1">
              <Link
                href="/systeme"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700/80 transition-colors w-full"
              >
                <InfoIcon size={10} />
                View Instructions
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const activeGaugesCount = [activeSensors.rpm, activeSensors.vitesse, activeSensors.vibration].filter(Boolean).length
  const activeTempsCount = [activeSensors.temp_carburant, activeSensors.temp_echap, activeSensors.temp_admission].filter(Boolean).length

  // 3. Connected state with active sensors
  return (
    <div className="p-4 flex flex-col gap-5">
      {/* ── Analog Gauges ── */}
      {showGauges && (
        <section aria-labelledby="gauges-heading">
          <h2
            id="gauges-heading"
            className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
            style={{ color: '#475569' }}
          >
            Primary Indicators
          </h2>
          <div
            className="rounded-md border p-5 grid gap-6 place-items-center"
            style={{
              backgroundColor: '#111827',
              borderColor: '#1f2937',
              gridTemplateColumns: `repeat(${activeGaugesCount}, minmax(0, 1fr))`
            }}
          >
            {activeSensors.rpm && (
              <AnalogGauge
                label="Engine Speed"
                value={v?.rpm ?? 0}
                unit="rpm"
                min={0}
                max={9000}
                state={rpmState}
                zones={RPM_ZONES}
                size={220}
              />
            )}
            {activeSensors.vitesse && (
              <AnalogGauge
                label="Speed"
                value={v?.vitesse ?? 0}
                unit="m/s"
                min={0}
                max={25}
                state={vitState}
                zones={VIT_ZONES}
                size={220}
              />
            )}
            {activeSensors.vibration && (
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
            )}
          </div>
        </section>
      )}

      {/* ── Temperatures ── */}
      {showTemps && (
        <section aria-labelledby="temps-heading">
          <h2
            id="temps-heading"
            className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
            style={{ color: '#475569' }}
          >
            Temperatures
          </h2>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${activeTempsCount}, minmax(0, 1fr))`
            }}
          >
            {activeSensors.temp_carburant && (
              <TempDisplay
                label="Fuel"
                value={v?.temp_carburant ?? null}
                unit="°C"
                state={tcarbState}
                minVal={sessionStats?.temp_carburant.min ?? null}
                maxVal={sessionStats?.temp_carburant.max ?? null}
                size="md"
              />
            )}
            {activeSensors.temp_echap && (
              <TempDisplay
                label="Exhaust"
                value={v?.temp_echap ?? null}
                unit="°C"
                state={techapState}
                minVal={sessionStats?.temp_echap.min ?? null}
                maxVal={sessionStats?.temp_echap.max ?? null}
                size="md"
              />
            )}
            {activeSensors.temp_admission && (
              <TempDisplay
                label="Intake"
                value={v?.temp_admission ?? null}
                unit="°C"
                state={tadmState}
                minVal={sessionStats?.temp_admission.min ?? null}
                maxVal={sessionStats?.temp_admission.max ?? null}
                size="md"
              />
            )}
          </div>
        </section>
      )}

      {/* ── Sparklines ── */}
      {showTemps && (
        <section aria-labelledby="sparklines-heading">
          <h2
            id="sparklines-heading"
            className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
            style={{ color: '#475569' }}
          >
            Trends (last 60 points)
          </h2>
          <div className="flex gap-4 flex-wrap">
            {activeSensors.temp_carburant && (
              <div className="flex-1 min-w-[200px]">
                <Sparkline
                  data={sparkData.temp_carburant}
                  label="Fuel"
                  unit="°C"
                  color="#3b82f6"
                  state={tcarbState}
                  height={56}
                  width={160}
                />
              </div>
            )}
            {activeSensors.temp_echap && (
              <div className="flex-1 min-w-[200px]">
                <Sparkline
                  data={sparkData.temp_echap}
                  label="Exhaust"
                  unit="°C"
                  color="#3b82f6"
                  state={techapState}
                  height={56}
                  width={160}
                />
              </div>
            )}
            {activeSensors.temp_admission && (
              <div className="flex-1 min-w-[200px]">
                <Sparkline
                  data={sparkData.temp_admission}
                  label="Intake"
                  unit="°C"
                  color="#3b82f6"
                  state={tadmState}
                  height={56}
                  width={160}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Threshold Configuration (Only for active sensors) ── */}
      {hasAnySensor && (
        <section aria-labelledby="thresholds-heading">
          <div
            className="rounded-lg border p-6 flex flex-col gap-4 shadow-lg"
            style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#1f2937' }}>
              <div className="flex items-center gap-2">
                <CpuIcon size={14} className="text-emerald-400" />
                <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">
                  Telemetry Thresholds Configuration
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
                {saved ? <><CheckIcon size={12} /> Saved</> : 'Apply Thresholds'}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configure Warning / Danger thresholds for each active sensor. These values control visual alerts.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {activeSensors.rpm && (
                <div className="p-3.5 rounded border flex flex-col gap-2.5 bg-slate-950/20" style={{ borderColor: 'rgba(31, 41, 55, 0.5)' }}>
                  <span className="text-xs font-semibold text-slate-300">Engine Speed (rpm)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-amber-500 uppercase tracking-wider">Warning</span>
                      <input
                        type="number"
                        value={draft.rpm.warning}
                        onChange={e => handleChange('rpm', 'warning', e.target.value)}
                        step={100}
                        min={500}
                        max={12000}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(245, 158, 11, 0.25)', color: 'rgb(245, 158, 11)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-red-500 uppercase tracking-wider">Danger</span>
                      <input
                        type="number"
                        value={draft.rpm.danger}
                        onChange={e => handleChange('rpm', 'danger', e.target.value)}
                        step={100}
                        min={500}
                        max={12000}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(239, 68, 68, 0.25)', color: 'rgb(239, 68, 68)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSensors.vibration && (
                <div className="p-3.5 rounded border flex flex-col gap-2.5 bg-slate-950/20" style={{ borderColor: 'rgba(31, 41, 55, 0.5)' }}>
                  <span className="text-xs font-semibold text-slate-300">Vibration (m/s²)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-amber-500 uppercase tracking-wider">Warning</span>
                      <input
                        type="number"
                        value={draft.vibration.warning}
                        onChange={e => handleChange('vibration', 'warning', e.target.value)}
                        step={0.1}
                        min={0.1}
                        max={10}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(245, 158, 11, 0.25)', color: 'rgb(245, 158, 11)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-red-500 uppercase tracking-wider">Danger</span>
                      <input
                        type="number"
                        value={draft.vibration.danger}
                        onChange={e => handleChange('vibration', 'danger', e.target.value)}
                        step={0.1}
                        min={0.1}
                        max={10}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(239, 68, 68, 0.25)', color: 'rgb(239, 68, 68)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSensors.temp_echap && (
                <div className="p-3.5 rounded border flex flex-col gap-2.5 bg-slate-950/20" style={{ borderColor: 'rgba(31, 41, 55, 0.5)' }}>
                  <span className="text-xs font-semibold text-slate-300">Exhaust Temp (°C)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-amber-500 uppercase tracking-wider">Warning</span>
                      <input
                        type="number"
                        value={draft.temp_echap.warning}
                        onChange={e => handleChange('temp_echap', 'warning', e.target.value)}
                        step={10}
                        min={100}
                        max={1200}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(245, 158, 11, 0.25)', color: 'rgb(245, 158, 11)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-red-500 uppercase tracking-wider">Danger</span>
                      <input
                        type="number"
                        value={draft.temp_echap.danger}
                        onChange={e => handleChange('temp_echap', 'danger', e.target.value)}
                        step={10}
                        min={100}
                        max={1200}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(239, 68, 68, 0.25)', color: 'rgb(239, 68, 68)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSensors.temp_carburant && (
                <div className="p-3.5 rounded border flex flex-col gap-2.5 bg-slate-950/20" style={{ borderColor: 'rgba(31, 41, 55, 0.5)' }}>
                  <span className="text-xs font-semibold text-slate-300">Fuel Temp (°C)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-amber-500 uppercase tracking-wider">Warning</span>
                      <input
                        type="number"
                        value={draft.temp_carburant.warning}
                        onChange={e => handleChange('temp_carburant', 'warning', e.target.value)}
                        step={1}
                        min={20}
                        max={150}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(245, 158, 11, 0.25)', color: 'rgb(245, 158, 11)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-red-500 uppercase tracking-wider">Danger</span>
                      <input
                        type="number"
                        value={draft.temp_carburant.danger}
                        onChange={e => handleChange('temp_carburant', 'danger', e.target.value)}
                        step={1}
                        min={20}
                        max={150}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(239, 68, 68, 0.25)', color: 'rgb(239, 68, 68)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSensors.temp_admission && (
                <div className="p-3.5 rounded border flex flex-col gap-2.5 bg-slate-950/20" style={{ borderColor: 'rgba(31, 41, 55, 0.5)' }}>
                  <span className="text-xs font-semibold text-slate-300">Intake Temp (°C)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-amber-500 uppercase tracking-wider">Warning</span>
                      <input
                        type="number"
                        value={draft.temp_admission.warning}
                        onChange={e => handleChange('temp_admission', 'warning', e.target.value)}
                        step={1}
                        min={10}
                        max={200}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(245, 158, 11, 0.25)', color: 'rgb(245, 158, 11)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-red-500 uppercase tracking-wider">Danger</span>
                      <input
                        type="number"
                        value={draft.temp_admission.danger}
                        onChange={e => handleChange('temp_admission', 'danger', e.target.value)}
                        step={1}
                        min={10}
                        max={200}
                        className="rounded px-2.5 py-1 text-xs font-mono border outline-none bg-slate-900"
                        style={{ borderColor: 'rgba(239, 68, 68, 0.25)', color: 'rgb(239, 68, 68)' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Recent Alarms ── */}
      <section aria-labelledby="alarms-heading">
        <h2
          id="alarms-heading"
          className="text-[10px] uppercase tracking-widest mb-3 font-semibold"
          style={{ color: '#475569' }}
        >
          Alarm History
        </h2>
        <RecentAlarms alarms={alarms} limit={10} />
      </section>
    </div>
  )
}
