'use client'

import { useMemo } from 'react'
import type { MetricState } from '@/lib/types'

interface SparklineProps {
  data:    number[]
  label:   string
  unit:    string
  color:   string
  state:   MetricState
  height?: number
  width?:  number
}

const stateColor: Record<MetricState, string> = {
  OK:      '#10b981',
  WARNING: '#f59e0b',
  DANGER:  '#ef4444',
}

export function Sparkline({ data, label, unit, color, state, height = 48, width = 120 }: SparklineProps) {
  const lineColor = stateColor[state] ?? color

  const path = useMemo(() => {
    if (data.length < 2) return ''
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height * 0.85)
      return `${x},${y}`
    })
    return `M ${pts.join(' L ')}`
  }, [data, width, height])

  const latest = data[data.length - 1]

  return (
    <div
      className="flex flex-col gap-1 rounded-md p-2 shadow-sm"
      style={{ backgroundColor: 'var(--bench-surface)', border: '1px solid var(--bench-border)', minWidth: width }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--bench-muted)' }}>{label}</span>
        <span
          className="text-xs font-mono font-semibold tabular-nums"
          style={{ color: lineColor }}
        >
          {latest?.toFixed(1)} <span className="text-[9px]" style={{ color: 'var(--bench-muted)' }}>{unit}</span>
        </span>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {path && (
          <>
            <path d={path} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
            {/* Area fill */}
            <path
              d={`${path} L ${width},${height} L 0,${height} Z`}
              fill={lineColor}
              opacity={0.08}
            />
          </>
        )}
      </svg>
    </div>
  )
}
