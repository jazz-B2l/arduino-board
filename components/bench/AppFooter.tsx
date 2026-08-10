'use client'

import { useEffect, useState } from 'react'
import { useBench } from './BenchContext'

function useElapsed(startTime: number) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    return () => clearInterval(id)
  }, [startTime])
  return elapsed
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':')
}

export function AppFooter() {
  const { stats, latest, alarms } = useBench()
  const elapsed = useElapsed(stats.startTime)
  const signalQuality = stats.totalFrames === 0
    ? 100
    : Math.round(((stats.totalFrames - stats.invalidFrames) / stats.totalFrames) * 100)

  const hasActive = alarms.length > 0

  return (
    <footer
      className="border-t px-4 py-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-mono"
      style={{ backgroundColor: '#0d1220', borderColor: '#1f2937', color: '#64748b' }}
    >
      {/* System status */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: hasActive ? '#f59e0b' : '#10b981' }}
        />
        <span>{hasActive ? 'Alarmes actives' : 'Système nominal'}</span>
      </div>

      <span className="opacity-30">|</span>

      {/* Elapsed */}
      <span>Durée: <span style={{ color: '#94a3b8' }}>{formatDuration(elapsed)}</span></span>

      <span className="opacity-30">|</span>

      {/* Last frame */}
      <span>
        Dernier trame:{' '}
        <span style={{ color: '#94a3b8' }}>
          {latest ? new Date(latest.timestamp).toLocaleTimeString('fr-FR') : '--'}
        </span>
      </span>

      <span className="opacity-30">|</span>

      {/* Signal quality */}
      <div className="flex items-center gap-1.5">
        <span>Signal:</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 rounded-sm"
              style={{
                height: `${6 + i * 2}px`,
                backgroundColor: i < Math.ceil(signalQuality / 20)
                  ? '#10b981'
                  : '#1f2937',
              }}
            />
          ))}
        </div>
        <span style={{ color: '#94a3b8' }}>{signalQuality}%</span>
      </div>

      <span className="opacity-30">|</span>

      {/* Source */}
      <span style={{ color: '#475569' }}>Mode démo — données simulées</span>

      {/* Frame count */}
      <span className="ml-auto opacity-60">
        {stats.totalFrames.toLocaleString('fr-FR')} trames
      </span>
    </footer>
  )
}
