'use client'

import { useState, useEffect, useRef } from 'react'
import { useBench } from '../BenchContext'
import { CodeEditor } from '../programming/CodeEditor'
import { AIAssistant } from '../programming/AIAssistant'
import { CompilerTerminal } from '../programming/CompilerTerminal'
import { CpuIcon, CodeIcon, PlayIcon, UploadIcon, RefreshCwIcon, SaveIcon, CheckIcon } from 'lucide-react'
import { BOARD_FQBNS, resolveBoardProfile } from '@/lib/types'
import { useLanguage } from '../LanguageContext'

const MIN_AI_WIDTH = 280
const MIN_EDITOR_WIDTH = 400
const MIN_OUTPUT_HEIGHT = 100
const MIN_EDITOR_HEIGHT = 180

const DEFAULT_SKETCH = `// AI-Powered Test Bench Telemetry Sketch
// Compatible with Arduino Uno & Arduino Mega 2560

const int BUTTON_PIN = 2;    // Optional physical button on pin 2

// Define which pins are occupied by sensors/actuators in your circuit
const int OCCUPIED_PINS[] = {BUTTON_PIN}; 
const int NUM_OCCUPIED_PINS = 1;

// Potential LED pins to use for connection test (blinking)
const int LED_TEST_PINS[] = {13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3};
const int NUM_LED_TEST_PINS = 11;

unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 1000; // Send telemetry every 1 second

// Mock telemetry variables
float tempCarburant = 24.5;
float tempEchap = 110.0;
float tempAdmission = 30.2;
int rpm = 1200;
float vitesse = 35.0;
float vibration = 0.05;

// Helper function to check if a pin is occupied by your circuit
bool isPinOccupied(int pin) {
  for (int i = 0; i < NUM_OCCUPIED_PINS; i++) {
    if (OCCUPIED_PINS[i] == pin) return true;
  }
  return false;
}

void setup() {
  Serial.begin(9600);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Flash default LED (pin 13) on startup if it's not occupied to show it's active
  if (!isPinOccupied(13)) {
    pinMode(13, OUTPUT);
    digitalWrite(13, HIGH);
    delay(100);
    digitalWrite(13, LOW);
  }
}

void loop() {
  // 1. Check for physical button press to trigger LED and send ready signal
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (!isPinOccupied(13)) {
      pinMode(13, OUTPUT);
      digitalWrite(13, HIGH);
    }
    Serial.println("ARDUINO,READY");
    delay(200); // Debounce / active state indicator
    if (!isPinOccupied(13)) {
      digitalWrite(13, LOW);
    }
  }

  // 2. Check for incoming Serial commands (like HANDSHAKE)
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\\n');
    command.trim();
    
    if (command.equalsIgnoreCase("HANDSHAKE")) {
      // Find the first unoccupied LED pin to test/flash
      int blinkPin = -1;
      for (int i = 0; i < NUM_LED_TEST_PINS; i++) {
        if (!isPinOccupied(LED_TEST_PINS[i])) {
          blinkPin = LED_TEST_PINS[i];
          break;
        }
      }
      
      // Flash the LED if we found a free pin
      if (blinkPin != -1) {
        pinMode(blinkPin, OUTPUT);
        for (int i = 0; i < 2; i++) {
          digitalWrite(blinkPin, HIGH);
          delay(150);
          digitalWrite(blinkPin, LOW);
          delay(150);
        }
      }
      
      // Always send handshake acknowledgment back to the web dashboard
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

export function Programmation({ initialConversationId }: { initialConversationId?: string } = {}) {
  const { t } = useLanguage()
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
  const [isDirty, setIsDirty] = useState(false)
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

  const handleCodeChange = (newCode: string, instant = false) => {
    setCode(newCode)
    setIsDirty(true)
    
    if (blinkTimerRef.current) {
      clearTimeout(blinkTimerRef.current)
    }
    
    setShouldBlink(false)
    
    if (instant) {
      setShouldBlink(true)
    } else {
      blinkTimerRef.current = setTimeout(() => {
        setShouldBlink(true)
      }, 1000)
    }
  }

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bench_arduino_code', code)
      setIsSavedVisual(true)
      setShouldBlink(false)
      setIsDirty(false)
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
        const newWidth = dragVStartRef.current.width + deltaX
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
    <div className="absolute inset-0 flex flex-col bg-bench-bg text-bench-text select-none overflow-hidden font-sans">
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
          animation: save-btn-blink 0.6s ease-in-out 1;
        }
      `}</style>
      {(isDraggingV || isDraggingH) && (
        <div className="fixed inset-0 z-50 select-none" style={{ cursor: isDraggingV ? 'col-resize' : 'row-resize' }} />
      )}



      <div ref={containerRef} className="flex flex-1 min-h-0 relative select-text font-sans">
        <div className="flex-shrink-0 bg-bench-bg flex flex-col overflow-hidden" style={{ width: `${aiWidth}px` }}>
          <AIAssistant code={code} onCodeUpdate={handleCodeChange} initialConversationId={initialConversationId} />
        </div>
        <div onMouseDown={handleVMouseDown} className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors ${isDraggingV ? 'bg-blue-500' : 'bg-bench-border hover:bg-blue-500/50'}`} title="Resize AI Chatbot panel" />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 relative group/editor overflow-hidden">
            <CodeEditor code={code} onChange={handleCodeChange} />
            
            {/* Sliding Vertical Configuration Toolbar */}
            <div 
              className="absolute right-0 top-6 bottom-6 z-20 flex transition-transform duration-300 ease-in-out translate-x-[216px] hover:translate-x-0 group/bar"
              style={{ width: '240px' }}
              onMouseEnter={() => {
                if (isDirty && !isSavedVisual) {
                  setShouldBlink(true)
                }
              }}
            >
              {/* Peek Handle (visible on the left edge of toolbar wrapper when hidden) */}
              <div className={`w-[24px] h-full flex flex-col items-center justify-center bg-bench-header-bg/95 backdrop-blur border border-r-0 border-bench-border rounded-l-lg shadow-md group-hover/bar:opacity-0 transition-all duration-300 select-none cursor-pointer ${
                shouldBlink ? 'animate-save-blink border-blue-400 bg-blue-500/15' : ''
              }`}>
                {/* Grabber triple dot handle */}
                <div className="flex flex-col gap-1 items-center">
                  <span className="w-1 h-1 rounded-full bg-bench-muted/70" />
                  <span className="w-1 h-1 rounded-full bg-bench-muted/70" />
                  <span className="w-1 h-1 rounded-full bg-bench-muted/70" />
                </div>
              </div>
              
              {/* Toolbar Content Panel */}
              <div className="flex-1 bg-bench-header-bg/95 backdrop-blur border border-bench-border border-l-0 rounded-l-lg p-3 flex flex-col gap-3.5 shadow-2xl justify-center">
                {/* Target Board Select */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-bench-muted font-mono uppercase tracking-wider">{t('code.board')}</span>
                  <select
                    value={effectiveBoard}
                    onChange={e => setSelectedBoard(e.target.value)}
                    className="w-full rounded border border-bench-border bg-bench-surface px-2 py-1 text-[10px] text-bench-text outline-none focus:border-blue-500 font-mono cursor-pointer"
                  >
                    {Object.keys(BOARD_FQBNS).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* COM Port Selector */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-bench-muted font-mono uppercase tracking-wider">{t('code.port')}</span>
                  <div className="flex items-center gap-1">
                    <select
                      value={selectedPort}
                      onChange={e => setSelectedPort(e.target.value)}
                      className="flex-1 rounded border border-bench-border bg-bench-surface px-1.5 py-1 text-[10px] text-bench-text outline-none focus:border-blue-500 min-w-0 font-mono cursor-pointer"
                    >
                      {ports.length > 0 ? (
                        ports.map(p => (
                          <option key={p.address} value={p.address}>
                            {p.address}
                          </option>
                        ))
                      ) : (
                        <option value="">{t('code.noPort')}</option>
                      )}
                    </select>
                    <button
                      onClick={fetchPorts}
                      disabled={isLoadingPorts}
                      className="p-1 rounded border border-bench-border hover:bg-bench-subtle text-bench-muted hover:text-bench-text transition-colors cursor-pointer shrink-0"
                      title="Rescan target ports"
                    >
                      <RefreshCwIcon size={11} className={isLoadingPorts ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-bench-border w-full my-0.5" />

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSave}
                    onAnimationEnd={() => setShouldBlink(false)}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border transition-colors font-mono text-[10px] font-medium disabled:opacity-50 shadow-[0_0_10px_rgba(59,130,246,0.05)] cursor-pointer ${
                      isSavedVisual
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-600/20 dark:text-emerald-400 dark:border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)] font-semibold'
                        : shouldBlink
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-600/15 dark:text-blue-400 dark:hover:bg-blue-600/25 dark:border-blue-500/35 animate-save-blink'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-600/15 dark:text-blue-400 dark:hover:bg-blue-600/25 dark:border-blue-500/35'
                    }`}
                    title="Save sketch to local storage"
                  >
                    {isSavedVisual ? <CheckIcon size={12} /> : <SaveIcon size={12} />}
                    <span>{isSavedVisual ? t('action.saved') : t('code.save')}</span>
                  </button>
                  <button
                    onClick={handleCompile}
                    disabled={isCompiling || isUploading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-bench-surface text-bench-text hover:bg-bench-subtle transition-colors border border-bench-border font-mono text-[10px] font-medium disabled:opacity-50 cursor-pointer"
                    title="Verify sketch syntax and compile binary"
                  >
                    <PlayIcon size={12} /> {t('code.verify')}
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isCompiling || isUploading}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] font-bold border transition-colors disabled:opacity-50 ${
                      isConnected
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-600/15 dark:text-amber-400 dark:hover:bg-amber-600/25 dark:border-amber-500/35 shadow-[0_0_10px_rgba(245,158,11,0.05)]'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-600/15 dark:text-emerald-400 dark:hover:bg-emerald-600/25 dark:border-emerald-500/35 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                    }`}
                    title={isConnected ? 'Closes active browser terminal session before uploading' : 'Compile and flash to microcontroller'}
                  >
                    <UploadIcon size={12} />
                    <span className="truncate">{isUploading ? t('action.uploading') : t('code.upload')}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
          <div onMouseDown={handleHMouseDown} className={`h-1.5 flex-shrink-0 cursor-row-resize transition-colors ${isDraggingH ? 'bg-blue-500' : 'bg-bench-border hover:bg-blue-500/50'}`} title="Resize terminal output panel" />
          <div className="flex-shrink-0 bg-bench-bg overflow-hidden" style={{ height: `${outputHeight}px` }}>
            <CompilerTerminal logs={terminalOutput} onClear={() => setTerminalOutput([])} />
          </div>
        </div>
      </div>

    </div>
  )
}
