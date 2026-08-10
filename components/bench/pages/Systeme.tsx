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
      label: 'Statut connexion',
      value: connectionStatus === 'connected'
        ? 'Port Connecté'
        : connectionStatus === 'connecting'
          ? 'Connexion en cours...'
          : connectionStatus === 'error'
            ? 'Erreur de connexion'
            : 'Port Déconnecté',
      color: connectionStatus === 'connected'
        ? '#10b981'
        : connectionStatus === 'connecting'
          ? '#f59e0b'
          : connectionStatus === 'error'
            ? '#ef4444'
            : '#64748b',
    },
    {
      label: 'Port Série USB',
      value: stats.port,
      color: stats.port !== 'Aucun' ? '#3b82f6' : '#64748b',
    },
    {
      label: 'Uptime acquisition',
      value: formatDuration(uptime),
      color: '#94a3b8',
    },
    {
      label: 'Trames reçues',
      value: stats.totalFrames.toLocaleString('fr-FR'),
      color: '#10b981',
    },
    {
      label: 'Trames invalides',
      value: stats.invalidFrames.toString(),
      color: stats.invalidFrames > 0 ? '#f59e0b' : '#10b981',
    },
    {
      label: 'Taux d\'invalidité',
      value: `${(100 - signalQuality).toFixed(1)} %`,
      color: (100 - signalQuality) > 5 ? '#ef4444' : '#10b981',
    },
    {
      label: 'Qualité signal',
      value: `${signalQuality} %`,
      color: signalQuality >= 99 ? '#10b981' : signalQuality >= 90 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'Taille du buffer',
      value: '36 000 échantillons (10h)',
      color: '#94a3b8',
    },
    {
      label: 'État de l\'acquisition',
      value: frozen ? 'Suspendu (Arrêt d\'urgence)' : connectionStatus === 'connected' ? 'Actif' : 'En attente',
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
          Système &amp; Diagnostics
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
              ? 'Télémétrie Active'
              : connectionStatus === 'connecting'
                ? 'Connexion...'
                : connectionStatus === 'error'
                  ? 'Erreur Port'
                  : 'Port Déconnecté'}
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
          Contrôle du Port Série
        </div>

        {serialError && (
          <div className="p-2.5 text-xs rounded border bg-red-950/20 text-red-400 border-red-900/50 font-mono">
            {serialError}
          </div>
        )}

        <p className="text-xs" style={{ color: '#64748b' }}>
          {connectionStatus === 'connected'
            ? `Connecté à ${stats.port}. Les données de télémétrie sont lues en temps réel.`
            : "Connectez le banc d'essai Arduino via le port série USB pour recevoir les mesures physiques."}
        </p>

        {!serialSupported && (
          <div className="text-xs text-amber-500 font-mono font-semibold">
            Attention : l&apos;API Web Serial n&apos;est pas supportée par votre navigateur actuel. Veuillez utiliser Chrome, Edge ou Opera sur desktop.
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
              {connectionStatus === 'connecting' ? 'Connexion en cours...' : 'Connecter un appareil'}
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
              Déconnecter
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
            Effacer les données
          </button>
        </div>
      </div>

      {/* Arduino instructions */}
      <div
        className="rounded-md border p-4 text-xs"
        style={{ backgroundColor: '#0d1220', borderColor: '#1f2937', color: '#64748b' }}
      >
        <div className="font-semibold mb-1" style={{ color: '#94a3b8' }}>
          Format de données attendu (Arduino / Port Série)
        </div>
        Le banc d&apos;essai attend des messages JSON ou CSV envoyés ligne par ligne à une vitesse de 9600 bauds.
        <div className="mt-2 font-semibold">Exemple JSON :</div>
        <code className="block mt-1 p-2 rounded bg-black/40 text-[10px] text-emerald-400 font-mono">
          {"{\"temp_carburant\": 40.2, \"temp_echap\": 575.0, \"temp_admission\": 32.1, \"rpm\": 2800, \"vitesse\": 10.5, \"vibration\": 0.60}"}
        </code>
        <div className="mt-2 font-semibold">Exemple CSV :</div>
        <code className="block mt-1 p-2 rounded bg-black/40 text-[10px] text-emerald-400 font-mono">
          40.2,575.0,32.1,2800,10.5,0.60
        </code>
        <div className="mt-1 font-semibold text-[10px] text-slate-500">
          Ordre des valeurs CSV : Temp. Carburant, Temp. Échappement, Temp. Admission, RPM, Vitesse, Vibration.
        </div>
      </div>
    </div>
  )
}
