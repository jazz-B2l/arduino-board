'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useAlarms } from '@/hooks/useAlarms'
import { useSensorFeed, type FeedStats, type SensorFeedResult } from '@/hooks/useSensorFeed'
import { useThresholds } from '@/hooks/useThresholds'
import { DEFAULT_THRESHOLDS, getMetricState, type AlarmEvent, type MetricState, type SensorReading, type Thresholds, type Project } from '@/lib/types'
import { useAuth } from '@/components/auth/AuthContext'
import { supabase } from '@/lib/supabase'

export interface ChatConversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  provider?: 'gemini' | 'groq'
}

export const DEFAULT_TELEMETRY_SKETCH = `// AI-Powered Test Bench Telemetry Sketch
// Compatible with Arduino Uno & Arduino Mega 2560

const int BUTTON_PIN = 2;    // Physical button on pin 2

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

bool isPinOccupied(int pin) {
  for (int i = 0; i < NUM_OCCUPIED_PINS; i++) {
    if (OCCUPIED_PINS[i] == pin) return true;
  }
  return false;
}

void setup() {
  Serial.begin(9600);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Flash default LED (pin 13) on startup
  if (!isPinOccupied(13)) {
    pinMode(13, OUTPUT);
    digitalWrite(13, HIGH);
    delay(100);
    digitalWrite(13, LOW);
  }
}

void loop() {
  // 1. Check for button press
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (!isPinOccupied(13)) {
      pinMode(13, OUTPUT);
      digitalWrite(13, HIGH);
    }
    Serial.println("ARDUINO,READY");
    delay(200);
    if (!isPinOccupied(13)) {
      digitalWrite(13, LOW);
    }
  }

  // 2. Check for incoming Serial commands (HANDSHAKE)
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\\n');
    command.trim();
    
    if (command.equalsIgnoreCase("HANDSHAKE")) {
      int blinkPin = -1;
      for (int i = 0; i < NUM_LED_TEST_PINS; i++) {
        if (!isPinOccupied(LED_TEST_PINS[i])) {
          blinkPin = LED_TEST_PINS[i];
          break;
        }
      }
      
      if (blinkPin != -1) {
        pinMode(blinkPin, OUTPUT);
        for (int i = 0; i < 2; i++) {
          digitalWrite(blinkPin, HIGH);
          delay(150);
          digitalWrite(blinkPin, LOW);
          delay(150);
        }
      }
      
      Serial.println("ARDUINO,READY");
    }
  }

  // 3. Periodically send telemetry data in CSV format
  // Format: temp_carburant, temp_echap, temp_admission, rpm, vitesse, vibration
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= telemetryInterval) {
    lastTelemetryTime = currentMillis;
    
    tempCarburant += random(-5, 6) * 0.1;
    tempEchap += random(-10, 11) * 0.5;
    tempAdmission += random(-3, 4) * 0.1;
    rpm += random(-100, 101);
    vitesse += random(-5, 6) * 0.2;
    vibration = (random(5, 25) / 100.0);
    
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
}
`

export const DEFAULT_BLINK_SKETCH = `// Microcontroller Blink & Serial Handshake
#include <Arduino.h>

const int LED_PIN = 13;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("SERIAL_READY");
}

void loop() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    if (cmd.equalsIgnoreCase("HANDSHAKE")) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      Serial.println("ARDUINO,READY");
    }
  }

  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}
`

export const DEFAULT_BLANK_SKETCH = `// Blank Microcontroller Sketch
#include <Arduino.h>

void setup() {
  Serial.begin(9600);
  // Put your setup code here, to run once:
}

void loop() {
  // Put your main code here, to run repeatedly:
}
`

const GUEST_DEFAULT_PROJECT: Project = {
  id: 'guest-project-demo',
  user_id: null,
  name: 'Guest Telemetry Project',
  description: 'Ephemeral test bench project for testing microcontrollers, code editor, and AI assistant.',
  board_type: 'Arduino Uno',
  sketch_code: DEFAULT_TELEMETRY_SKETCH,
  thresholds: DEFAULT_THRESHOLDS,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

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
  connect:          (options?: { forcePrompt?: boolean }) => Promise<void>
  disconnect:       () => Promise<void>
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  serialError:      string | null
  serialSupported:  boolean
  rawLines:         string[]
  handshakeStatus:  'idle' | 'sending' | 'success' | 'error'
  sendHandshake:    () => Promise<void>
  selectedBoard:    string | null
  setSelectedBoard: (board: string | null) => void
  boardName:        string
  connectedUsbInfo: { usbVendorId?: number; usbProductId?: number } | null
  navLayout: 'tabs' | 'sidebar' | 'right-sidebar' | 'bottom-tabs'
  setNavLayout: (layout: 'tabs' | 'sidebar' | 'right-sidebar' | 'bottom-tabs') => void
  cachedConversations: ChatConversation[]
  setCachedConversations: (convs: ChatConversation[]) => void
  cachedMessages: Record<string, ChatMessage[]>
  setCachedMessages: (convId: string, msgs: ChatMessage[]) => void
  
  // Project Management
  projects: Project[]
  activeProject: Project | null
  projectsLoading: boolean
  setActiveProject: (project: Project | null) => void
  createProject: (name: string, boardType: string, description?: string, templateType?: 'telemetry' | 'blink' | 'blank') => Promise<Project>
  updateProject: (updated: Partial<Project> & { id: string }) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  refreshProjects: () => Promise<void>
}

