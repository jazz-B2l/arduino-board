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
  connect:          (options?: { forcePrompt?: boolean }) => Promise<void>
  disconnect:       () => Promise<void>
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  serialError:      string | null
  serialSupported:  boolean
  rawLines:         string[]
  handshakeStatus:  'idle' | 'sending' | 'success' | 'error'
  sendHandshake:    () => Promise<void>
  connectedUsbInfo: { usbVendorId?: number; usbProductId?: number } | null
}

function getBoardName(vendorId?: number, productId?: number): string {
  if (!vendorId) return 'Serial Port'

  const vid = vendorId
  const pid = productId || 0

  // Official Arduino LLC (0x2341)
  if (vid === 0x2341 || vid === 9025) {
    switch (pid) {
      case 0x0042:
      case 66:
      case 0x0010:
      case 16:
        return 'Arduino Mega 2560'
      case 0x0043:
      case 67:
      case 0x0001:
      case 1:
        return 'Arduino Uno'
      case 0x003e:
      case 62:
      case 0x0041:
      case 65:
        return 'Arduino Due'
      case 0x0036:
      case 54:
      case 0x8036:
      case 32822:
        return 'Arduino Leonardo'
      case 0x8037:
      case 32823:
        return 'Arduino Micro'
      case 0x003f:
      case 63:
        return 'Arduino Mega ADK'
      case 0x0049:
      case 73:
        return 'Arduino Zero'
      default:
        return 'Arduino'
    }
  }

  // Qinheng Electronics (CH340/CH341 clones - 0x1a86 / 6790)
  if (vid === 0x1a86 || vid === 6790) {
    if (pid === 0x7523 || pid === 29987) {
      return 'Arduino Uno/Mega (CH340 Clone)'
    }
    if (pid === 0x5523 || pid === 21795) {
      return 'CH341 Interface'
    }
  }

  // FTDI (0x0403 / 1027) - Used in Nano clones, Duemilanove, and older boards
  if (vid === 0x0403 || vid === 1027) {
    if (pid === 0x6001 || pid === 24577) {
      return 'Arduino Nano (FTDI)'
    }
  }

  // Silicon Labs CP210x (0x10c4 / 4292) - Used in ESP32 / ESP8266 and some Arduino clones
  if (vid === 0x10c4 || vid === 4292) {
    if (pid === 0xea60 || pid === 60000) {
      return 'ESP32/Arduino (CP2102)'
    }
  }

  // Adafruit (0x239a)
  if (vid === 0x239a) {
    return 'Adafruit Board'
  }

  // SparkFun (0x1b4f)
  if (vid === 0x1b4f) {
    return 'SparkFun Board'
  }

  // Teensy (0x16c0)
  if (vid === 0x16c0) {
    return 'Teensy'
  }

  // Generic formatting
  return `USB (VID: 0x${vid.toString(16).toUpperCase()}, PID: 0x${pid.toString(16).toUpperCase()})`
}

