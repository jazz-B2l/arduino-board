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
  const { stats, restart, frozen } = useBench()
  const uptime = useUptime(stats.startTime)
  const [reconnecting, setReconnecting] = useState(false)

  const handleReconnect = async () => {
    setReconnecting(true)
    await new Promise(r => setTimeout(r, 1500))
    restart()
    setReconnecting(false)
  }

  const signalQuality = stats.totalFrames === 0
    ? 100
    : Math.round(((stats.totalFrames - stats.invalidFrames) / stats.totalFrames) * 100)

  const diagItems = [
    { label: 'Mode actuel',          value: 'Mode démo — simulation', color: '#3b82f6' },
    { label: 'Port simulé',          value: stats.port,                color: '#94a3b8' },
    { label: 'Uptime',               value: formatDuration(uptime),     color: '#94a3b8' },
    { label: 'Trames reçues',        value: stats.totalFrames.toLocaleString('fr-FR'), color: '#10b981' },
    { label: 'Trames invalides',     value: stats.invalidFrames.toString(),            color: stats.invalidFrames > 0 ? '#f59e0b' : '#10b981' },
    { label: 'Taux d\'invalidité',  value: `${(100 - signalQuality).toFixed(1)} %`,   color: (100 - signalQuality) > 5 ? '#ef4444' : '#10b981' },
    { label: 'Qualité signal',      value: `${signalQuality} %`,                       color: signalQuality >= 99 ? '#10b981' : signalQuality >= 90 ? '#f59e0b' : '#ef4444' },
    { label: 'Fréquence d\'acquisition', value: '1 Hz',               color: '#94a3b8' },
    { label: 'Taille du buffer',    value: '36 000 échantillons (10h)', color: '#94a3b8' },
    { label: 'État du flux',        value: frozen ? 'Suspendu' : 'Actif', color: frozen ? '#ef4444' : '#10b981' },
  ]

  return (
    <div className="p-4 flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Système &amp; Diagnostics
        </h1>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border"
            style={{
              borderColor:     '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.1)',
              color:           '#3b82f6',
            }}
          >
            <WifiIcon size={11} />
            Mode démo actif
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

      {/* Reconnect */}
      <div
        className="rounded-md border p-4 flex flex-col gap-3"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
      >
        <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#475569' }}>
          Actions
        </div>
        <p className="text-xs" style={{ color: '#64748b' }}>
          Réinitialise la simulation et remet tous les compteurs à zéro. L&apos;historique et les alarmes seront effacés.
        </p>
        <button
          onClick={handleReconnect}
          disabled={reconnecting}
          className="flex items-center gap-2 px-4 py-2 rounded border text-xs font-mono font-semibold self-start transition-opacity disabled:opacity-60"
          style={{
            borderColor:     '#3b82f6',
            color:           '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
          }}
        >
          <RefreshCwIcon
            size={13}
            className={reconnecting ? 'animate-spin' : ''}
          />
          {reconnecting ? 'Reconnexion en cours...' : 'Reconnecter / Redémarrer la simulation'}
        </button>
      </div>

      {/* Web Serial note */}
      <div
        className="rounded-md border p-4 text-xs"
        style={{ backgroundColor: '#0d1220', borderColor: '#1f2937', color: '#475569' }}
      >
        <div className="font-semibold mb-1" style={{ color: '#64748b' }}>
          Connexion matérielle réelle (Web Serial API)
        </div>
        Pour connecter l&apos;Arduino du banc d&apos;essai, cette fonctionnalité sera disponible dans la version&nbsp;2 du tableau de bord. Elle nécessite Chrome, Edge ou Opera sur desktop.
      </div>
    </div>
  )
}