const BenchContext = createContext<BenchContextValue | null>(null)

export function BenchProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth()
  const feed       = useSensorFeed()
  const { thresholds, update: updateThresholds, reset: resetThresholds } = useThresholds()
  const alarms     = useAlarms(feed.latest, thresholds)

  const [selectedBoard, setSelectedBoardState] = useState<string | null>('Arduino Uno')
  const [navLayout, setNavLayoutState] = useState<'tabs' | 'sidebar' | 'right-sidebar' | 'bottom-tabs'>('tabs')

  const [cachedConversations, setCachedConversations] = useState<ChatConversation[]>([])
  const [cachedMessages, setCachedMessagesState] = useState<Record<string, ChatMessage[]>>({})

  // Projects state
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true)

  const setCachedMessages = useCallback((convId: string, msgs: ChatMessage[]) => {
    setCachedMessagesState(prev => ({
      ...prev,
      [convId]: msgs
    }))
  }, [])

  // Load Nav Layout preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bench_nav_layout') as any
      if (saved === 'sidebar' || saved === 'right-sidebar' || saved === 'bottom-tabs') {
        setNavLayoutState(saved)
      } else {
        setNavLayoutState('tabs')
      }
    }
  }, [])

  const setNavLayout = (layout: 'tabs' | 'sidebar' | 'right-sidebar' | 'bottom-tabs') => {
    setNavLayoutState(layout)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bench_nav_layout', layout)
    }
  }

  // Fetch or initialize projects
  const refreshProjects = async () => {
    if (isGuest) {
      setProjects([GUEST_DEFAULT_PROJECT])
      if (!activeProject) {
        setActiveProjectState(GUEST_DEFAULT_PROJECT)
        setSelectedBoardState(GUEST_DEFAULT_PROJECT.board_type)
      }
      setProjectsLoading(false)
      return
    }

    if (!user) {
      setProjects([])
      setActiveProjectState(null)
      setProjectsLoading(false)
      return
    }

    setProjectsLoading(true)
    try {
      // 1. Try Supabase
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setProjects(data as Project[])
        
        // Match active project or select most recent
        const savedId = typeof window !== 'undefined' ? localStorage.getItem(`bench_active_project_${user.id}`) : null
        const found = data.find((p: any) => p.id === savedId) || data[0] || null
        if (found) {
          setActiveProjectState(found as Project)
          setSelectedBoardState(found.board_type)
          if (found.thresholds) {
            updateThresholds(found.thresholds)
          }
        }
      } else {
        // Fallback to local storage if table doesn't exist yet
        const localKey = `bench_projects_${user.id}`
        const raw = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null
        if (raw) {
          const parsed = JSON.parse(raw) as Project[]
          setProjects(parsed)
          const savedId = localStorage.getItem(`bench_active_project_${user.id}`)
          const found = parsed.find(p => p.id === savedId) || parsed[0] || null
          if (found) {
            setActiveProjectState(found)
            setSelectedBoardState(found.board_type)
          }
        } else {
          setProjects([])
          setActiveProjectState(null)
        }
      }
    } catch (err) {
      console.warn('Projects fetch fallback:', err)
      const localKey = `bench_projects_${user.id}`
      const raw = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null
      if (raw) {
        const parsed = JSON.parse(raw) as Project[]
        setProjects(parsed)
        setActiveProjectState(parsed[0] || null)
      }
    } finally {
      setProjectsLoading(false)
    }
  }

  useEffect(() => {
    refreshProjects()
  }, [user?.id, isGuest])

  const setActiveProject = (proj: Project | null) => {
    setActiveProjectState(proj)
    if (proj) {
      setSelectedBoardState(proj.board_type)
      if (proj.thresholds) {
        updateThresholds(proj.thresholds)
      }
      if (typeof window !== 'undefined' && user) {
        localStorage.setItem(`bench_active_project_${user.id}`, proj.id)
      }
    }
  }

  const setSelectedBoard = (board: string | null) => {
    setSelectedBoardState(board)
    if (board && activeProject) {
      updateProject({ id: activeProject.id, board_type: board })
    }
  }

  const createProject = async (
    name: string,
    boardType: string,
    description: string = '',
    templateType: 'telemetry' | 'blink' | 'blank' = 'telemetry'
  ): Promise<Project> => {
    const sketch = templateType === 'blink' 
      ? DEFAULT_BLINK_SKETCH 
      : templateType === 'blank' 
      ? DEFAULT_BLANK_SKETCH 
      : DEFAULT_TELEMETRY_SKETCH

    const newProj: Project = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}`,
      user_id: user ? user.id : null,
      name: name.trim() || 'Untitled Project',
      description: description.trim(),
      board_type: boardType || 'Arduino Uno',
      sketch_code: sketch,
      thresholds: DEFAULT_THRESHOLDS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (isGuest || !user) {
      setProjects(prev => [newProj, ...prev])
      setActiveProject(newProj)
      return newProj
    }

    // Persist to Supabase if logged in
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          id: newProj.id,
          user_id: user.id,
          name: newProj.name,
          description: newProj.description,
          board_type: newProj.board_type,
          sketch_code: newProj.sketch_code,
          thresholds: newProj.thresholds,
        })
        .select()
        .single()

      if (!error && data) {
        const saved = data as Project
        setProjects(prev => [saved, ...prev.filter(p => p.id !== saved.id)])
        setActiveProject(saved)
        return saved
      }
    } catch (e) {
      console.warn('Error creating project in Supabase, using local fallback:', e)
    }

    // Fallback to local storage
    const updated = [newProj, ...projects]
    setProjects(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bench_projects_${user.id}`, JSON.stringify(updated))
    }
    setActiveProject(newProj)
    return newProj
  }

  const updateProject = async (updatedFields: Partial<Project> & { id: string }) => {
    const now = new Date().toISOString()
    const targetId = updatedFields.id

    setProjects(prev =>
      prev.map(p => {
        if (p.id === targetId) {
          const merged = { ...p, ...updatedFields, updated_at: now }
          if (activeProject?.id === targetId) {
            setActiveProjectState(merged)
          }
          return merged
        }
        return p
      })
    )

    if (isGuest || !user) return

    // Save to Supabase
    try {
      await supabase
        .from('projects')
        .update({
          ...updatedFields,
          updated_at: now
        })
        .eq('id', targetId)
        .eq('user_id', user.id)
    } catch (e) {
      console.warn('Failed to update project in Supabase:', e)
    }

    // Also update local storage cache
    if (typeof window !== 'undefined') {
      const current = projects.map(p => (p.id === targetId ? { ...p, ...updatedFields, updated_at: now } : p))
      localStorage.setItem(`bench_projects_${user.id}`, JSON.stringify(current))
    }
  }

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (activeProject?.id === id) {
      const remaining = projects.filter(p => p.id !== id)
      setActiveProject(remaining[0] || null)
    }

    if (isGuest || !user) return

    try {
      await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
    } catch (e) {
      console.warn('Failed to delete project in Supabase:', e)
    }

    if (typeof window !== 'undefined') {
      const remaining = projects.filter(p => p.id !== id)
      localStorage.setItem(`bench_projects_${user.id}`, JSON.stringify(remaining))
    }
  }

  const boardName = useMemo(() => {
    if (activeProject?.board_type) return activeProject.board_type
    if (selectedBoard) return selectedBoard
    if (feed.stats.port && feed.stats.port !== 'Aucun' && feed.stats.port !== 'None') {
      return feed.stats.port
    }
    return 'Arduino Uno'
  }, [activeProject?.board_type, selectedBoard, feed.stats.port])

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
    selectedBoard,
    setSelectedBoard,
    boardName,
    navLayout,
    setNavLayout,
    cachedConversations,
    setCachedConversations,
    cachedMessages,
    setCachedMessages,

    // Projects
    projects,
    activeProject,
    projectsLoading,
    setActiveProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  }

  return <BenchContext.Provider value={value}>{children}</BenchContext.Provider>
}

export function useBench(): BenchContextValue {
  const ctx = useContext(BenchContext)
  if (!ctx) throw new Error('useBench must be used within <BenchProvider>')
  return ctx
}