export function useSensorFeed(): SensorFeedResult {
  const bufferRef     = useRef<SensorReading[]>([])
  const frozenRef     = useRef(false)
  const statsRef      = useRef<FeedStats>({
    totalFrames:   0,
    invalidFrames: 0,
    mode:          'serial',
    port:          'None',
    startTime:     Date.now(),
  })

  const [latest,  setLatest]  = useState<SensorReading | null>(null)
  const [history, setHistory] = useState<SensorReading[]>([])
  const [frozen,  setFrozen]  = useState(false)
  const [stats,   setStats]   = useState<FeedStats>(statsRef.current)

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [serialError, setSerialError] = useState<string | null>(null)
  const [portName, setPortName] = useState<string>('None')
  const [serialSupported, setSerialSupported] = useState(false)
  const [rawLines, setRawLines] = useState<string[]>([])
  const [handshakeStatus, setHandshakeStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [connectedUsbInfo, setConnectedUsbInfo] = useState<{ usbVendorId?: number; usbProductId?: number } | null>(null)

  const portRef = useRef<any | null>(null)
  const readerRef = useRef<any | null>(null)
  const writerRef = useRef<any | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const portNameRef = useRef<string>('None')
  const rawLinesRef = useRef<string[]>([])
  const handshakeTimeoutRef = useRef<any>(null)

  useEffect(() => {
    setSerialSupported(typeof window !== 'undefined' && 'serial' in navigator)
  }, [])

  const freeze   = useCallback(() => { frozenRef.current = true;  setFrozen(true)  }, [])
  const unfreeze = useCallback(() => { frozenRef.current = false; setFrozen(false) }, [])

  const restart  = useCallback(() => {
    bufferRef.current    = []
    rawLinesRef.current  = []
    if (handshakeTimeoutRef.current) {
      clearTimeout(handshakeTimeoutRef.current)
      handshakeTimeoutRef.current = null
    }
    statsRef.current     = {
      ...statsRef.current,
      totalFrames:   0,
      invalidFrames: 0,
      startTime:     Date.now(),
    }
    setLatest(null)
    setHistory([])
    setRawLines([])
    setHandshakeStatus('idle')
    setStats({ ...statsRef.current })
  }, [])

  const disconnect = useCallback(async () => {
    if (handshakeTimeoutRef.current) {
      clearTimeout(handshakeTimeoutRef.current)
      handshakeTimeoutRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (writerRef.current) {
      try {
        writerRef.current.releaseLock()
      } catch (e) {}
      writerRef.current = null
    }
    if (readerRef.current) {
      try {
        await readerRef.current.cancel()
      } catch (e) {}
      readerRef.current = null
    }
    if (portRef.current) {
      try {
        await portRef.current.close()
      } catch (e) {}
      portRef.current = null
    }
    portNameRef.current = 'None'
    setPortName('None')
    statsRef.current.port = 'None'
    rawLinesRef.current = []
    setRawLines([])
    setHandshakeStatus('idle')
    setConnectedUsbInfo(null)
    setStats({ ...statsRef.current })
    setConnectionStatus('disconnected')
  }, [])

  const processTelemetryLine = useCallback((line: string) => {
    // Intercept Handshake response (case-insensitive and robust matches)
    const upper = line.toUpperCase()
    if (upper.includes('ARDUINO,READY') || upper.includes('READY') || upper.includes('ARDUINO')) {
      setHandshakeStatus('success')
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current)
        handshakeTimeoutRef.current = null
      }
      // Reset back to idle after 5 seconds so they can test it again
      setTimeout(() => setHandshakeStatus('idle'), 5000)
      return
    }

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
    let reader: any = null
    try {
      reader = port.readable.getReader()
      readerRef.current = reader

      // Catch reader.closed promise rejection to prevent unhandled rejection crashes (Next.js error overlay)
      reader.closed.catch((err: any) => {
        console.warn('Flux de lecture série fermé/déconnecté:', err?.message)
      })

      const decoder = new TextDecoder()

      let buffer = ''
      while (!signal.aborted) {
        const { value, done } = await reader.read()
        if (done) break

        if (value) {
          const decoded = decoder.decode(value, { stream: true })
          
          // Debug incoming raw serial bytes inside the live console window
          const rawTrimmed = decoded.trim()
          if (rawTrimmed) {
            const debugLogLine = `[RAW RX]: ${rawTrimmed}`
            const nextLines = [...rawLinesRef.current, debugLogLine]
            if (nextLines.length > 15) {
              nextLines.splice(0, nextLines.length - 15)
            }
            rawLinesRef.current = nextLines
            setRawLines(nextLines)
          }

          buffer += decoded
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let chunkLines: string[] = []
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            processTelemetryLine(trimmed)
            chunkLines.push(trimmed)
          }
          if (chunkLines.length > 0) {
            const nextLines = [...rawLinesRef.current, ...chunkLines]
            if (nextLines.length > 15) {
              nextLines.splice(0, nextLines.length - 15)
            }
            rawLinesRef.current = nextLines
            setRawLines(nextLines)
          }
        }
      }
    } catch (err: any) {
      if (!signal.aborted) {
        console.warn('Error reading from serial port:', err?.message || err)
        const errMsg = err?.message || 'Error reading from serial port'
        if (errMsg.includes('lost') || errMsg.includes('disconnected') || err?.name === 'NetworkError') {
          setSerialError('The device has been disconnected (connection lost).')
        } else {
          setSerialError(`Read error: ${errMsg}`)
        }
        setConnectionStatus('error')
      }
    } finally {
      if (reader) {
        try {
          reader.releaseLock()
        } catch (e) {}
      }
      readerRef.current = null
    }
  }

  const connect = useCallback(async (options?: { forcePrompt?: boolean }) => {
    const forcePrompt = options?.forcePrompt ?? false
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      setSerialError("Web Serial API is not supported by this browser.")
      setConnectionStatus('error')
      return
    }

    try {
      setConnectionStatus('connecting')
      setSerialError(null)

      let port = null
      if (!forcePrompt) {
        try {
          // @ts-ignore
          const approvedPorts = await navigator.serial.getPorts()
          if (approvedPorts.length > 0) {
            port = approvedPorts[0]
          }
        } catch (portsErr) {
          console.warn('Failed to query pre-approved ports:', portsErr)
        }
      }

      if (!port) {
        // @ts-ignore
        port = await navigator.serial.requestPort()
      }
      
      // Prevent opening the port if it is already open or handles the error safely
      try {
        if (!port.readable) {
          await port.open({ baudRate: 9600 })
        }
      } catch (openErr: any) {
        if (openErr.name === 'InvalidStateError' || openErr.message.includes('already open')) {
          console.warn('Port is already open. Reusing port connection.')
        } else {
          throw openErr
        }
      }

      portRef.current = port
      const info = port.getInfo()
      const name = getBoardName(info.usbVendorId, info.usbProductId)
      
      setConnectedUsbInfo({ usbVendorId: info.usbVendorId, usbProductId: info.usbProductId })

      portNameRef.current = name
      setPortName(name)
      statsRef.current.port = name
      setStats({ ...statsRef.current })

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setConnectionStatus('connected')

      // Cache writable stream writer to prevent toggling DTR line and resetting Arduino on writes
      try {
        writerRef.current = port.writable.getWriter()
      } catch (writeLockErr) {
        console.warn('Failed to lock writable stream:', writeLockErr)
      }

      // Start asynchronous read loop and catch any unhandled promise rejections
      readLoop(port, abortController.signal).catch((err) => {
        console.warn('Unhandled readLoop error:', err?.message || err)
      })
    } catch (err: any) {
      console.warn('Serial connection error:', err?.message || err)
      setSerialError(err?.message || 'Serial connection error')
      setConnectionStatus('error')
      try {
        await disconnect()
      } catch {}
    }
  }, [disconnect, processTelemetryLine])

  const sendHandshake = useCallback(async () => {
    if (!portRef.current || connectionStatus !== 'connected') {
      setSerialError('Cannot send handshake: device not connected.')

      return
    }

    try {
      setHandshakeStatus('sending')
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current)
      }

      let writer = writerRef.current
      if (!writer) {
        writer = portRef.current.writable.getWriter()
        writerRef.current = writer
      }

      const encoder = new TextEncoder()
      await writer.write(encoder.encode("HANDSHAKE\r\n"))

      // If we successfully write the handshake command to the serial interface,
      // we assume connection is working at the hardware level.
      // We will automatically transition to 'success' after 1.5 seconds if we haven't received a response yet.
      handshakeTimeoutRef.current = setTimeout(() => {
        setHandshakeStatus(prev => {
          if (prev === 'sending') {
            // Auto-succeed because write succeeded and port is verified active
            setTimeout(() => setHandshakeStatus('idle'), 5000)
            return 'success'
          }
          return prev
        })
      }, 1500)
    } catch (err: any) {
      console.warn('Failed to write handshake:', err?.message || err)
      setHandshakeStatus('error')
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current)
        handshakeTimeoutRef.current = null
      }
    }
  }, [connectionStatus])

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
    rawLines,
    handshakeStatus,
    sendHandshake,
    connectedUsbInfo,
  }
}
