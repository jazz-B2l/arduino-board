'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_THRESHOLDS, type Thresholds } from '@/lib/types'

const STORAGE_KEY = 'bench_thresholds'

export function useThresholds() {
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setThresholds({ ...DEFAULT_THRESHOLDS, ...parsed })
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const update = useCallback((next: Thresholds) => {
    setThresholds(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }, [])

  const reset = useCallback(() => {
    setThresholds(DEFAULT_THRESHOLDS)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  return { thresholds, update, reset }
}
