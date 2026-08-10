'use client'

import { useBench } from './BenchContext'

interface StatusPillProps {
  frozen: boolean
}

export function StatusPill({ frozen }: StatusPillProps) {
  const { connectionStatus } = useBench()

  const statusLabel = frozen
    ? "Arrêt d'urgence"
    : connectionStatus === 'connected'
      ? 'Acquisition Active'
      : connectionStatus === 'connecting'
        ? 'Connexion...'
        : 'Déconnecté'

  const activeColor = frozen
    ? '#ef4444'
    : connectionStatus === 'connected'
      ? '#10b981'
      : connectionStatus === 'connecting'
        ? '#f59e0b'
        : '#64748b'

  const bgColor = frozen
    ? 'rgba(239,68,68,0.1)'
    : connectionStatus === 'connected'
      ? 'rgba(16,185,129,0.1)'
      : connectionStatus === 'connecting'
        ? 'rgba(245,158,11,0.1)'
        : 'rgba(100,116,139,0.1)'

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-medium"
      style={{
        backgroundColor: bgColor,
        borderColor:     activeColor,
        color:           activeColor,
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
        style={{
          backgroundColor: activeColor,
          boxShadow: `0 0 6px 1px ${activeColor}99`,
        }}
      />
      {statusLabel}
    </div>
  )
}
