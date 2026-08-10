'use client'

import { useEffect, useState } from 'react'
import { EmergencyStop } from './EmergencyStop'
import { StatusPill } from './StatusPill'
import { useBench } from './BenchContext'

function LiveClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const fmt = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono text-base font-semibold tabular-nums" style={{ color: '#94a3b8' }}>
      {time}
    </span>
  )
}

export function AppHeader() {
  const { frozen, freeze, unfreeze } = useBench()

  return (
    <>
      {frozen && (
        <div
          className="w-full text-center py-2 text-sm font-mono font-bold tracking-widest uppercase z-50"
          style={{ backgroundColor: '#ef4444', color: '#fff' }}
          role="alert"
        >
          ⏹ ARRÊT D&apos;URGENCE ACTIVÉ — acquisition suspendue
        </div>
      )}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 border-b"
        style={{ backgroundColor: '#0d1220', borderColor: '#1f2937' }}
      >
        {/* Logo + title */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-sm"
            style={{ backgroundColor: '#1f2937', color: '#3b82f6', border: '1px solid #3b82f6' }}
            aria-hidden="true"
          >
            BE
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3b82f6' }}>
              Banc d&apos;Essai
            </span>
            <span className="text-[10px]" style={{ color: '#64748b' }}>Monitoring Pro</span>
          </div>
        </div>

        {/* Center: status + clock */}
        <div className="flex items-center gap-4">
          <StatusPill frozen={frozen} />
          <LiveClock />
        </div>

        {/* Emergency stop */}
        <EmergencyStop frozen={frozen} onFreeze={freeze} onResume={unfreeze} />
      </header>
    </>
  )
}
