'use client'

import { useState, useEffect, useRef } from 'react'
import { useBench } from '../BenchContext'
import { CodeEditor } from '../programming/CodeEditor'
import { AIAssistant } from '../programming/AIAssistant'
import { CompilerTerminal } from '../programming/CompilerTerminal'
import { CpuIcon, CodeIcon, PlayIcon, UploadIcon, RefreshCwIcon, SaveIcon, CheckIcon } from 'lucide-react'
import { BOARD_FQBNS, resolveBoardProfile } from '@/lib/types'

const MIN_AI_WIDTH = 280
const MIN_EDITOR_WIDTH = 400
const MIN_OUTPUT_HEIGHT = 100
const MIN_EDITOR_HEIGHT = 180

const DEFAULT_SKETCH = `// AI-Powered Test Bench Telemetry Sketch
// Compatible with Arduino Uno & Arduino Mega 2560

const int LED_PIN = 13;      // Builtin LED (usually red/amber on Arduino Uno/Mega)
const int BUTTON_PIN = 2;    // Optional physical button on pin 2

unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 1000; // Send telemetry every 1 second

// Mock telemetry variables
float tempCarburant = 24.5;
float tempEchap = 110.0;
float tempAdmission = 30.2;
int rpm = 1200;
float vitesse = 35.0;
float vibration = 0.05;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Flash LED on startup to show it's active
  digitalWrite(LED_PIN, HIGH);
  delay(100);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  // 1. Check for physical button press to trigger LED and send ready signal
  if (digitalRead(BUTTON_PIN) == LOW) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("ARDUINO,READY");
    delay(200); // Debounce / active state indicator
    digitalWrite(LED_PIN, LOW);
  }

  // 2. Check for incoming Serial commands (like HANDSHAKE)
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\\n');
    command.trim();
    
    if (command.equalsIgnoreCase("HANDSHAKE")) {
      // Flash LED twice to verify visual communication
      for (int i = 0; i < 2; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(150);
        digitalWrite(LED_PIN, LOW);
        delay(150);
      }
      // Send handshake acknowledgment back to the web dashboard
      Serial.println("ARDUINO,READY");
    }
  }

  // 3. Periodically send telemetry data in CSV format to update gauges in real-time
  // Expected order: temp_carburant, temp_echap, temp_admission, rpm, vitesse, vibration
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= telemetryInterval) {
    lastTelemetryTime = currentMillis;
    
    // Simulate some dynamic changes in telemetry values
    tempCarburant += random(-5, 6) * 0.1;
    tempEchap += random(-10, 11) * 0.5;
    tempAdmission += random(-3, 4) * 0.1;
    rpm += random(-100, 101);
    vitesse += random(-5, 6) * 0.2;
    vibration = (random(5, 25) / 100.0);
    
    // Constrain simulation to realistic values
    if (rpm < 800) rpm = 800;
    if (rpm > 6000) rpm = 6000;
    if (vitesse < 0) vitesse = 0;
    
    // Print CSV string to Serial port
    Serial.print(tempCarburant, 1);
    Serial.print(",");
    Serial.print(tempEchap, 1);
    Serial.print(",");
    Serial.print(tempAdmission, 1);
    Serial.print(",");
    Serial.print(rpm);
    Serial.print(",");
    Serial.print(vitesse, 1);
    Serial.print(",");
    Serial.println(vibration, 2);
  }
}`

