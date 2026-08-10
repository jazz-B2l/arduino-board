'use client'

import { useEffect, useRef } from 'react'
import type { MetricState } from '@/lib/types'

interface ZoneBand {
  from: number  // 0-1 normalized
  to:   number
  color: string
}

interface AnalogGaugeProps {
  label:    string
  value:    number
  unit:     string
  min:      number
  max:      number
  state:    MetricState
  zones?:   ZoneBand[]
  size?:    number
}

const stateColor: Record<MetricState, string> = {
  OK:      '#10b981',
  WARNING: '#f59e0b',
  DANGER:  '#ef4444',
}

// Arc from -210° to +30° (240° sweep), measured from 3-o'clock
// We use: start angle = 150° (left-bottom), end angle = 30° (right-bottom)
// In SVG: 0° = right, clockwise
const ARC_START_DEG = 150   // degrees from 3 o'clock, clockwise
const ARC_END_DEG   = 30    // degrees from 3 o'clock, clockwise  (going through 270 = top)
const ARC_SWEEP     = 240   // degrees

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = toRad(deg)
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  clockwise = true
) {
  const start = polarToXY(cx, cy, r, startDeg)
  const end   = polarToXY(cx, cy, r, endDeg)
  // Sweep in degrees going clockwise from startDeg to endDeg
  let sweep = clockwise ? (endDeg - startDeg + 360) % 360 : (startDeg - endDeg + 360) % 360
  const largeArc = sweep > 180 ? 1 : 0
  const sweepFlag = clockwise ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`
}

function valueToDeg(value: number, min: number, max: number): number {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  // Map 0→ARC_START_DEG, 1→ARC_START_DEG+SWEEP (clockwise)
  return ARC_START_DEG + t * ARC_SWEEP
}

const DEFAULT_ZONES: ZoneBand[] = [
  { from: 0,    to: 0.6,  color: '#3b82f6' },
  { from: 0.6,  to: 0.8,  color: '#10b981' },
  { from: 0.8,  to: 0.92, color: '#f59e0b' },
  { from: 0.92, to: 1,    color: '#ef4444' },
]

export function AnalogGauge({
  label,
  value,
  unit,
  min,
  max,
  state,
  zones = DEFAULT_ZONES,
  size = 200,
}: AnalogGaugeProps) {
  const needleRef = useRef<SVGGElement>(null)
  const prevAngleRef = useRef<number | null>(null)
  const animRef = useRef<number | null>(null)

  const cx = size / 2
  const cy = size / 2
  const R  = size * 0.38
  const trackR = R
  const trackWidth = size * 0.07
  const needleLen  = R * 0.82
  const needleBase = R * 0.12

  // Target needle angle
  const targetDeg = valueToDeg(value, min, max)

  // Animate needle with requestAnimationFrame ease
  useEffect(() => {
    const targetAngle = targetDeg - 90  // SVG rotation: 0° = up

    if (prevAngleRef.current === null) {
      prevAngleRef.current = targetAngle
      if (needleRef.current) {
        needleRef.current.setAttribute('transform', `rotate(${targetAngle}, ${cx}, ${cy})`)
      }
      return
    }

    const startAngle = prevAngleRef.current
    const diff = targetAngle - startAngle
    const duration = 600
    const startTime = performance.now()

    if (animRef.current !== null) cancelAnimationFrame(animRef.current)

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      // ease-out cubic
      const eased = 1 - (1 - t) ** 3
      const angle = startAngle + diff * eased
      if (needleRef.current) {
        needleRef.current.setAttribute('transform', `rotate(${angle}, ${cx}, ${cy})`)
      }
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        prevAngleRef.current = targetAngle
      }
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current) }
  }, [targetDeg, cx, cy])

  const glowClass = state === 'DANGER' ? 'gauge-danger' : state === 'WARNING' ? 'gauge-warning' : ''
  const needleColor = stateColor[state]

  // Tick marks
  const ticks = []
  for (let i = 0; i <= 10; i++) {
    const t   = i / 10
    const deg = ARC_START_DEG + t * ARC_SWEEP
    const inner = i % 5 === 0 ? R * 0.72 : R * 0.78
    const outer = R * 0.88
    const p1 = polarToXY(cx, cy, inner, deg)
    const p2 = polarToXY(cx, cy, outer, deg)
    ticks.push(
      <line
        key={i}
        x1={p1.x} y1={p1.y}
        x2={p2.x} y2={p2.y}
        stroke="#374151"
        strokeWidth={i % 5 === 0 ? 2 : 1}
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size * 0.85}
        viewBox={`0 0 ${size} ${size * 0.85}`}
        className={glowClass}
        style={{ overflow: 'visible' }}
        role="img"
        aria-label={`${label}: ${value} ${unit}`}
      >
        {/* Background track */}
        <path
          d={describeArc(cx, cy, trackR, ARC_START_DEG, ARC_START_DEG + ARC_SWEEP)}
          fill="none"
          stroke="#1f2937"
          strokeWidth={trackWidth}
          strokeLinecap="round"
        />

        {/* Colored zone bands */}
        {zones.map((zone, i) => {
          const zStartDeg = ARC_START_DEG + zone.from * ARC_SWEEP
          const zEndDeg   = ARC_START_DEG + zone.to   * ARC_SWEEP
          return (
            <path
              key={i}
              d={describeArc(cx, cy, trackR, zStartDeg, zEndDeg)}
              fill="none"
              stroke={zone.color}
              strokeWidth={trackWidth}
              strokeLinecap="butt"
              opacity={0.55}
            />
          )
        })}

        {/* Value progress arc */}
        <path
          d={describeArc(cx, cy, trackR, ARC_START_DEG, ARC_START_DEG + ((value - min) / (max - min)) * ARC_SWEEP)}
          fill="none"
          stroke={needleColor}
          strokeWidth={trackWidth * 0.45}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* Tick marks */}
        {ticks}

        {/* Needle */}
        <g ref={needleRef}>
          <line
            x1={cx}
            y1={cy + needleBase}
            x2={cx}
            y2={cy - needleLen}
            stroke={needleColor}
            strokeWidth={size * 0.018}
            strokeLinecap="round"
          />
        </g>

        {/* Center cap */}
        <circle cx={cx} cy={cy} r={size * 0.035} fill={needleColor} />
        <circle cx={cx} cy={cy} r={size * 0.018} fill="#0a0e1a" />

        {/* Value text */}
        <text
          x={cx}
          y={cy + size * 0.22}
          textAnchor="middle"
          fontSize={size * 0.13}
          fontFamily="var(--font-mono)"
          fontWeight="600"
          fill={needleColor}
        >
          {typeof value === 'number' ? value.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '--'}
        </text>

        {/* Unit text */}
        <text
          x={cx}
          y={cy + size * 0.34}
          textAnchor="middle"
          fontSize={size * 0.072}
          fontFamily="var(--font-mono)"
          fill="#64748b"
        >
          {unit}
        </text>
      </svg>

      <span
        className="text-xs font-medium tracking-widest uppercase text-center"
        style={{ color: '#94a3b8', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </span>
    </div>
  )
}
