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
