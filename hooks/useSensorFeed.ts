'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SensorReading } from '@/lib/types'

const RING_BUFFER_SIZE = 36000 // 10h at 1 Hz
const TICK_MS = 1000

interface SimState {
  temp_carburant: number
  temp_echap:     number
  temp_admission: number
  rpm:            number
  vitesse:        number
  vibration:      number
  // spike state per metric
  spikeMetric:    keyof SensorReading | null
  spikeTicks:     number
  nextSpikeTick:  number
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function randomWalk(v: number, step: number, min: number, max: number) {
  return clamp(v + (Math.random() - 0.5) * 2 * step, min, max)
}

function makeInitial(): SimState {
  return {
    temp_carburant: 40,
    temp_echap:     575,
    temp_admission: 32,
    rpm:            2800,
    vitesse:        10,
    vibration:      0.6,
    spikeMetric:    null,
    spikeTicks:     0,
    nextSpikeTick:  Math.floor(120 + Math.random() * 60),
  }
}

const SPIKE_CONFIGS: {
  metric: keyof Omit<SimState, 'spikeMetric' | 'spikeTicks' | 'nextSpikeTick'>
  warningValue: number
  dangerValue: number
}[] = [
  { metric: 'temp_echap',     warningValue: 720, dangerValue: 920 },
  { metric: 'temp_carburant', warningValue: 65,  dangerValue: 83  },
  { metric: 'rpm',            warningValue: 6400, dangerValue: 7600 },
  { metric: 'vibration',      warningValue: 1.8,  dangerValue: 3.1  },
]

export interface FeedStats {
  totalFrames: number
  invalidFrames: number
  mode: 'demo' | 'serial'
  port: string
  startTime: number
}

export interface SensorFeedResult {
  latest:    SensorReading | null
  history:   SensorReading[]
  stats:     FeedStats
  frozen:    boolean
  freeze:    () => void
  unfreeze:  () => void
  restart:   () => void
}

export function useSensorFeed(): SensorFeedResult {
  const simRef        = useRef<SimState>(makeInitial())
  const tickCountRef  = useRef(0)
  const bufferRef     = useRef<SensorReading[]>([])
  const frozenRef     = useRef(false)
  const statsRef      = useRef<FeedStats>({
    totalFrames:  0,
    invalidFrames: 0,
    mode:  'demo',
    port:  'COM_SIM',
    startTime: Date.now(),
  })

  const [latest,  setLatest]  = useState<SensorReading | null>(null)
  const [history, setHistory] = useState<SensorReading[]>([])
  const [frozen,  setFrozen]  = useState(false)
  const [stats,   setStats]   = useState<FeedStats>(statsRef.current)

  const tick = useCallback(() => {
    if (frozenRef.current) return

    const s = simRef.current
    const tc = tickCountRef.current
    tickCountRef.current++

    let spike = s.spikeMetric
    let spikeTicks = s.spikeTicks

    // ── Spike trigger ──
    if (!spike && tc >= s.nextSpikeTick) {
      const cfg = SPIKE_CONFIGS[Math.floor(Math.random() * SPIKE_CONFIGS.length)]
      spike = cfg.metric as keyof SensorReading
      spikeTicks = Math.floor(10 + Math.random() * 10)
    }

    // ── Nominal drift ──
    let tc_carb = randomWalk(s.temp_carburant, 0.4, 35, 45)
    let tc_echap = randomWalk(s.temp_echap, 3, 500, 650)
    let tc_adm = randomWalk(s.temp_admission, 0.3, 25, 40)
    let rpm = randomWalk(s.rpm, 40, 2000, 3500)
    let vit = randomWalk(s.vitesse, 0.15, 5, 15)
    let vib = randomWalk(s.vibration, 0.04, 0.3, 0.9)

    // ── Apply spike to chosen metric ──
    if (spike && spikeTicks > 0) {
      const cfg = SPIKE_CONFIGS.find(c => c.metric === spike)!
      const dangerPhase = spikeTicks > 5
      const target = dangerPhase ? cfg.dangerValue : cfg.warningValue
      if (spike === 'temp_echap')     tc_echap = target + (Math.random() - 0.5) * 20
      if (spike === 'temp_carburant') tc_carb  = target + (Math.random() - 0.5) * 2
      if (spike === 'rpm')            rpm      = target + (Math.random() - 0.5) * 100
      if (spike === 'vibration')      vib      = target + (Math.random() - 0.5) * 0.1
      spikeTicks--
      if (spikeTicks === 0) {
        spike = null
        s.nextSpikeTick = tc + Math.floor(120 + Math.random() * 60)
      }
    }

    const reading: SensorReading = {
      timestamp:      Date.now(),
      temp_carburant: Math.round(tc_carb * 10) / 10,
      temp_echap:     Math.round(tc_echap * 10) / 10,
      temp_admission: Math.round(tc_adm * 10) / 10,
      rpm:            Math.round(rpm),
      vitesse:        Math.round(vit * 10) / 10,
      vibration:      Math.round(vib * 100) / 100,
    }

    simRef.current = { ...s, temp_carburant: tc_carb, temp_echap: tc_echap, temp_admission: tc_adm, rpm, vitesse: vit, vibration: vib, spikeMetric: spike, spikeTicks }

    // Push to ring buffer
    const buf = bufferRef.current
    buf.push(reading)
    if (buf.length > RING_BUFFER_SIZE) buf.shift()

    statsRef.current.totalFrames++

    setLatest(reading)
    setHistory([...buf])
    setStats({ ...statsRef.current })
  }, [])

  const freeze  = useCallback(() => { frozenRef.current = true;  setFrozen(true)  }, [])
  const unfreeze = useCallback(() => { frozenRef.current = false; setFrozen(false) }, [])

  const restart = useCallback(() => {
    simRef.current       = makeInitial()
    tickCountRef.current = 0
    bufferRef.current    = []
    frozenRef.current    = false
    statsRef.current     = {
      totalFrames:  0,
      invalidFrames: 0,
      mode:  'demo',
      port:  'COM_SIM',
      startTime: Date.now(),
    }
    setFrozen(false)
    setLatest(null)
    setHistory([])
    setStats({ ...statsRef.current })
  }, [])

  useEffect(() => {
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [tick])

  return { latest, history, stats, frozen, freeze, unfreeze, restart }
}
