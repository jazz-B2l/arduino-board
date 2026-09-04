export interface SensorReading {
  timestamp: number       // epoch ms
  temp_carburant?: number  // °C
  temp_echap?: number      // °C
  temp_admission?: number  // °C
  rpm?: number             // tr/min
  vitesse?: number         // m/s
  vibration?: number       // m/s²
}

export interface Thresholds {
  temp_echap:     { warning: number; danger: number }
  temp_carburant: { warning: number; danger: number }
  rpm:            { warning: number; danger: number }
  vibration:      { warning: number; danger: number }
  temp_admission: { warning: number; danger: number }
}

export type MetricState = 'OK' | 'WARNING' | 'DANGER'
export type MetricKey = keyof Thresholds

export interface AlarmEvent {
  id: string
  metric: MetricKey
  level: 'WARNING' | 'DANGER'
  value: number
  timestamp: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  temp_echap:     { warning: 700,  danger: 900  },
  temp_carburant: { warning: 60,   danger: 80   },
  rpm:            { warning: 6000, danger: 7500 },
  vibration:      { warning: 1.50, danger: 2.80 },
  temp_admission: { warning: 50,   danger: 9999 },
}

export const METRIC_LABELS: Record<string, string> = {
  temp_carburant: 'Fuel Temp',
  temp_echap:     'Exhaust Temp',
  temp_admission: 'Intake Temp',
  rpm:            'Engine Speed (RPM)',
  vitesse:        'Speed',
  vibration:      'Vibration',
}

export const METRIC_UNITS: Record<string, string> = {
  temp_carburant: '°C',
  temp_echap:     '°C',
  temp_admission: '°C',
  rpm:            'rpm',
  vitesse:        'm/s',
  vibration:      'm/s²',
}

export function getMetricState(
  key: string,
  value: number,
  thresholds: Thresholds
): MetricState {
  const t = thresholds[key as MetricKey]
  if (!t) return 'OK'
  if (value >= t.danger) return 'DANGER'
  if (value >= t.warning) return 'WARNING'
  return 'OK'
}

export interface Project {
  id: string
  user_id?: string | null
  name: string
  description?: string
  board_type: string
  sketch_code?: string
  thresholds?: Thresholds
  created_at: string
  updated_at: string
}

export interface BoardDetails {
  id: string
  name: string
  fqbn: string
  mcu: string
  clock: string
  flash: string
  voltage: string
  digitalPins: number
  analogPins: number
  category: 'avr' | 'samd' | 'esp32' | 'generic'
  badgeColor: string
  description: string
  defaultSketch?: string
}

export const BOARD_DETAILS: Record<string, BoardDetails> = {
  'Arduino Uno': {
    id: 'arduino-uno',
    name: 'Arduino Uno R3',
    fqbn: 'arduino:avr:uno',
    mcu: 'ATmega328P',
    clock: '16 MHz',
    flash: '32 KB',
    voltage: '5V',
    digitalPins: 14,
    analogPins: 6,
    category: 'avr',
    badgeColor: '#00979D',
    description: 'Standard industry workhorse with 14 digital I/O pins and 6 analog inputs.',
  },
  'Arduino Mega 2560': {
    id: 'arduino-mega',
    name: 'Arduino Mega 2560',
    fqbn: 'arduino:avr:mega',
    mcu: 'ATmega2560',
    clock: '16 MHz',
    flash: '256 KB',
    voltage: '5V',
    digitalPins: 54,
    analogPins: 16,
    category: 'avr',
    badgeColor: '#008184',
    description: 'High pin-count board with 54 digital I/O and 16 analog inputs for complex test benches.',
  },
  'Arduino Nano': {
    id: 'arduino-nano',
    name: 'Arduino Nano',
    fqbn: 'arduino:avr:nano',
    mcu: 'ATmega328P',
    clock: '16 MHz',
    flash: '32 KB',
    voltage: '5V',
    digitalPins: 14,
    analogPins: 8,
    category: 'avr',
    badgeColor: '#00979D',
    description: 'Compact breadboard-friendly microcontroller with 8 analog inputs.',
  },
  'Arduino Leonardo': {
    id: 'arduino-leonardo',
    name: 'Arduino Leonardo',
    fqbn: 'arduino:avr:leonardo',
    mcu: 'ATmega32u4',
    clock: '16 MHz',
    flash: '32 KB',
    voltage: '5V',
    digitalPins: 20,
    analogPins: 12,
    category: 'avr',
    badgeColor: '#006468',
    description: 'Built-in USB communication capable of behaving as a native HID device.',
  },
  'ESP32 DevKit': {
    id: 'esp32-devkit',
    name: 'ESP32 DevKit V1',
    fqbn: 'esp32:esp32:esp32',
    mcu: 'Xtensa Dual-Core 32-bit',
    clock: '240 MHz',
    flash: '4 MB',
    voltage: '3.3V',
    digitalPins: 36,
    analogPins: 18,
    category: 'esp32',
    badgeColor: '#E7352C',
    description: 'High performance dual-core MCU with built-in Wi-Fi and Bluetooth connectivity.',
  },
  'Arduino Due': {
    id: 'arduino-due',
    name: 'Arduino Due',
    fqbn: 'arduino:sam:arduino_due_x_dbg',
    mcu: 'Atmel SAM3X8E ARM Cortex-M3',
    clock: '84 MHz',
    flash: '512 KB',
    voltage: '3.3V',
    digitalPins: 54,
    analogPins: 12,
    category: 'samd',
    badgeColor: '#005358',
    description: '32-bit ARM core board for high-precision real-time telemetry sampling.',
  },
  'Generic Serial Device': {
    id: 'generic-serial',
    name: 'Generic Serial Board',
    fqbn: 'arduino:avr:uno',
    mcu: 'Universal UART',
    clock: 'Variable',
    flash: 'Generic',
    voltage: '3.3V - 5V',
    digitalPins: 0,
    analogPins: 0,
    category: 'generic',
    badgeColor: '#3b82f6',
    description: 'Universal microcontroller or sensor interface over standard COM/Serial baud streaming.',
  }
}

export const BOARD_FQBNS: Record<string, string> = {
  'Arduino Uno': 'arduino:avr:uno',
  'Arduino Mega 2560': 'arduino:avr:mega',
  'Arduino Nano': 'arduino:avr:nano',
  'Arduino Leonardo': 'arduino:avr:leonardo',
  'Arduino Micro': 'arduino:avr:micro',
  'Arduino Due': 'arduino:sam:arduino_due_x_dbg',
  'Arduino Zero': 'arduino:samd:arduino_zero_native',
  'ESP32 DevKit': 'esp32:esp32:esp32',
  'Generic Serial Device': 'arduino:avr:uno'
}

export function resolveBoardProfile(name: string | null): string {
  if (!name) return 'Generic Serial Device'
  
  const keys = Object.keys(BOARD_FQBNS)
  if (keys.includes(name)) return name
  
  const lower = name.toLowerCase()
  if (lower.includes('uno')) return 'Arduino Uno'
  if (lower.includes('mega') || lower.includes('2560')) return 'Arduino Mega 2560'
  if (lower.includes('nano')) return 'Arduino Nano'
  if (lower.includes('leonardo')) return 'Arduino Leonardo'
  if (lower.includes('micro')) return 'Arduino Micro'
  if (lower.includes('due')) return 'Arduino Due'
  if (lower.includes('zero')) return 'Arduino Zero'
  if (lower.includes('esp32')) return 'ESP32 DevKit'
  
  return 'Generic Serial Device'
}


