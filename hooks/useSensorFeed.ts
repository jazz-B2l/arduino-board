'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SensorReading } from '@/lib/types'

const RING_BUFFER_SIZE = 36000 // 10h at 1 Hz

export interface FeedStats {
  totalFrames: number
  invalidFrames: number
  mode: 'serial'
  port: string
  startTime: number
}

export interface SensorFeedResult {
  latest:           SensorReading | null
  history:          SensorReading[]
  stats:            FeedStats
  frozen:           boolean
  freeze:           () => void
  unfreeze:         () => void
  restart:          () => void
  connect:          () => Promise<void>
  disconnect:       () => Promise<void>
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  serialError:      string | null
  serialSupported:  boolean
}

export function useSensorFeed(): SensorFeedResult {
  const bufferRef     = useRef<SensorReading[]>([])
  const frozenRef     = useRef(false)
  const statsRef      = useRef<FeedStats>({
    totalFrames:   0,
    invalidFrames: 0,
    mode:          'serial',
    port:          'Aucun',
    startTime:     Date.now(),
  })

  const [latest,  setLatest]  = useState<SensorReading | null>(null)
  const [history, setHistory] = useState<SensorReading[]>([])
  const [frozen,  setFrozen]  = useState(false)
  const [stats,   setStats]   = useState<FeedStats>(statsRef.current)

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [serialError, setSerialError] = useState<string | null>(null)
  const [portName, setPortName] = useState<string>('Aucun')
  const [serialSupported, setSerialSupported] = useState(false)

  const portRef = useRef<any | null>(null)
  const readerRef = useRef<any | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const portNameRef = useRef<string>('Aucun')

  useEffect(() => {
    setSerialSupported(typeof window !== 'undefined' && 'serial' in navigator)
  }, [])

  const freeze   = useCallback(() => { frozenRef.current = true;  setFrozen(true)  }, [])
  const unfreeze = useCallback(() => { frozenRef.current = false; setFrozen(false) }, [])

  const restart  = useCallback(() => {
    bufferRef.current    = []
    statsRef.current     = {
      ...statsRef.current,
      totalFrames:   0,
      invalidFrames: 0,
      startTime:     Date.now(),
    }
    setLatest(null)
    setHistory([])
    setStats({ ...statsRef.current })
  }, [])

  const disconnect = useCallback(async () => {
    if (readerRef.current) {
      try {
        await readerRef.current.cancel()
      } catch (e) {}
      readerRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (portRef.current) {
      try {
        await portRef.current.close()
      } catch (e) {}
      portRef.current = null
    }
    portNameRef.current = 'Aucun'
    setPortName('Aucun')
    statsRef.current.port = 'Aucun'
    setStats({ ...statsRef.current })
    setConnectionStatus('disconnected')
  }, [])

  const processTelemetryLine = useCallback((line: string) => {
    statsRef.current.totalFrames++
    try {
      let parsed: Partial<SensorReading> = {}
      if (line.startsWith('{') && line.endsWith('}')) {
        parsed = JSON.parse(line)
      } else {
        // Try CSV format (expected order: temp_carburant, temp_echap, temp_admission, rpm, vitesse, vibration)
        const parts = line.split(/[,;\s]+/)
        parsed = {}
        if (parts.length > 0 && parts[0] !== '') parsed.temp_carburant = parseFloat(parts[0])
        if (parts.length > 1 && parts[1] !== '') parsed.temp_echap     = parseFloat(parts[1])
        if (parts.length > 2 && parts[2] !== '') parsed.temp_admission = parseFloat(parts[2])
        if (parts.length > 3 && parts[3] !== '') parsed.rpm            = parseFloat(parts[3])
        if (parts.length > 4 && parts[4] !== '') parsed.vitesse        = parseFloat(parts[4])
        if (parts.length > 5 && parts[5] !== '') parsed.vibration      = parseFloat(parts[5])
      }

      // Build reading from parsed fields
      const reading: SensorReading = {
        timestamp: Date.now(),
      }

      let hasValidField = false

      if (typeof parsed.temp_carburant === 'number' && !isNaN(parsed.temp_carburant)) {
        reading.temp_carburant = Math.round(parsed.temp_carburant * 10) / 10
        hasValidField = true
      }
      if (typeof parsed.temp_echap === 'number' && !isNaN(parsed.temp_echap)) {
        reading.temp_echap = Math.round(parsed.temp_echap * 10) / 10
        hasValidField = true
      }
      if (typeof parsed.temp_admission === 'number' && !isNaN(parsed.temp_admission)) {
        reading.temp_admission = Math.round(parsed.temp_admission * 10) / 10
        hasValidField = true
      }
      if (typeof parsed.rpm === 'number' && !isNaN(parsed.rpm)) {
        reading.rpm = Math.round(parsed.rpm)
        hasValidField = true
      }
      if (typeof parsed.vitesse === 'number' && !isNaN(parsed.vitesse)) {
        reading.vitesse = Math.round(parsed.vitesse * 10) / 10
        hasValidField = true
      }
      if (typeof parsed.vibration === 'number' && !isNaN(parsed.vibration)) {
        reading.vibration = Math.round(parsed.vibration * 100) / 100
        hasValidField = true
      }

      if (hasValidField) {
        // Drop frames if Emergency Stop (frozen) is active
        if (frozenRef.current) {
          setStats({ ...statsRef.current })
          return
        }

        const buf = bufferRef.current
        buf.push(reading)
        if (buf.length > RING_BUFFER_SIZE) buf.shift()

        setLatest(reading)
        setHistory([...buf])
        setStats({ ...statsRef.current })
      } else {
        statsRef.current.invalidFrames++
        setStats({ ...statsRef.current })
      }
    } catch (e) {
      statsRef.current.invalidFrames++
      setStats({ ...statsRef.current })
    }
  }, [])

  const readLoop = async (port: any, signal: AbortSignal) => {
    try {
      // @ts-ignore
      const textDecoder = new TextDecoderStream()
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable, { signal })
      const reader = textDecoder.readable.getReader()
      readerRef.current = reader

      let buffer = ''
      while (!signal.aborted) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          processTelemetryLine(trimmed)
        }
      }
    } catch (err) {
      if (!signal.aborted) {
        console.error('Error reading from serial port:', err)
        setSerialError('Erreur de lecture du port série')
        setConnectionStatus('error')
      }
    }
  }

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      setSerialError("L'API Web Serial n'est pas supportée par ce navigateur.")
      setConnectionStatus('error')
      return
    }

    try {
      setConnectionStatus('connecting')
      setSerialError(null)

      // @ts-ignore
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })

      portRef.current = port
      const info = port.getInfo()
      const name = info.usbVendorId
        ? `USB (VID: 0x${info.usbVendorId.toString(16).toUpperCase()}, PID: 0x${info.usbProductId?.toString(16).toUpperCase()})`
        : 'Port Série'
      
      portNameRef.current = name
      setPortName(name)
      statsRef.current.port = name
      setStats({ ...statsRef.current })

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setConnectionStatus('connected')

      // Start asynchronous read loop
      readLoop(port, abortController.signal)
    } catch (err: any) {
      console.error(err)
      setSerialError(err?.message || 'Erreur de connexion série')
      setConnectionStatus('error')
      try {
        await disconnect()
      } catch {}
    }
  }, [disconnect, processTelemetryLine])

  useEffect(() => {
    const handleDisconnect = (event: any) => {
      const disconnectedPort = event.port
      if (portRef.current && portRef.current === disconnectedPort) {
        disconnect()
      }
    }

    if (typeof window !== 'undefined' && 'serial' in navigator) {
      navigator.serial.addEventListener('disconnect', handleDisconnect)
    }
    return () => {
      if (typeof window !== 'undefined' && 'serial' in navigator) {
        navigator.serial.removeEventListener('disconnect', handleDisconnect)
      }
      disconnect()
    }
  }, [disconnect])

  return {
    latest,
    history,
    stats,
    frozen,
    freeze,
    unfreeze,
    restart,
    connect,
    disconnect,
    connectionStatus,
    serialError,
    serialSupported,
  }
}
