'use client'

import { useEffect, useRef, useState } from 'react'
import type { MetricState } from '@/lib/types'

interface TempDisplayProps {
  label:   string
  value:   number | null
  unit:    string
  state:   MetricState
  minVal?: number | null
  maxVal?: number | null
  size?:   'sm' | 'md' | 'lg'
}

const stateBorder: Record<MetricState, string> = {
  OK:      'var(--bench-border)',
  WARNING: '#f59e0b',
  DANGER:  '#ef4444',
}

const stateText: Record<MetricState, string> = {
  OK:      'var(--bench-nominal)',
  WARNING: '#f59e0b',
  DANGER:  '#ef4444',
}

const stateBadge: Record<MetricState, string> = {
  OK:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  WARNING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  DANGER:  'bg-red-500/10 text-red-600 dark:text-red-400',
}

export function TempDisplay({
  label,
  value,
  unit,
  state,
  minVal,
  maxVal,
  size = 'md',
}: TempDisplayProps) {
  const cardClass = state === 'DANGER'
    ? 'state-danger-card'
    : state === 'WARNING'
    ? 'state-warning-card'
    : ''

  const textSize = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-2xl' : 'text-3xl'

  return (
    <div
      className={`relative rounded-md border p-4 flex flex-col gap-2 transition-colors shadow-sm ${cardClass}`}
      style={{
        backgroundColor: 'var(--bench-surface)',
        borderColor: stateBorder[state],
      }}
    >
      {/* State badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--bench-muted)' }}>
          {label}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm font-mono tracking-wider ${stateBadge[state]}`}>
          {state}
        </span>
      </div>

      {/* Main value */}
      <div
        className={`font-mono font-semibold tabular-nums leading-none ${textSize}`}
        style={{ color: stateText[state] }}
      >
        {value !== null && value !== undefined
          ? value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : '--.-'}
        <span className="text-base font-normal ml-1.5" style={{ color: 'var(--bench-muted)' }}>{unit}</span>
      </div>

      {/* Min/Max row */}
      {(minVal !== null && minVal !== undefined && maxVal !== null && maxVal !== undefined) && (
        <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: 'var(--bench-muted)' }}>
          <span>Min <span style={{ color: 'var(--bench-text)' }}>{minVal.toFixed(1)}</span></span>
          <span className="opacity-40">|</span>
          <span>Max <span style={{ color: 'var(--bench-text)' }}>{maxVal.toFixed(1)}</span></span>
        </div>
      )}
    </div>
  )
}
