'use client'

import { useEffect, useState } from 'react'
import { ActivityIcon, RefreshCwIcon, WifiIcon } from 'lucide-react'
import { useBench } from '../BenchContext'

function useUptime(startTime: number) {
  const [uptime, setUptime] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setUptime(Date.now() - startTime), 1000)
    return () => clearInterval(id)
  }, [startTime])
  return uptime
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function Systeme() {
  const {
    stats,
    restart,
    frozen,
    connect,
    disconnect,
    connectionStatus,
    serialError,
    serialSupported,
  } = useBench()

  const uptime = useUptime(stats.startTime)

  const signalQuality = stats.totalFrames === 0
    ? 100
    : Math.round(((stats.totalFrames - stats.invalidFrames) / stats.totalFrames) * 100)

  const diagItems = [
    {
      label: 'Connection status',
      value: connectionStatus === 'connected'
        ? 'Port Connected'
        : connectionStatus === 'connecting'
          ? 'Connecting...'
          : connectionStatus === 'error'
            ? 'Connection Error'
            : 'Port Disconnected',
      color: connectionStatus === 'connected'
        ? '#10b981'
        : connectionStatus === 'connecting'
          ? '#f59e0b'
          : connectionStatus === 'error'
            ? '#ef4444'
            : '#64748b',
    },
    {
      label: 'USB Serial Port',
      value: stats.port,
      color: stats.port !== 'None' ? '#3b82f6' : '#64748b',
    },
    {
      label: 'Acquisition uptime',
      value: formatDuration(uptime),
      color: '#94a3b8',
    },
    {
      label: 'Received frames',
      value: stats.totalFrames.toLocaleString('en-US'),
      color: '#10b981',
    },
    {
      label: 'Invalid frames',
      value: stats.invalidFrames.toString(),
      color: stats.invalidFrames > 0 ? '#f59e0b' : '#10b981',
    },
    {
      label: 'Invalidity rate',
      value: `${(100 - signalQuality).toFixed(1)} %`,
      color: (100 - signalQuality) > 5 ? '#ef4444' : '#10b981',
    },
    {
      label: 'Signal quality',
      value: `${signalQuality} %`,
      color: signalQuality >= 99 ? '#10b981' : signalQuality >= 90 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'Buffer size',
      value: '36,000 samples (10h)',
      color: '#94a3b8',
    },
    {
      label: 'Acquisition state',
      value: frozen ? 'Suspended (Emergency Stop)' : connectionStatus === 'connected' ? 'Active' : 'Waiting',
      color: frozen ? '#ef4444' : connectionStatus === 'connected' ? '#10b981' : '#64748b',
    },
  ]

  const badgeColor = connectionStatus === 'connected'
    ? '#10b981'
    : connectionStatus === 'connecting'
      ? '#f59e0b'
      : connectionStatus === 'error'
        ? '#ef4444'
        : '#64748b'

  const badgeBg = connectionStatus === 'connected'
    ? 'rgba(16,185,129,0.1)'
    : connectionStatus === 'connecting'
      ? 'rgba(245,158,11,0.1)'
      : connectionStatus === 'error'
        ? 'rgba(239,68,68,0.1)'
        : 'rgba(100,116,139,0.1)'

  return (
    <div className="p-4 flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          System &amp; Diagnostics
        </h1>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors"
            style={{
              borderColor:     badgeColor,
              backgroundColor: badgeBg,
              color:           badgeColor,
            }}
          >
            <WifiIcon size={11} />
            {connectionStatus === 'connected'
              ? 'Active Telemetry'
              : connectionStatus === 'connecting'
                ? 'Connecting...'
                : connectionStatus === 'error'
                  ? 'Port Error'
                  : 'Port Disconnected'}
          </span>
        </div>
      </div>

      {/* Diagnostics grid */}
      <div
        className="rounded-md border"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b"
          style={{ borderColor: '#1f2937' }}
        >
          <ActivityIcon size={13} style={{ color: '#3b82f6' }} />
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#475569' }}>
            Diagnostics
          </span>
        </div>
        <div className="divide-y" style={{ borderColor: '#1a2333' }}>
          {diagItems.map(item => (
            <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs" style={{ color: '#64748b' }}>{item.label}</span>
              <span className="text-xs font-mono font-medium" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Port Control */}
      <div
        className="rounded-md border p-4 flex flex-col gap-3"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#475569' }}>
          Serial Port Control
        </div>

        {serialError && (
          <div className="p-2.5 text-xs rounded border bg-red-950/20 text-red-400 border-red-900/50 font-mono">
            {serialError}
          </div>
        )}

        <p className="text-xs" style={{ color: '#64748b' }}>
          {connectionStatus === 'connected'
            ? `Connected to ${stats.port}. Telemetry data is read in real time.`
            : "Connect the Arduino test bench via the USB serial port to receive physical measurements."}
        </p>

        {!serialSupported && (
          <div className="text-xs text-amber-500 font-mono font-semibold">
            Warning: Web Serial API is not supported by your current browser. Please use Chrome, Edge, or Opera on desktop.
          </div>
        )}

        <div className="flex gap-2">
          {connectionStatus !== 'connected' ? (
            <button
              onClick={connect}
              disabled={!serialSupported || connectionStatus === 'connecting'}
              className="flex items-center gap-2 px-4 py-2 rounded border text-xs font-mono font-semibold transition-opacity disabled:opacity-60"
              style={{
                borderColor:     '#10b981',
                color:           '#10b981',
                backgroundColor: 'rgba(16,185,129,0.1)',
              }}
            >
              <RefreshCwIcon
                size={13}
                className={connectionStatus === 'connecting' ? 'animate-spin' : ''}
              />
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect Device'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-4 py-2 rounded border text-xs font-mono font-semibold transition-opacity"
              style={{
                borderColor:     '#ef4444',
                color:           '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.1)',
              }}
            >
              Disconnect
            </button>
          )}

          <button
            onClick={restart}
            className="flex items-center gap-2 px-4 py-2 rounded border text-xs font-mono font-semibold transition-opacity"
            style={{
              borderColor:     '#64748b',
              color:           '#64748b',
              backgroundColor: 'rgba(100,116,139,0.1)',
            }}
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Arduino instructions */}
      <div
        className="rounded-md border p-4 text-xs"
        style={{ backgroundColor: '#0d1220', borderColor: '#1f2937', color: '#64748b' }}
      >
        <div className="font-semibold mb-1" style={{ color: '#94a3b8' }}>
          Expected Data Format (Arduino / Serial Port)
        </div>
        The test bench expects JSON or CSV messages sent line by line at a baud rate of 9600.
        <div className="mt-2 font-semibold">JSON Example:</div>
        <code className="block mt-1 p-2 rounded bg-black/40 text-[10px] text-emerald-400 font-mono">
          {"{\"temp_carburant\": 40.2, \"temp_echap\": 575.0, \"temp_admission\": 32.1, \"rpm\": 2800, \"vitesse\": 10.5, \"vibration\": 0.60}"}
        </code>
        <div className="mt-2 font-semibold">CSV Example:</div>
        <code className="block mt-1 p-2 rounded bg-black/40 text-[10px] text-emerald-400 font-mono">
          40.2,575.0,32.1,2800,10.5,0.60
        </code>
        <div className="mt-1 font-semibold text-[10px] text-slate-500">
          CSV values order: Fuel Temp, Exhaust Temp, Intake Temp, RPM, Speed, Vibration.
        </div>
      </div>
    </div>
  )
}
