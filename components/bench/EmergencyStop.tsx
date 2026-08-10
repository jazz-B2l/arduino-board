'use client'

import { useState } from 'react'

interface EmergencyStopProps {
  frozen:   boolean
  onFreeze: () => void
  onResume: () => void
}

export function EmergencyStop({ frozen, onFreeze, onResume }: EmergencyStopProps) {
  const [confirming, setConfirming] = useState(false)

  if (frozen && confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color: '#f59e0b' }}>Confirmer la reprise ?</span>
        <button
          onClick={() => { onResume(); setConfirming(false) }}
          className="px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-colors"
          style={{ borderColor: '#10b981', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' }}
        >
          Reprendre
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded text-xs font-mono border transition-colors"
          style={{ borderColor: '#1f2937', color: '#64748b', backgroundColor: '#111827' }}
        >
          Annuler
        </button>
      </div>
    )
  }

  if (frozen) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded text-xs font-mono font-semibold border tracking-widest uppercase"
        style={{ borderColor: '#f59e0b', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)' }}
      >
        Reprendre session
      </button>
    )
  }

  return (
    <button
      onClick={onFreeze}
      className="relative px-5 py-2 rounded font-mono font-bold text-sm tracking-wider uppercase transition-all active:scale-95"
      style={{
        backgroundColor: '#7f1d1d',
        color: '#fca5a5',
        border: '2px solid #ef4444',
        boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.5), 0 2px 8px rgba(239,68,68,0.3)',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}
      onMouseDown={e => {
        const el = e.currentTarget
        el.style.boxShadow = 'inset 0 4px 8px rgba(0,0,0,0.6)'
        el.style.transform  = 'translateY(1px)'
      }}
      onMouseUp={e => {
        const el = e.currentTarget
        el.style.boxShadow = 'inset 0 3px 6px rgba(0,0,0,0.5), 0 2px 8px rgba(239,68,68,0.3)'
        el.style.transform  = ''
      }}
      aria-label="Arrêt d'urgence — stoppe immédiatement l'acquisition de données"
    >
      ⏹ ARRÊT D&apos;URGENCE
    </button>
  )
}