export function Programmation() {
  const { connectionStatus, boardName, disconnect, connect, selectedBoard, setSelectedBoard, connectedUsbInfo } = useBench()
  const effectiveBoard = resolveBoardProfile(boardName)
  
  const isConnected = connectionStatus === 'connected'
  const protocolVersion = '1.0'
  
  const [code, setCode] = useState<string>(DEFAULT_SKETCH)

  // Load code from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCode = localStorage.getItem('bench_arduino_code')
      if (savedCode) {
        setCode(savedCode)
      }
    }
  }, [])

  const [isSavedVisual, setIsSavedVisual] = useState(false)
  const [shouldBlink, setShouldBlink] = useState(false)
  const blinkTimerRef = useRef<any>(null)

  useEffect(() => {
    if (isSavedVisual) {
      const timer = setTimeout(() => {
        setIsSavedVisual(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSavedVisual])

  useEffect(() => {
    return () => {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current)
      }
    }
  }, [])

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    
    if (blinkTimerRef.current) {
      clearTimeout(blinkTimerRef.current)
    }
    
    setShouldBlink(false)
    
    blinkTimerRef.current = setTimeout(() => {
      setShouldBlink(true)
    }, 1000)
  }

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bench_arduino_code', code)
      setIsSavedVisual(true)
      setShouldBlink(false)
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current)
        blinkTimerRef.current = null
      }
    }
  }

  const [isCompiling, setIsCompiling] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])

  const [ports, setPorts] = useState<{ address: string; label: string; protocol: string }[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [isLoadingPorts, setIsLoadingPorts] = useState(false)

  const [aiWidth, setAiWidth] = useState(384)
  const [outputHeight, setOutputHeight] = useState(220)
  
  const [isDraggingV, setIsDraggingV] = useState(false)
  const [isDraggingH, setIsDraggingH] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragVStartRef = useRef<{ clientX: number; width: number } | null>(null)
  const dragHStartRef = useRef<{ clientY: number; height: number } | null>(null)

  // Fetch host ports
  const fetchPorts = async () => {
    setIsLoadingPorts(true)
    try {
      const res = await fetch('/api/arduino/ports')
      const data = await res.json()
      if (data.ports && data.ports.length > 0) {
        setPorts(data.ports)
        
        let matchedAddress = ''
        if (connectedUsbInfo) {
          const matched = data.ports.find((p: any) => {
            const cliVid = String(p.vid || '').toLowerCase()
            const cliPid = String(p.pid || '').toLowerCase()
            
            const targetVidHex = `0x${connectedUsbInfo.usbVendorId?.toString(16).toLowerCase()}`
            const targetPidHex = `0x${connectedUsbInfo.usbProductId?.toString(16).toLowerCase()}`
            const targetVidDec = String(connectedUsbInfo.usbVendorId)
            const targetPidDec = String(connectedUsbInfo.usbProductId)
            
            const isVidMatch = cliVid.includes(targetVidHex) || cliVid.includes(targetVidDec)
            const isPidMatch = cliPid.includes(targetPidHex) || cliPid.includes(targetPidDec)
            
            return isVidMatch && isPidMatch
          })
          if (matched) {
            matchedAddress = matched.address
          }
        }

        if (matchedAddress) {
          setSelectedPort(matchedAddress)
        } else if (!selectedPort || !data.ports.some((p: any) => p.address === selectedPort)) {
          setSelectedPort(data.ports[0].address)
        }
      } else {
        setPorts([])
        setSelectedPort('')
      }
    } catch (err) {
      appendLog('[System Error] Failed to scan host ports.')
    } finally {
      setIsLoadingPorts(false)
    }
  }

  useEffect(() => {
    fetchPorts()
  }, [connectedUsbInfo])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('bench_code_ai_width')
      const savedHeight = localStorage.getItem('bench_code_output_height')
      if (savedWidth) setAiWidth(parseInt(savedWidth, 10))
      if (savedHeight) setOutputHeight(parseInt(savedHeight, 10))
    }
  }, [])

  const appendLog = (line: string) => setTerminalOutput(prev => [...prev, line])

  const handleCompile = async () => {
    setIsCompiling(true)
    appendLog(`[Compiler] Verifying sketch structure for ${effectiveBoard}...`)
    try {
      const res = await fetch('/api/arduino/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, board: effectiveBoard })
      })
      const data = await res.json()
      if (data.logs) setTerminalOutput(prev => [...prev, ...data.logs])
      if (!res.ok) appendLog(`[Compiler Error] ${data.error || 'Compilation failed.'}`)
      else appendLog('[Compiler] Verification complete. 0 errors.')
    } catch (err) {
      appendLog('[Compiler Error] Service unreachable.')
    } finally {
      setIsCompiling(false)
    }
  }

  const handleUpload = async () => {
    setIsUploading(true)
    
    // Automatically disconnect browser Web Serial first to prevent locks on standard COM ports
    let autoReconnect = false
    if (isConnected) {
      appendLog('[Uploader] Browser connection is active. Closing Web Serial to release port lock...')
      await disconnect()
      autoReconnect = true
      // Short delay for OS to process resource release
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    appendLog(`[Uploader] Compiling and flashing sketch to ${effectiveBoard} on port ${selectedPort || 'Auto'}...`)
    try {
      const res = await fetch('/api/arduino/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, board: effectiveBoard, port: selectedPort })
      })
      const data = await res.json()
      if (data.logs) setTerminalOutput(prev => [...prev, ...data.logs])
      
      if (!res.ok) {
        appendLog(`[Upload Error] ${data.error || 'Upload failed.'}`)
      } else {
        appendLog('[Uploader] Flash sequence complete!')
      }
    } catch (err) {
      appendLog('[Upload Error] Service unreachable.')
    } finally {
      setIsUploading(false)
      if (autoReconnect) {
        appendLog('[Uploader] Delaying 2.0s for device reboot...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        appendLog('[Uploader] Attempting to reconnect browser serial telemetry...')
        try {
          await connect()
          appendLog('[Uploader] Browser telemetry reestablished!')
        } catch (e) {
          appendLog('[Uploader] Reconnection failed. Please manually pair in dashboard.')
        }
      }
    }
  }

  const handleVMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingV(true)
    dragVStartRef.current = { clientX: e.clientX, width: aiWidth }
  }

  const handleHMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingH(true)
    dragHStartRef.current = { clientY: e.clientY, height: outputHeight }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingV && dragVStartRef.current && containerRef.current) {
        const deltaX = e.clientX - dragVStartRef.current.clientX
        const newWidth = dragVStartRef.current.width - deltaX
        const containerWidth = containerRef.current.clientWidth
        const clampedWidth = Math.max(MIN_AI_WIDTH, Math.min(containerWidth - MIN_EDITOR_WIDTH, newWidth))
        setAiWidth(clampedWidth)
        window.dispatchEvent(new Event('resize'))
      }

      if (isDraggingH && dragHStartRef.current && containerRef.current) {
        const deltaY = e.clientY - dragHStartRef.current.clientY
        const newHeight = dragHStartRef.current.height - deltaY
        const editorAreaHeight = containerRef.current.clientHeight
        const clampedHeight = Math.max(MIN_OUTPUT_HEIGHT, Math.min(editorAreaHeight - MIN_EDITOR_HEIGHT, newHeight))
        setOutputHeight(clampedHeight)
        window.dispatchEvent(new Event('resize'))
      }
    };

    const handleMouseUp = () => {
      if (isDraggingV) {
        setIsDraggingV(false)
        localStorage.setItem('bench_code_ai_width', aiWidth.toString())
        dragVStartRef.current = null
      }
      if (isDraggingH) {
        setIsDraggingH(false)
        localStorage.setItem('bench_code_output_height', outputHeight.toString())
        dragHStartRef.current = null
      }
    };

    if (isDraggingV || isDraggingH) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingV, isDraggingH, aiWidth, outputHeight])

  return (
    <div className="absolute inset-0 flex flex-col bg-[#0b0f19] text-slate-300 select-none overflow-hidden font-sans">
      <style>{`
        @keyframes save-btn-blink {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          25%, 75% {
            opacity: 0.5;
            background-color: rgba(16, 185, 129, 0.25);
            border-color: rgba(16, 185, 129, 0.6);
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
            transform: scale(1.05);
            color: rgb(16, 185, 129);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-save-blink {
          animation: save-btn-blink 0.6s ease-in-out 2;
        }
      `}</style>
      {(isDraggingV || isDraggingH) && (
        <div className="fixed inset-0 z-50 select-none" style={{ cursor: isDraggingV ? 'col-resize' : 'row-resize' }} />
      )}

      <header className="flex flex-shrink-0 flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-[#0d1220] select-none gap-3 font-sans">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isConnected ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
            <CpuIcon size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <CodeIcon size={18} className="text-blue-400" /> Programming Workspace
            </h1>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                {isConnected ? 'Serial Connected' : 'Serial Standby'}
              </span>
              <span>•</span>
              <span>Detected: {boardName || 'None'}</span>
              <span>•</span>
              <span>Protocol v{protocolVersion}</span>
            </div>
          </div>
        </div>

        {/* Compiler Configuration Toolbar */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Target Board Select */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 font-mono">Board Profile</span>
            <select
              value={effectiveBoard}
              onChange={e => setSelectedBoard(e.target.value)}
              className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300 outline-none focus:border-blue-500 font-mono"
            >
              {Object.keys(BOARD_FQBNS).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* COM Port Selector */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 font-mono">Upload COM Port</span>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedPort}
                onChange={e => setSelectedPort(e.target.value)}
                className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-slate-300 outline-none focus:border-blue-500 min-w-[100px] font-mono"
              >
                {ports.length > 0 ? (
                  ports.map(p => (
                    <option key={p.address} value={p.address}>
                      {p.address} {p.label ? `(${p.label})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="">Auto-Detect</option>
                )}
              </select>
              <button
                onClick={fetchPorts}
                disabled={isLoadingPorts}
                className="p-1.5 rounded border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Rescan target serial ports"
              >
                <RefreshCwIcon size={12} className={isLoadingPorts ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2 mt-3.5">
            <button
              onClick={handleSave}
              onAnimationEnd={() => setShouldBlink(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors font-mono font-medium disabled:opacity-50 shadow-[0_0_10px_rgba(59,130,246,0.05)] cursor-pointer ${
                isSavedVisual
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)] font-semibold'
                  : shouldBlink
                  ? 'bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 border-blue-500/35 animate-save-blink'
                  : 'bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 border-blue-500/35'
              }`}
              title="Save sketch to local storage"
            >
              {isSavedVisual ? <CheckIcon size={14} /> : <SaveIcon size={14} />}
              {isSavedVisual ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={handleCompile}
              disabled={isCompiling || isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700 font-mono font-medium disabled:opacity-50"
              title="Verify sketch syntax and compile binary"
            >
              <PlayIcon size={14} /> Verify
            </button>
            <button
              onClick={handleUpload}
              disabled={isCompiling || isUploading}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded font-mono font-bold border transition-colors disabled:opacity-50 ${
                isConnected
                  ? 'bg-amber-600/15 text-amber-400 hover:bg-amber-600/25 border-amber-500/35 shadow-[0_0_10px_rgba(245,158,11,0.05)]'
                  : 'bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border-emerald-500/35 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
              }`}
              title={isConnected ? 'Closes active browser terminal session before uploading' : 'Compile and flash to microcontroller'}
            >
              <UploadIcon size={14} />
              {isUploading ? 'Uploading...' : isConnected ? 'Disconnect & Upload' : 'Upload'}
            </button>
          </div>
        </div>
      </header>

      <div ref={containerRef} className="flex flex-1 min-h-0 relative select-text font-sans">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 relative">
            <CodeEditor code={code} onChange={handleCodeChange} />
          </div>
          <div onMouseDown={handleHMouseDown} className={`h-1.5 flex-shrink-0 cursor-row-resize transition-colors ${isDraggingH ? 'bg-blue-500' : 'bg-slate-800/80 hover:bg-blue-500/50'}`} title="Resize terminal output panel" />
          <div className="flex-shrink-0 bg-[#0a0e17] overflow-hidden" style={{ height: `${outputHeight}px` }}>
            <CompilerTerminal logs={terminalOutput} onClear={() => setTerminalOutput([])} />
          </div>
        </div>
        <div onMouseDown={handleVMouseDown} className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors ${isDraggingV ? 'bg-blue-500' : 'bg-slate-800/80 hover:bg-blue-500/50'}`} title="Resize AI Chatbot panel" />
        <div className="flex-shrink-0 bg-[#0d1220] flex flex-col overflow-hidden" style={{ width: `${aiWidth}px` }}>
          <AIAssistant code={code} onCodeUpdate={handleCodeChange} />
        </div>
      </div>

    </div>
  )
}
