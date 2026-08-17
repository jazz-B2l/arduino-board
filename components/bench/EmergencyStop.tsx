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
        <span className="text-xs font-mono" style={{ color: '#f59e0b' }}>Confirm resume?</span>
        <button
          onClick={() => { onResume(); setConfirming(false) }}
          className="px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-colors cursor-pointer"
          style={{ borderColor: '#10b981', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' }}
        >
          Resume
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer"
          style={{ borderColor: 'var(--bench-border)', color: 'var(--bench-muted)', backgroundColor: 'var(--bench-surface)' }}
        >
          Cancel
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
        Resume session
      </button>
    )
  }

  return null
}
