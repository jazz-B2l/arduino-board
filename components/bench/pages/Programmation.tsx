'use client'

import { useState, useEffect, useRef } from 'react'
import { useBench } from '../BenchContext'
import { CodeEditor } from '../programming/CodeEditor'
import { AIAssistant } from '../programming/AIAssistant'
import { CompilerTerminal } from '../programming/CompilerTerminal'
import { CpuIcon, CodeIcon, PlayIcon, UploadIcon } from 'lucide-react'

const MIN_AI_WIDTH = 280
const MIN_EDITOR_WIDTH = 400
const MIN_OUTPUT_HEIGHT = 100
const MIN_EDITOR_HEIGHT = 180

export function Programmation() {
  const { connectionStatus, boardName } = useBench()
  
  const isConnected = connectionStatus === 'connected'
  const protocolVersion = '1.0'
  
  const [code, setCode] = useState<string>(`// AI-Powered Test Bench Telemetry Sketch
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
}`)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])

  const [aiWidth, setAiWidth] = useState(384)
  const [outputHeight, setOutputHeight] = useState(220)
  
  const [isDraggingV, setIsDraggingV] = useState(false)
  const [isDraggingH, setIsDraggingH] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragVStartRef = useRef<{ clientX: number; width: number } | null>(null)
  const dragHStartRef = useRef<{ clientY: number; height: number } | null>(null)

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
    appendLog('[Compiler] Verifying code...')
    try {
      const res = await fetch('/api/arduino/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
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
    appendLog('[Uploader] Initiating upload sequence...')
    try {
      const res = await fetch('/api/arduino/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      if (data.logs) setTerminalOutput(prev => [...prev, ...data.logs])
      if (!res.ok) appendLog(`[Upload Error] ${data.error || 'Upload failed.'}`)
      else appendLog('[Uploader] Upload successful.')
    } catch (err) {
      appendLog('[Upload Error] Service unreachable.')
    } finally {
      setIsUploading(false)
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
    <div className="absolute inset-0 flex flex-col bg-[#0b0f19] text-slate-300 select-none overflow-hidden">
      {(isDraggingV || isDraggingH) && (
        <div className="fixed inset-0 z-50 select-none" style={{ cursor: isDraggingV ? 'col-resize' : 'row-resize' }} />
      )}

      <header className="flex flex-shrink-0 items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-[#0d1220] select-none">
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
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span>•</span>
              <span>{boardName || 'Unknown Board'}</span>
              <span>•</span>
              <span>Protocol v{protocolVersion}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCompile} disabled={isCompiling} className="flex items-center gap-2 px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700 text-sm font-medium disabled:opacity-50">
            <PlayIcon size={16} /> Verify
          </button>
          <button onClick={handleUpload} disabled={!isConnected || isCompiling || isUploading} className="flex items-center gap-2 px-4 py-2 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors border border-emerald-500/30 text-sm font-medium disabled:opacity-50">
            <UploadIcon size={16} /> {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </header>

      <div ref={containerRef} className="flex flex-1 min-h-0 relative select-text">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 relative">
            <CodeEditor code={code} onChange={setCode} />
          </div>
          <div onMouseDown={handleHMouseDown} className={`h-1.5 flex-shrink-0 cursor-row-resize transition-colors ${isDraggingH ? 'bg-blue-500' : 'bg-slate-800/80 hover:bg-blue-500/50'}`} title="Resize terminal output panel" />
          <div className="flex-shrink-0 bg-[#0a0e17] overflow-hidden" style={{ height: `${outputHeight}px` }}>
            <CompilerTerminal logs={terminalOutput} onClear={() => setTerminalOutput([])} />
          </div>
        </div>
        <div onMouseDown={handleVMouseDown} className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors ${isDraggingV ? 'bg-blue-500' : 'bg-slate-800/80 hover:bg-blue-500/50'}`} title="Resize AI Chatbot panel" />
        <div className="flex-shrink-0 bg-[#0d1220] flex flex-col overflow-hidden" style={{ width: `${aiWidth}px` }}>
          <AIAssistant code={code} onCodeUpdate={setCode} />
        </div>
      </div>
    </div>
  )
}
