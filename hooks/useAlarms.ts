'use client'

import { useEffect, useRef, useState } from 'react'
import type { AlarmEvent, MetricKey, SensorReading, Thresholds } from '@/lib/types'
import { getMetricState } from '@/lib/types'

const THRESHOLD_METRICS: MetricKey[] = [
  'temp_echap',
  'temp_carburant',
  'temp_admission',
  'rpm',
  'vibration',
]

export function useAlarms(
  latest: SensorReading | null,
  thresholds: Thresholds
): AlarmEvent[] {
  const prevStates = useRef<Record<string, string>>({})
  const [alarms, setAlarms] = useState<AlarmEvent[]>([])

  useEffect(() => {
    if (!latest) return

    const newEvents: AlarmEvent[] = []

    for (const metric of THRESHOLD_METRICS) {
      const value = latest[metric as keyof SensorReading] as number
      const state = getMetricState(metric, value, thresholds)
      const prev  = prevStates.current[metric] ?? 'OK'

      // Edge-triggered: only on state transitions
      if (state !== prev) {
        if (state === 'WARNING' || state === 'DANGER') {
          newEvents.push({
            id:        `${metric}-${latest.timestamp}`,
            metric,
            level:     state,
            value,
            timestamp: latest.timestamp,
          })
        }
      }
      prevStates.current[metric] = state
    }

    if (newEvents.length > 0) {
      setAlarms(prev => [...newEvents, ...prev])
    }
  }, [latest, thresholds])

  return alarms
}
