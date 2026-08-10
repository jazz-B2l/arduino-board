'use client'

import { createContext, useContext, useMemo } from 'react'
import { useAlarms } from '@/hooks/useAlarms'
import { useSensorFeed, type FeedStats, type SensorFeedResult } from '@/hooks/useSensorFeed'
import { useThresholds } from '@/hooks/useThresholds'
import { DEFAULT_THRESHOLDS, getMetricState, type AlarmEvent, type MetricState, type SensorReading, type Thresholds } from '@/lib/types'

interface BenchContextValue {
  latest:       SensorReading | null
  history:      SensorReading[]
  stats:        FeedStats
  frozen:       boolean
  freeze:       () => void
  unfreeze:     () => void
  restart:      () => void
  thresholds:   Thresholds
  updateThresholds: (t: Thresholds) => void
  resetThresholds:  () => void
  alarms:       AlarmEvent[]
  stateOf:      (metric: string) => MetricState
  connect:          () => Promise<void>
  disconnect:       () => Promise<void>
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  serialError:      string | null
  serialSupported:  boolean
}

const BenchContext = createContext<BenchContextValue | null>(null)

export function BenchProvider({ children }: { children: React.ReactNode }) {
  const feed       = useSensorFeed()
  const { thresholds, update: updateThresholds, reset: resetThresholds } = useThresholds()
  const alarms     = useAlarms(feed.latest, thresholds)

  const stateOf = useMemo(() => (metric: string): MetricState => {
    if (!feed.latest) return 'OK'
    const value = feed.latest[metric as keyof SensorReading] as number
    return getMetricState(metric, value, thresholds)
  }, [feed.latest, thresholds])

  const value: BenchContextValue = {
    ...feed,
    thresholds,
    updateThresholds,
    resetThresholds,
    alarms,
    stateOf,
  }

  return <BenchContext.Provider value={value}>{children}</BenchContext.Provider>
}

export function useBench(): BenchContextValue {
  const ctx = useContext(BenchContext)
  if (!ctx) throw new Error('useBench must be used within <BenchProvider>')
  return ctx
}
