'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useBench } from '../BenchContext'
import { useLanguage } from '../LanguageContext'
import { AnalogGauge } from '../AnalogGauge'
import { Sparkline } from '../Sparkline'
import { RecentAlarms } from '../RecentAlarms'
import {
  METRIC_LABELS,
  METRIC_UNITS,
  getMetricState,
  type Thresholds,
  type SensorReading,
  type MetricState,
  type MetricKey,
  BOARD_FQBNS,
  resolveBoardProfile
} from '@/lib/types'
import {
  CheckIcon,
  CpuIcon,
  RefreshCwIcon,
  UsbIcon,
  TerminalIcon,
  AlertTriangleIcon,
  InfoIcon,
  FileCode2Icon,
  HelpCircleIcon,
  Trash2Icon,
  PlusIcon,
  X,
  PlayIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  CheckCircle2Icon,
  ArrowRightIcon
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

// List of available chart types for Step 2
const AVAILABLE_CHARTS = [
  { id: 'line', name: 'Line Chart', bestFor: 'Data changing over time', example: 'Temperature, voltage', defaultMetric: 'temp_echap' },
  { id: 'area', name: 'Area Chart', bestFor: 'Continuous measurements', example: 'Pressure, humidity', defaultMetric: 'temp_carburant' },
  { id: 'gauge', name: 'Gauge / Tachometer', bestFor: 'Current value + range', example: 'RPM, speed, temperature', defaultMetric: 'rpm' },
  { id: 'radial', name: 'Radial Gauge', bestFor: 'Percentage/range', example: 'Battery, CPU load', defaultMetric: 'vibration' },
  { id: 'bar', name: 'Bar Chart', bestFor: 'Comparing values', example: 'Sensor readings, states', defaultMetric: 'vitesse' },
  { id: 'hbar', name: 'Horizontal Bar', bestFor: 'Rankings/comparisons', example: 'Multiple sensors', defaultMetric: 'vibration' },
  { id: 'scatter', name: 'Scatter Plot', bestFor: 'Relationship between 2 values', example: 'RPM vs temperature', defaultMetric: 'rpm' },
  { id: 'histogram', name: 'Histogram', bestFor: 'Distribution', example: 'Vibration, noise', defaultMetric: 'vibration' },
  { id: 'heatmap', name: 'Heatmap', bestFor: 'Intensity over time/space', example: 'Temperature/vibration', defaultMetric: 'temp_echap' },
  { id: 'number', name: 'Number / KPI Card', bestFor: 'Single current value', example: '72.5 °C', defaultMetric: 'temp_admission' },
  { id: 'progress', name: 'Progress Bar', bestFor: 'Percentage', example: 'Battery 78%', defaultMetric: 'vitesse' },
  { id: 'led', name: 'LED / Status Indicator', bestFor: 'Digital state', example: 'ON/OFF, alarm', defaultMetric: 'rpm' },
  { id: 'sparkline', name: 'Sparkline', bestFor: 'Tiny trend', example: 'Temperature on a card', defaultMetric: 'temp_carburant' },
  { id: 'multiline', name: 'Multi-line Chart', bestFor: 'Several sensors', example: 'X/Y/Z acceleration', defaultMetric: 'all' },
  { id: 'candlestick', name: 'Candlestick', bestFor: 'Min/max/open/close type data', example: 'Usually less common for sensors', defaultMetric: 'temp_echap' },
  { id: 'polar', name: 'Polar/Radar', bestFor: 'Multi-axis measurements', example: 'Sensor orientation', defaultMetric: 'all' },
  { id: 'waveform', name: 'Waveform', bestFor: 'High-frequency signals', example: 'Audio/vibration', defaultMetric: 'vibration' },
  { id: 'fft', name: 'Frequency Spectrum', bestFor: 'FFT/frequency data', example: 'Motor vibration', defaultMetric: 'vibration' },
]

interface DashboardWidget {
  id: string
  type: string
  metric: string
}

const getLocalizedChartInfo = (id: string, name: string, bestFor: string, example: string, isRTL: boolean) => {
  if (!isRTL) return { name, bestFor, example };
  switch (id) {
    case 'line': return { name: 'مخطط خطي', bestFor: 'تغير البيانات بمرور الوقت', example: 'درجة الحرارة، الجهد الكهربائي' };
    case 'area': return { name: 'مخطط مساحي', bestFor: 'القياسات المستمرة والمتراكمة', example: 'الضغط، الرطوبة' };
    case 'gauge': return { name: 'مقياس دائري / تاكومتر', bestFor: 'القيمة الحالية + النطاق الآمن', example: 'دورة في الدقيقة، السرعة، الحرارة' };
    case 'radial': return { name: 'مقياس شعاعي', bestFor: 'النسبة المئوية والنطاق', example: 'البطارية، حمل المعالج' };
    case 'bar': return { name: 'مخطط شريطي عمودي', bestFor: 'مقارنة القراءات المنفصلة', example: 'قراءات المستشعرات، الحالات' };
    case 'hbar': return { name: 'مخطط شريطي أفقي', bestFor: 'الترتيب والمقارنات المتعددة', example: 'مستشعرات متعددة' };
    case 'scatter': return { name: 'مخطط التشتت', bestFor: 'العلاقة بين قيمتين', example: 'دورة في الدقيقة مقابل الحرارة' };
    case 'histogram': return { name: 'مخطط توزيع التكرار', bestFor: 'توزيع القراءات الإحصائي', example: 'الاهتزاز، الضوضاء' };
    case 'heatmap': return { name: 'المخطط الحراري', bestFor: 'كثافة القراءات عبر الوقت', example: 'درجة الحرارة والاهتزاز' };
    case 'number': return { name: 'بطاقة رقمية / مؤشر رئيسي', bestFor: 'قيمة حالية واحدة بارزة', example: '72.5 درجة مئوية' };
    case 'progress': return { name: 'شريط تقدم خطي', bestFor: 'النسبة المئوية المنتهية', example: 'البطارية 78%' };
    case 'led': return { name: 'مؤشر LED / الحالة', bestFor: 'الحالة الرقمية الثنائية', example: 'تشغيل/إيقاف، تنبيه' };
    case 'sparkline': return { name: 'خط اتجاهي صغير', bestFor: 'مؤشر اتجاه مصغر مدمج', example: 'تغير الحرارة على بطاقة' };
    case 'multiline': return { name: 'مخطط خطي متعدد', bestFor: 'مستشعرات متعددة في وقت واحد', example: 'تسارع المحاور X/Y/Z' };
    case 'candlestick': return { name: 'مخطط الشموع اليابانية', bestFor: 'القيم القصوى والدنيا والمستويات', example: 'حركة مستشعرات التبريد' };
    case 'polar': return { name: 'مخطط قطبي / رادار', bestFor: 'القياسات متعددة المحاور', example: 'توجيه المستشعر' };
    case 'waveform': return { name: 'شكل الموجة التناظرية', bestFor: 'الإشارات ذات التردد العالي', example: 'الصوت، الاهتزاز السريع' };
    case 'fft': return { name: 'طيف التردد (FFT)', bestFor: 'تحليل الترددات والاهتزازات', example: 'اهتزاز المحرك الميكانيكي' };
    default: return { name, bestFor, example };
  }
}

export function TableauDeBord() {
  const { t, lang } = useLanguage()
  const {
    latest: realLatest,
    history: realHistory,
    thresholds,
    alarms,
    connect,
    disconnect,
    connectionStatus,
    serialError,
    serialSupported,
    updateThresholds,
    rawLines,
    stats,
    handshakeStatus,
    sendHandshake,
    selectedBoard,
    setSelectedBoard,
    boardName,
  } = useBench()

  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [hasConfiguredWidgets, setHasConfiguredWidgets] = useState(false)
  const [setupStep, setSetupStep] = useState<'connect-device' | 'choose-charts' | 'dashboard'>('connect-device')

  // Setup options for widgets in step 2
  const [selectedChartIds, setSelectedChartIds] = useState<Set<string>>(new Set(['gauge', 'radial', 'line', 'number']))
  const [chartMetrics, setChartMetrics] = useState<Record<string, string>>({
    line: 'temp_echap',
    area: 'temp_carburant',
    gauge: 'rpm',
    radial: 'vibration',
    bar: 'vitesse',
    hbar: 'vibration',
    scatter: 'rpm',
    histogram: 'vibration',
    heatmap: 'temp_echap',
    number: 'temp_admission',
    progress: 'vitesse',
    led: 'rpm',
    sparkline: 'temp_carburant',
    multiline: 'all',
    candlestick: 'temp_echap',
    polar: 'all',
    waveform: 'vibration',
    fft: 'vibration'
  })

  // Modal states for adding widget on the dashboard
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newWidgetType, setNewWidgetType] = useState('line')
  const [newWidgetMetric, setNewWidgetMetric] = useState('temp_echap')

  // Threshold edit states
  const [draft, setDraft] = useState<Thresholds>(() => ({ ...thresholds }))
  const [saved, setSaved] = useState(false)

  // Demo mode simulations
  const [demoMode, setDemoMode] = useState(false)
  const [demoLatest, setDemoLatest] = useState<SensorReading | null>(null)
  const [demoHistory, setDemoHistory] = useState<SensorReading[]>([])

  // Load configuration from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidgets = localStorage.getItem('dashboardWidgets')
      const configured = localStorage.getItem('hasConfiguredWidgets')
      if (savedWidgets) {
        setWidgets(JSON.parse(savedWidgets))
      }
      if (configured === 'true') {
        setHasConfiguredWidgets(true)
      }
    }
  }, [])

  // Sync draft thresholds
  useEffect(() => {
    setDraft({ ...thresholds })
  }, [thresholds])

  // Generator for demo telemetry data (1Hz)
  useEffect(() => {
    if (!demoMode) {
      setDemoLatest(null)
      setDemoHistory([])
      return
    }

    const interval = setInterval(() => {
      setDemoLatest(prev => {
        const drift = (Math.random() - 0.5)
        const nextRpm = Math.round(Math.max(1000, Math.min(8000, (prev?.rpm ?? 2500) + drift * 250)))
        const nextVitesse = Math.max(0, Math.min(25, (prev?.vitesse ?? 12) + drift * 1.2))
        const nextVibration = Math.max(0.1, Math.min(4, (prev?.vibration ?? 0.6) + drift * 0.15))
        const nextFuel = Math.max(20, Math.min(100, (prev?.temp_carburant ?? 45) + drift * 0.8))
        const nextEchap = Math.max(100, Math.min(1200, (prev?.temp_echap ?? 580) + drift * 15))
        const nextAdm = Math.max(10, Math.min(200, (prev?.temp_admission ?? 35) + drift * 0.5))

        const newReading: SensorReading = {
          timestamp: Date.now(),
          rpm: nextRpm,
          vitesse: Math.round(nextVitesse * 10) / 10,
          vibration: Math.round(nextVibration * 100) / 100,
          temp_carburant: Math.round(nextFuel * 10) / 10,
          temp_echap: Math.round(nextEchap * 10) / 10,
          temp_admission: Math.round(nextAdm * 10) / 10,
        }

        setDemoHistory(h => {
          const nextH = [...h, newReading]
          if (nextH.length > 300) nextH.shift()
          return nextH
        })

        return newReading
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [demoMode])

  // Get active telemetry states
  const currentLatest = demoMode ? demoLatest : realLatest
  const currentHistory = demoMode ? demoHistory : realHistory

  // Synchronize threshold edits
  const handleThresholdChange = (metric: string, level: 'warning' | 'danger', value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    setDraft(prev => ({
      ...prev,
      [metric]: { ...prev[metric as keyof Thresholds], [level]: num },
    }))
    setSaved(false)
  }

  const handleSaveThresholds = () => {
    updateThresholds(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Dashboard configuration triggers
  const handleSaveWorkspace = () => {
    const newWidgetsList: DashboardWidget[] = []
    selectedChartIds.forEach(id => {
      newWidgetsList.push({
        id: `widget-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: id,
        metric: chartMetrics[id] || 'rpm'
      })
    })

    setWidgets(newWidgetsList)
    setHasConfiguredWidgets(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardWidgets', JSON.stringify(newWidgetsList))
      localStorage.setItem('hasConfiguredWidgets', 'true')
    }
    setSetupStep('dashboard')
  }

  const handleResetWorkspace = () => {
    setWidgets([])
    setHasConfiguredWidgets(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dashboardWidgets')
      localStorage.setItem('hasConfiguredWidgets', 'false')
    }
    setSetupStep('choose-charts')
  }

  const handleAddWidget = () => {
    const newWidget: DashboardWidget = {
      id: `widget-${newWidgetType}-${Date.now()}`,
      type: newWidgetType,
      metric: newWidgetMetric
    }
    const updated = [...widgets, newWidget]
    setWidgets(updated)
    setIsAddModalOpen(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardWidgets', JSON.stringify(updated))
    }
  }

  const handleRemoveWidget = (id: string) => {
    const updated = widgets.filter(w => w.id !== id)
    setWidgets(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardWidgets', JSON.stringify(updated))
    }
  }

  const handleUpdateWidgetMetric = (id: string, metric: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, metric } : w)
    setWidgets(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardWidgets', JSON.stringify(updated))
    }
  }

  // Toggle chart checkbox in step 2
  const toggleChartSelect = (id: string) => {
    setSelectedChartIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Detect which sensors are actively transmitting data
  const activeSensors = useMemo(() => {
    return {
      rpm:            currentHistory.some(r => r.rpm !== undefined),
      vitesse:        currentHistory.some(r => r.vitesse !== undefined),
      vibration:      currentHistory.some(r => r.vibration !== undefined),
      temp_carburant: currentHistory.some(r => r.temp_carburant !== undefined),
      temp_echap:     currentHistory.some(r => r.temp_echap !== undefined),
      temp_admission: currentHistory.some(r => r.temp_admission !== undefined),
    }
  }, [currentHistory])

  // Sparkline calculations
  const sparkData = useMemo(() => {
    const recent = currentHistory.slice(-60)
    return {
      temp_carburant: recent.map(r => r.temp_carburant ?? 0),
      temp_echap:     recent.map(r => r.temp_echap ?? 0),
      temp_admission: recent.map(r => r.temp_admission ?? 0),
      rpm:            recent.map(r => r.rpm ?? 0),
      vitesse:        recent.map(r => r.vitesse ?? 0),
      vibration:      recent.map(r => r.vibration ?? 0),
    }
  }, [currentHistory])

  // Min/Max session values
  const sessionStats = useMemo(() => {
    if (!currentHistory.length) return null
    const getStats = (key: keyof SensorReading) => {
      const valid = currentHistory.map(r => r[key]).filter((v): v is number => typeof v === 'number')
      return {
        min: valid.length ? Math.min(...valid) : 0,
        max: valid.length ? Math.max(...valid) : 0
      }
    }
    return {
      rpm: getStats('rpm'),
      vitesse: getStats('vitesse'),
      vibration: getStats('vibration'),
      temp_carburant: getStats('temp_carburant'),
      temp_echap: getStats('temp_echap'),
      temp_admission: getStats('temp_admission'),
    }
  }, [currentHistory])

  // Determine button routes in Step 1
  const isConnected = connectionStatus === 'connected'
  const nextStepLabel = hasConfiguredWidgets ? 'Next: Open Telemetry Console' : 'Next: Configure Widgets'

  const handleStep1Next = () => {
    if (!isConnected) return
    if (hasConfiguredWidgets) {
      setSetupStep('dashboard')
    } else {
      setSetupStep('choose-charts')
    }
  }

  // Render Step 1: Connection Verification Screen
  if (setupStep === 'connect-device') {
    return (
      <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6 mt-6">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 dark:from-blue-400 dark:via-indigo-400 dark:to-emerald-400 bg-clip-text text-transparent">
            {t('dashboard.step.connect')}
          </h1>
          <p className="text-sm text-bench-muted max-w-xl mx-auto leading-relaxed">
            {t('dashboard.step.connectDesc')}
          </p>
        </div>

        {/* Dynamic Warning for serial support */}
        {!serialSupported && (
          <div className="p-4 text-xs rounded-lg border bg-amber-950/20 text-amber-500 border-amber-900/40 flex items-center gap-3">
            <AlertTriangleIcon size={18} className="text-amber-500" />
            <div>
              <strong>{t('dashboard.step.unsupported')}</strong> {t('dashboard.step.unsupportedDesc')}
            </div>
          </div>
        )}

        {serialError && (
          <div className="p-4 text-xs rounded-lg border bg-red-950/20 text-red-400 border-red-900/40 flex items-center gap-3 font-mono">
            <AlertTriangleIcon size={18} className="text-red-500 animate-pulse" />
            <div>
              <strong>{t('dashboard.step.connFault')}</strong> {serialError}
            </div>
          </div>
        )}

        {/* Dual Panel Layout for Connection & Signal Validation */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4 items-stretch">
          
          {/* Left panel: Connection control & handshake */}
          <div
            className="md:col-span-5 rounded-xl border p-6 flex flex-col items-center text-center justify-between gap-5 relative overflow-hidden bg-bench-surface border-bench-border"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex flex-col items-center gap-3 w-full">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border relative transition-all ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/30'
                  : 'bg-bench-subtle text-bench-muted border-bench-border dark:bg-slate-900 dark:text-slate-500'
              }`}>
                {isConnected && (
                  <span className="absolute inset-0 rounded-full border border-emerald-300 dark:border-emerald-500/20 animate-ping opacity-75" />
                )}
                <UsbIcon size={24} />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-bench-text">
                  {isConnected ? t('dashboard.step.connectedSuccess') : t('dashboard.step.offline')}
                </h3>
                <p className="text-xs text-bench-muted leading-relaxed max-w-[240px] mx-auto">
                  {isConnected
                    ? t('dashboard.step.identifySuccess').replace('{board}', boardName || '')
                    : t('dashboard.step.pairPrompt')}
                </p>
              </div>
            </div>

            {isConnected ? (
              <div className="flex flex-col gap-3 w-full border-t border-[#1f2937]/30 dark:border-[#1f2937]/50 pt-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-bench-muted">{t('dashboard.step.detectedUsb')}</span>
                  <span className="text-bench-text font-bold">{stats.port && stats.port !== 'None' ? stats.port : 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-bench-muted">{t('dashboard.step.boardProfile')}</span>
                  <select
                    value={resolveBoardProfile(selectedBoard || boardName)}
                    onChange={e => setSelectedBoard(e.target.value)}
                    className="rounded border border-bench-border bg-bench-bg px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400 font-bold outline-none focus:border-blue-500 font-mono cursor-pointer"
                  >
                    {Object.keys(BOARD_FQBNS).map(name => (
                      <option key={name} value={name} className="bg-bench-surface text-bench-text">{name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-bench-muted">{t('dashboard.step.baudRate')}</span>
                  <span className="text-bench-text">9600 bps</span>
                </div>
                
                <div className="flex gap-2.5 mt-2">
                  <button
                    onClick={sendHandshake}
                    disabled={handshakeStatus === 'sending'}
                    className={`flex-1 py-2 rounded text-xs font-mono font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      handshakeStatus === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-600/10 dark:border-emerald-500 dark:text-emerald-400'
                        : handshakeStatus === 'error'
                          ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-600/10 dark:border-red-500 dark:text-red-400'
                          : 'bg-bench-bg border-bench-border hover:border-bench-text/30 text-bench-text dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {handshakeStatus === 'sending' ? (
                      <RefreshCwIcon size={12} className="animate-spin" />
                    ) : handshakeStatus === 'success' ? (
                      <CheckIcon size={12} />
                    ) : (
                      <CpuIcon size={12} />
                    )}
                    {handshakeStatus === 'sending' ? t('dashboard.step.testing') : handshakeStatus === 'success' ? t('dashboard.step.validated') : handshakeStatus === 'error' ? t('dashboard.step.failed') : t('dashboard.step.validateLed')}
                  </button>
                  
                  <button
                    onClick={disconnect}
                    className="px-3.5 py-2 rounded border border-bench-border text-xs font-mono text-bench-muted hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors cursor-pointer"
                  >
                    {t('action.disconnect')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => connect({ forcePrompt: true })}
                disabled={!serialSupported || connectionStatus === 'connecting'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded text-xs font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
              >
                <RefreshCwIcon size={12} className={connectionStatus === 'connecting' ? 'animate-spin' : ''} />
                {connectionStatus === 'connecting' ? t('dashboard.step.pairing') : t('dashboard.step.pairConnect')}
              </button>
            )}
          </div>

          {/* Right panel: Live signal log verification */}
          <div className="md:col-span-7 border border-bench-border rounded-xl overflow-hidden flex flex-col bg-bench-panel-bg">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-bench-border bg-bench-header-bg">
              <div className="flex items-center gap-2">
                <TerminalIcon size={13} className={isConnected ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-bench-muted'} />
                <span className="text-[10px] font-mono uppercase tracking-widest font-semibold text-bench-text">
                  {t('dashboard.step.monitorTitle')}
                </span>
              </div>
              <span className={`text-[9px] font-mono border px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected
                  ? 'text-emerald-700 bg-emerald-100 border-emerald-300 dark:text-emerald-500 dark:bg-emerald-950/20 dark:border-emerald-800/40'
                  : 'text-bench-muted bg-bench-subtle border-bench-border dark:text-slate-500 dark:bg-slate-900 dark:border-slate-800'
              }`}>
                {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse" />}
                {isConnected ? t('dashboard.step.online') : t('dashboard.step.offlineCaps')}
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-[10px] flex flex-col gap-0.5 bg-slate-950 text-emerald-400 select-text min-h-[160px] rounded-b-xl border-t border-bench-border">
              {isConnected ? (
                rawLines.length > 0 ? (
                  rawLines.map((line, idx) => (
                    <div key={idx} className="truncate font-mono">
                      <span className="text-emerald-700/60 select-none mr-2">&gt;</span>
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1 py-8 text-center font-mono">
                    <span className="animate-pulse">{t('dashboard.step.waitingTelemetry')}</span>
                    <span className="text-[9px] max-w-[260px] leading-relaxed text-slate-500">{t('dashboard.step.telemetryHint')}</span>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8 text-center font-mono">
                  <span>{t('dashboard.step.disconnected')}</span>
                  <span className="text-[9px] text-slate-500 mt-1">{t('dashboard.step.rawPrompt')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wizard Bottom navigation button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleStep1Next}
            disabled={!isConnected}
            className="flex items-center gap-2 px-8 py-3.5 rounded text-sm font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
          >
            {hasConfiguredWidgets ? t('dashboard.step.openConsole') : t('dashboard.step.configTitle')}
            <ArrowRightIcon size={14} />
          </button>
        </div>
      </div>
    )
  }

  // Render Step 2: Chart Selector Screen
  if (setupStep === 'choose-charts') {
    return (
      <div className="p-6 max-w-6xl mx-auto flex flex-col gap-8 mt-6">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            {t('dashboard.step.configTitle')}
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            {t('dashboard.step.configDesc')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between border-b border-[#1f2937]/50 pb-4 font-sans">
          <button
            onClick={() => setSetupStep('connect-device')}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-[#1f2937] text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            {lang === 'ar' ? `← العودة لفحص الاتصال (${boardName})` : `← Back to Connection Check (${boardName})`}
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {lang === 'ar' ? `تم اختيار ${selectedChartIds.size} عناصر` : `${selectedChartIds.size} widgets selected`}
          </span>
        </div>

        {/* Charts Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {AVAILABLE_CHARTS.map(chart => {
            const isSelected = selectedChartIds.has(chart.id)
            const isAllMetric = chart.defaultMetric === 'all'
            const localized = getLocalizedChartInfo(chart.id, chart.name, chart.bestFor, chart.example, lang === 'ar')
            return (
              <div
                key={chart.id}
                onClick={() => toggleChartSelect(chart.id)}
                className={`flex flex-col gap-4 p-5 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-bench-nav-active border-blue-500/50 shadow-[0_4px_15px_rgba(59,130,246,0.1)]'
                    : 'bg-bench-surface border-bench-border hover:border-bench-muted/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by div onClick
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500/50 cursor-pointer pointer-events-none"
                    />
                    <span className={`text-sm font-bold transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-100'}`}>
                      {localized.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-bench-border/50 px-2 py-0.5 rounded text-bench-muted">
                    {chart.id}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-slate-400 flex-1">
                  <p><strong>{lang === 'ar' ? 'أفضل استخدام:' : 'Best for:'}</strong> {localized.bestFor}</p>
                  <p><strong>{lang === 'ar' ? 'مثال:' : 'Example:'}</strong> {localized.example}</p>
                </div>

                {/* Metric Selector Dropdown */}
                <div
                  onClick={e => e.stopPropagation()} // prevent toggle chart
                  className="flex items-center justify-between gap-3 border-t border-[#1f2937]/40 pt-3 text-xs"
                >
                  <span className="text-slate-500 font-mono">{lang === 'ar' ? 'الإشارة المرتبطة:' : 'Bound Metric:'}</span>
                  {isAllMetric ? (
                    <span className="text-slate-300 font-semibold font-mono text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                      {lang === 'ar' ? 'جميع الإشارات النشطة' : 'All Active Metrics'}
                    </span>
                  ) : (
                    <select
                      value={chartMetrics[chart.id] || 'rpm'}
                      onChange={e => setChartMetrics(prev => ({ ...prev, [chart.id]: e.target.value }))}
                      className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-mono text-slate-300 outline-none focus:border-blue-500"
                    >
                      {Object.keys(METRIC_LABELS).map(key => (
                        <option key={key} value={key}>
                          {t('metric.' + key)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom confirmation */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSaveWorkspace}
            disabled={selectedChartIds.size === 0}
            className="flex items-center gap-2 px-8 py-3.5 rounded text-sm font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none animate-bounce"
          >
            <CheckCircle2Icon size={16} />
            {t('dashboard.step.createConsole')}
          </button>
        </div>
      </div>
    )
  }

  // Render Step 3: Main Dashboard Console
  return (
    <div className="p-4 flex flex-col gap-6 relative">
      
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1f2937]/50 pb-4 gap-4">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CpuIcon size={18} className="text-blue-400" />
            {lang === 'ar' ? `محطة قياس البعد لـ ${boardName}` : `${boardName} Telemetry Station`}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'ar' ? 'مساحة عمل لوحة التحكم • استقبال البيانات في الوقت الفعلي بمعدل 1 هرتز' : 'Console Workspace • Real-time acquisition running at 1 Hz'}
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono font-semibold transition-all ${
              demoMode
                ? 'bg-amber-600/10 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title={lang === 'ar' ? 'تبديل قيم القياس المحاكاة لمعاينة المخططات' : 'Toggle simulated telemetry values to preview charts'}
          >
            <PlayIcon size={13} className={demoMode ? 'animate-pulse' : ''} />
            {demoMode ? (lang === 'ar' ? 'وضع المحاكاة نشط' : 'DEMO MODE ACTIVE') : (lang === 'ar' ? 'تفعيل وضع المحاكاة' : 'ACTIVATE DEMO MODE')}
          </button>

          {/* Add Widget Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-500/40 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white transition-all text-xs font-mono font-bold"
          >
            <PlusIcon size={13} />
            {t('dashboard.widget.add')}
          </button>

          {/* Setup / Reset Config buttons */}
          <button
            onClick={() => setSetupStep('choose-charts')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors text-xs font-mono"
            title={lang === 'ar' ? 'اختر المخططات التي تريد عرضها' : 'Select which charts to display'}
          >
            <SlidersHorizontalIcon size={13} />
            {t('dashboard.step.configTitle')}
          </button>

          <button
            onClick={handleResetWorkspace}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-950/10 transition-colors text-xs font-mono"
            title={lang === 'ar' ? 'مسح تهيئة عناصر مساحة العمل' : 'Clear workspace widgets configuration'}
          >
            <RotateCcwIcon size={13} />
            {t('dashboard.widget.reset')}
          </button>

          <button
            onClick={() => {
              setSetupStep('connect-device')
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-500/25 bg-red-950/15 hover:bg-red-600 text-red-400 hover:text-white transition-all text-xs font-mono font-bold"
            title={lang === 'ar' ? 'فحص اتصال المنفذ المتسلسل للجهاز' : 'Check device serial connection'}
          >
            {t('dashboard.btn.connectionPage')}
          </button>
        </div>
      </div>

      {/* Main Connection Status Header Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch font-sans">
        <div
          className="rounded-lg border p-4 flex items-center justify-between gap-4 relative overflow-hidden bg-bench-surface border-bench-border"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-lg pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
              isConnected
                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40'
                : 'bg-red-950/20 text-red-400 border-red-900/40'
            }`}>
              <UsbIcon size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{t('dashboard.status.serialConn')}</span>
              <span className="text-xs font-bold font-mono text-slate-200">
                {isConnected ? (lang === 'ar' ? `متصل على ${boardName}` : `Connected on ${boardName}`) : connectionStatus === 'connecting' ? t('dashboard.status.connecting') : t('dashboard.status.disconnected')}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={() => connect({ forcePrompt: true })}
                disabled={!serialSupported || connectionStatus === 'connecting'}
                className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
              >
                {connectionStatus === 'connecting' ? t('dashboard.status.connecting') : t('dashboard.btn.connectSerial')}
              </button>
            ) : (
              <button
                onClick={sendHandshake}
                disabled={handshakeStatus === 'sending'}
                className="w-8 h-8 rounded border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-500 hover:text-slate-900 text-emerald-400 flex items-center justify-center transition-all"
                title="Blink LED 13 to verify communication"
              >
                {handshakeStatus === 'sending' ? (
                  <RefreshCwIcon size={12} className="animate-spin" />
                ) : (
                  <CpuIcon size={13} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* System Error Logs Banner */}
        {serialError && (
          <div className="lg:col-span-2 p-4 text-xs rounded-lg border bg-red-950/10 text-red-400 border-red-900/40 flex items-center gap-3 font-mono">
            <AlertTriangleIcon size={18} className="text-red-500 flex-shrink-0 animate-pulse" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[10px] tracking-wider uppercase text-red-500">Acquisition Fault</span>
              <span className="text-slate-300">{serialError}</span>
            </div>
          </div>
        )}

        {/* Demo Indicator Info Banner */}
        {demoMode && (
          <div className="lg:col-span-2 p-4 text-xs rounded-lg border bg-amber-950/15 text-amber-500 border-amber-900/40 flex items-center gap-3 font-mono">
            <InfoIcon size={18} className="text-amber-500 flex-shrink-0 animate-pulse" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[10px] tracking-wider uppercase text-amber-500">Demo Telemetry Feed Active</span>
              <span className="text-slate-300">Simulating measurements to review full chart renderings. Plug in USB device & toggle demo mode off to stream real values.</span>
            </div>
          </div>
        )}

        {/* Browser Serial Warning Banner */}
        {!serialSupported && !demoMode && (
          <div className="lg:col-span-2 p-4 text-xs rounded-lg border bg-amber-950/10 text-amber-500 border-amber-900/40 flex items-center gap-3 font-sans">
            <AlertTriangleIcon size={18} className="text-amber-500 flex-shrink-0" />
            <div>
              <strong>Web Serial Unsupported:</strong> This browser does not support Web Serial API. Please use Chrome, Edge, or Opera to connect physical boards, or toggle Demo Mode above to view charts.
            </div>
          </div>
        )}
      </div>

      {/* Grid Workspace Dashboard */}
      {widgets.length === 0 ? (
        <div className="border border-dashed border-[#1f2937] bg-slate-950/30 rounded-xl p-16 text-center flex flex-col items-center gap-4">
          <SlidersHorizontalIcon size={36} className="text-slate-600 animate-pulse" />
          <h3 className="text-base font-bold text-slate-300">No charts or gauges configured</h3>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            Your telemetry workspace is blank. Choose which indicators to add, bind them to your sensor channels, and launch monitors.
          </p>
          <button
            onClick={() => setSetupStep('choose-charts')}
            className="mt-2 flex items-center gap-1.5 px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs shadow-lg shadow-blue-600/10 transition-all"
          >
            <PlusIcon size={14} />
            Configure Workspace Widgets
          </button>
        </div>
      ) : (
        <section aria-label="Acquisition Monitors Workspace Grid font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {widgets.map(w => {
              const isWide = ['line', 'area', 'scatter', 'multiline', 'waveform', 'fft', 'heatmap'].includes(w.type)
              const cardSpan = isWide ? 'md:col-span-2' : 'col-span-1'
              const chartName = AVAILABLE_CHARTS.find(c => c.id === w.type)?.name || w.type
              const isAllMetric = w.type === 'multiline' || w.type === 'polar'
              const metricLabel = isAllMetric ? 'All Active Channels' : `${METRIC_LABELS[w.metric]} (${METRIC_UNITS[w.metric]})`

              return (
                <div
                  key={w.id}
                  className={`rounded-lg border bg-bench-surface border-bench-border p-4 flex flex-col gap-3 shadow-md transition-all hover:border-[#3b82f6]/30 ${cardSpan}`}
                >
                  {/* Widget Card Header */}
                  <div className="flex items-center justify-between border-b border-bench-border pb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-200">{chartName}</span>
                      <span className="text-[10px] font-mono text-slate-500">{metricLabel}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Metric Selector inside Widget (if applicable) */}
                      {!isAllMetric && (
                        <select
                          value={w.metric}
                          onChange={e => handleUpdateWidgetMetric(w.id, e.target.value)}
                          className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[9px] font-mono text-slate-400 outline-none focus:border-blue-500"
                        >
                          {Object.keys(METRIC_LABELS).map(key => (
                            <option key={key} value={key}>
                              {METRIC_LABELS[key].split(' ')[0]}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Trash Delete button */}
                      <button
                        onClick={() => handleRemoveWidget(w.id)}
                        className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-red-950/20 transition-colors"
                        title="Remove widget from dashboard"
                      >
                        <Trash2Icon size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Widget Chart Rendering */}
                  <div className="flex-1">
                    <WidgetRenderer
                      widget={w}
                      latest={currentLatest}
                      history={currentHistory}
                      thresholds={thresholds}
                      spark={sparkData}
                      stats={sessionStats}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Section 4: Live console output & Troubleshooting guide (only when serial in focus) */}
      {isConnected && !demoMode && (
        <section aria-labelledby="live-console-heading" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Live Terminal logs */}
          <div className="lg:col-span-2 border border-bench-border rounded-lg overflow-hidden flex flex-col bg-bench-panel-bg">
            <div className="flex items-center justify-between px-4 py-2 border-b border-bench-border bg-bench-header-bg">
              <div className="flex items-center gap-2">
                <TerminalIcon size={13} className={isConnected ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-bench-muted'} />
                <span id="live-console-heading" className="text-[10px] font-mono uppercase tracking-widest font-semibold text-bench-text">
                  Live Console Stream (9600 Baud)
                </span>
              </div>
              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100 border border-emerald-300 dark:text-emerald-500 dark:bg-emerald-950/20 dark:border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse" />
                ACQUIRING
              </span>
            </div>
            <div className="p-3 h-36 overflow-y-auto font-mono text-[10px] flex flex-col gap-0.5 bg-slate-950 text-emerald-400 select-text">
              {rawLines.length > 0 ? (
                rawLines.map((line, idx) => (
                  <div key={idx} className="truncate font-mono">
                    <span className="text-emerald-700/60 select-none mr-2">&gt;</span>
                    {line}
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-0.5 py-4">
                  <span className="animate-pulse">Waiting for serial frames...</span>
                  <span className="text-[9px]">(Verify your sketch sends Serial.println messages)</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Arduino Code Helper */}
          <div className="border border-bench-border rounded-lg p-4 bg-bench-surface flex flex-col gap-2 justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-blue-400 font-semibold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                <FileCode2Icon size={12} />
                Expected Code Format
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Upload this simple CSV layout to your board to start plotting coordinates instantly:
              </p>
              <pre className="p-1.5 rounded bg-slate-950 text-[9px] text-emerald-400 font-mono border border-bench-border leading-normal max-h-16 overflow-y-auto select-all">
{`void loop() {
  // FuelT, ExhT, IntT, RPM, speed, vib
  Serial.print(35.5);   Serial.print(",");
  Serial.print(620.0);  Serial.print(",");
  Serial.print(28.2);   Serial.print(",");
  Serial.print(3200);   Serial.print(",");
  Serial.print(14.8);   Serial.print(",");
  Serial.println(0.85); // println ends frame!
  delay(1000);
}`}
              </pre>
            </div>
            <Link
              href="/programmation"
              className="text-center py-1 rounded bg-slate-800 text-[10px] font-mono border border-slate-700 text-slate-300 hover:bg-slate-700/80 transition-colors"
            >
              Open Full Sketch Instructions
            </Link>
          </div>
        </section>
      )}

      {/* Threshold Configuration (Only when active sensors exist) */}
      {(activeSensors.rpm || activeSensors.vitesse || activeSensors.vibration || activeSensors.temp_carburant || activeSensors.temp_echap || activeSensors.temp_admission) && (
        <section aria-labelledby="thresholds-heading">
          {/* Calibration Panel */}
          <div className="rounded-xl border p-6 flex flex-col gap-4 bg-bench-surface border-bench-border shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-bench-border pb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-bold text-bench-text flex items-center gap-2">
                  <SlidersHorizontalIcon size={14} className="text-purple-500" />
                  {t('dashboard.panel.alarmTuning')}
                </h3>
              </div>
              <button
                onClick={handleSaveThresholds}
                className="px-3.5 py-1.5 rounded text-[10px] font-mono font-bold border transition-all flex items-center gap-1 cursor-pointer self-start md:self-auto"
                style={{
                  borderColor:     saved ? '#10b981' : '#3b82f6',
                  color:           saved ? '#10b981' : '#3b82f6',
                  backgroundColor: saved ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                }}
              >
                {saved ? <><CheckIcon size={12} /> {t('action.saved')}</> : t('dashboard.panel.saveCalib')}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'ar' ? 'تهيئة قيم حد التحذير / الخطر. تتحكم هذه المعلمات في تنبيهات LED والألوان والمحفزات الحرجة.' : 'Configure Warning / Danger limit values. These parameters control the LED alerts, Radial colors, and critical alarm triggers.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-1 font-sans">
              {Object.keys(thresholds).map(key => {
                const metricKey = key as keyof Thresholds
                const label = t('metric.' + key) || key
                const unit = METRIC_UNITS[key] || ''
                return (
                  <div key={key} className="p-3 rounded border border-slate-800/60 bg-slate-950/20 flex flex-col gap-2">
                    <span className="text-[11px] font-semibold text-slate-300">{label} ({unit})</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-amber-500 uppercase tracking-wider">{t('dashboard.panel.warning')}</span>
                        <input
                          type="number"
                          value={draft[metricKey].warning}
                          onChange={e => handleThresholdChange(key, 'warning', e.target.value)}
                          className="rounded px-2 py-0.5 text-xs font-mono border border-slate-800 outline-none bg-slate-900 text-amber-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-red-500 uppercase tracking-wider">Danger</span>
                        <input
                          type="number"
                          value={draft[metricKey].danger}
                          onChange={e => handleThresholdChange(key, 'danger', e.target.value)}
                          className="rounded px-2 py-0.5 text-xs font-mono border border-slate-800 outline-none bg-slate-900 text-red-500"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Alarm History Panel */}
      <section aria-labelledby="alarms-heading">
        <h2
          id="alarms-heading"
          className="text-[10px] uppercase tracking-widest mb-3 font-semibold text-slate-500 animate-pulse"
        >
          {t('alarms.recentAlarms')}
        </h2>
        <RecentAlarms alarms={alarms} limit={10} />
      </section>

      {/* ADD WIDGET MODAL DIALOG */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bench-surface border border-bench-border rounded-xl w-full max-w-md p-6 flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200 font-sans">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X size={18} />
            </button>
            <h2 className="text-base font-bold text-slate-100 font-sans">{t('dashboard.widget.addWorkspace')}</h2>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-mono">{t('dashboard.widget.type')}</label>
                <select
                  value={newWidgetType}
                  onChange={e => {
                    setNewWidgetType(e.target.value)
                    const defaultMetric = AVAILABLE_CHARTS.find(c => c.id === e.target.value)?.defaultMetric || 'rpm'
                    setNewWidgetMetric(defaultMetric)
                  }}
                  className="rounded border border-slate-800 bg-slate-900 p-2 text-xs font-mono text-slate-200 outline-none focus:border-blue-500"
                >
                  {AVAILABLE_CHARTS.map(c => (
                    <option key={c.id} value={c.id}>{getLocalizedChartInfo(c.id, c.name, '', '', lang === 'ar').name}</option>
                  ))}
                </select>
              </div>

              {newWidgetType !== 'multiline' && newWidgetType !== 'polar' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-mono">{t('dashboard.widget.chooseMetric')}</label>
                  <select
                    value={newWidgetMetric}
                    onChange={e => setNewWidgetMetric(e.target.value)}
                    className="rounded border border-slate-800 bg-slate-900 p-2 text-xs font-mono text-slate-200 outline-none focus:border-blue-500"
                  >
                    {Object.keys(METRIC_LABELS).map(key => (
                      <option key={key} value={key}>{t('metric.' + key)}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono italic bg-slate-900 border border-slate-800/60 p-2 rounded">
                  {lang === 'ar' ? 'ملاحظة: يتطلب هذا النوع من المخططات جميع قنوات القياس النشطة ويجمعها تلقائياً.' : 'Note: This chart type requires all active telemetry channels and aggregates them automatically.'}
                </div>
              )}
            </div>

            <button
              onClick={handleAddWidget}
              className="mt-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs shadow-lg transition-all"
            >
              {t('dashboard.widget.addBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   WIDGETS RENDERER DISPATCHER
   ────────────────────────────────────────────────────────────────────────── */
interface WidgetRendererProps {
  widget: DashboardWidget
  latest: SensorReading | null
  history: SensorReading[]
  thresholds: Thresholds
  spark: Record<string, number[]>
  stats: any
}

function WidgetRenderer({ widget, latest, history, thresholds, spark, stats }: WidgetRendererProps) {
  switch (widget.type) {
    case 'line':
      return <WidgetLineChart metric={widget.metric} history={history} />
    case 'area':
      return <WidgetAreaChart metric={widget.metric} history={history} />
    case 'gauge':
      return <WidgetGauge metric={widget.metric} latest={latest} thresholds={thresholds} />
    case 'radial':
      return <WidgetRadialGauge metric={widget.metric} latest={latest} thresholds={thresholds} />
    case 'bar':
      return <WidgetBarChart metric={widget.metric} history={history} />
    case 'hbar':
      return <WidgetHorizontalBar metric={widget.metric} latest={latest} thresholds={thresholds} />
    case 'scatter':
      return <WidgetScatterPlot metric={widget.metric} history={history} />
    case 'histogram':
      return <WidgetHistogram metric={widget.metric} history={history} />
    case 'heatmap':
      return <WidgetHeatmap metric={widget.metric} history={history} thresholds={thresholds} />
    case 'number':
      return <WidgetKPICard metric={widget.metric} latest={latest} history={history} />
    case 'progress':
      return <WidgetProgressBar metric={widget.metric} latest={latest} thresholds={thresholds} />
    case 'led':
      return <WidgetLED metric={widget.metric} latest={latest} thresholds={thresholds} />
    case 'sparkline':
      return <WidgetSparkline metric={widget.metric} history={history} thresholds={thresholds} />
    case 'multiline':
      return <WidgetMultiLine history={history} />
    case 'candlestick':
      return <WidgetCandlestick metric={widget.metric} history={history} />
    case 'polar':
      return <WidgetPolarRadar latest={latest} thresholds={thresholds} />
    case 'waveform':
      return <WidgetWaveform metric={widget.metric} latest={latest} />
    case 'fft':
      return <WidgetFFT metric={widget.metric} latest={latest} />
    default:
      return <EmptyWidgetState />
  }
}

function EmptyWidgetState() {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-center h-44 text-slate-500 text-xs font-mono">
      {t('dashboard.step.waitingTelemetry')}
    </div>
  )
}

function CustomMiniTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-bench-border bg-bench-header-bg p-2 text-[10px] font-mono leading-none">
      <span className="text-bench-muted">{payload[0].name}: </span>
      <span className="text-bench-text font-bold">{payload[0].value.toFixed(1)}</span>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   INDIVIDUAL WIDGET SUBCOMPONENTS
   ────────────────────────────────────────────────────────────────────────── */

// 1. Line Chart
function WidgetLineChart({ metric, history }: { metric: string; history: any[] }) {
  const { t } = useLanguage()
  const data = history.slice(-65)
  if (data.length < 2) return <EmptyWidgetState />
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={false} stroke="#1f2937" />
          <YAxis tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'var(--font-mono)' }} stroke="#1f2937" />
          <Tooltip content={<CustomMiniTooltip />} />
          <Line type="monotone" dataKey={metric} name={t('metric.' + metric)} stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// 2. Area Chart
function WidgetAreaChart({ metric, history }: { metric: string; history: any[] }) {
  const { t } = useLanguage()
  const data = history.slice(-65)
  if (data.length < 2) return <EmptyWidgetState />
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
          <defs>
            <linearGradient id={`gradArea-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={false} stroke="#1f2937" />
          <YAxis tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'var(--font-mono)' }} stroke="#1f2937" />
          <Tooltip content={<CustomMiniTooltip />} />
          <Area type="monotone" dataKey={metric} name={t('metric.' + metric)} stroke="#8b5cf6" strokeWidth={1.5} fillOpacity={1} fill={`url(#gradArea-${metric})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// 3. Gauge / Tachometer
function WidgetGauge({ metric, latest, thresholds }: { metric: string; latest: any; thresholds: Thresholds }) {
  const val = latest?.[metric] ?? 0
  const state = getMetricState(metric, val, thresholds)
  const unit = METRIC_UNITS[metric] || ''

  let max = 100
  if (metric === 'rpm') max = 9000
  else if (metric === 'vitesse') max = 25
  else if (metric === 'vibration') max = 4
  else if (metric === 'temp_echap') max = 1200
  else if (metric === 'temp_admission') max = 200

  return (
    <div className="flex justify-center items-center h-44 py-1">
      <AnalogGauge
        label=""
        value={val}
        unit={unit}
        min={0}
        max={max}
        state={state}
        size={160}
      />
    </div>
  )
}

// 4. Radial Gauge
function WidgetRadialGauge({ metric, latest, thresholds }: { metric: string; latest: any; thresholds: Thresholds }) {
  const val = latest?.[metric] ?? 0
  const state = getMetricState(metric, val, thresholds)
  const unit = METRIC_UNITS[metric] || ''

  let max = 100
  if (metric === 'rpm') max = 9000
  else if (metric === 'vitesse') max = 25
  else if (metric === 'vibration') max = 4
  else if (metric === 'temp_echap') max = 1200
  else if (metric === 'temp_admission') max = 200

  const pct = Math.min(100, Math.max(0, (val / max) * 100))
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference
  const color = state === 'DANGER' ? '#ef4444' : state === 'WARNING' ? '#f59e0b' : '#10b981'

  return (
    <div className="flex flex-col items-center justify-center h-44 relative select-none font-mono">
      <svg className="w-28 h-28 transform -rotate-90">
        <circle cx="56" cy="56" r={radius} stroke="#1e293b" strokeWidth="6" fill="transparent" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{ filter: `drop-shadow(0 0 3px ${color}44)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-lg font-mono font-extrabold text-slate-200">{val.toFixed(1)}</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-widest">{unit}</span>
      </div>
    </div>
  )
}

// 5. Bar Chart
function WidgetBarChart({ metric, history }: { metric: string; history: any[] }) {
  const { t } = useLanguage()
  const data = history.slice(-25)
  if (data.length < 2) return <EmptyWidgetState />
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={false} stroke="#1f2937" />
          <YAxis tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'var(--font-mono)' }} stroke="#1f2937" />
          <Tooltip content={<CustomMiniTooltip />} />
          <Bar dataKey={metric} name={t('metric.' + metric)} fill="#10b981" radius={[1.5, 1.5, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 6. Horizontal Bar
function WidgetHorizontalBar({ metric, latest, thresholds }: { metric: string; latest: any; thresholds: Thresholds }) {
  const { t, lang } = useLanguage()
  const val = latest?.[metric] ?? 0
  const state = getMetricState(metric, val, thresholds)
  const unit = METRIC_UNITS[metric] || ''

  let max = 100
  if (metric === 'rpm') max = 9000
  else if (metric === 'vitesse') max = 25
  else if (metric === 'vibration') max = 4
  else if (metric === 'temp_echap') max = 1200
  else if (metric === 'temp_admission') max = 200

  const pct = Math.min(100, Math.max(0, (val / max) * 100))
  const color = state === 'DANGER' ? '#ef4444' : state === 'WARNING' ? '#f59e0b' : '#3b82f6'
  const thresh = thresholds[metric as MetricKey]
  const warnPct = thresh ? (thresh.warning / max) * 100 : 70
  const dangPct = thresh ? (thresh.danger / max) * 100 : 90

  return (
    <div className="flex flex-col justify-center gap-3.5 px-4 h-44 select-none">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-slate-400">{lang === 'ar' ? 'القراءة الحالية' : 'Current Reading'}</span>
        <span className="font-extrabold text-slate-100">{val.toFixed(1)} {unit}</span>
      </div>

      <div className="relative w-full h-4.5 bg-slate-950 rounded border border-slate-800 overflow-hidden">
        {/* Warning threshold divider */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500/40 z-10" style={{ left: `${warnPct}%` }} title={`Warning: ${thresh?.warning}`} />
        {/* Danger threshold divider */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/40 z-10" style={{ left: `${dangPct}%` }} title={`Danger: ${thresh?.danger}`} />

        {/* Fill */}
        <div
          className="h-full transition-all duration-300 rounded-l"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
        <span>0</span>
        <span>{lang === 'ar' ? 'تحذير' : 'Warning'} ({thresh?.warning || '--'})</span>
        <span>{lang === 'ar' ? 'خطر' : 'Danger'} ({thresh?.danger || '--'})</span>
        <span>{lang === 'ar' ? 'الأقصى' : 'Max'} ({max})</span>
      </div>
    </div>
  )
}

// 7. Scatter Plot
function WidgetScatterPlot({ metric, history }: { metric: string; history: any[] }) {
  const { t, lang } = useLanguage()
  const data = history.slice(-60)
  const compareMetric = metric === 'rpm' ? 'temp_echap' : 'rpm'
  const compareLabel = t('metric.' + compareMetric)?.split(' ')[0] || compareMetric
  const primaryLabel = t('metric.' + metric)?.split(' ')[0] || metric

  const chartData = data.map(r => ({
    x: r[compareMetric as keyof SensorReading],
    y: r[metric as keyof SensorReading]
  })).filter(pt => pt.x !== undefined && pt.y !== undefined)

  if (chartData.length < 2) return <EmptyWidgetState />

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={compareLabel} stroke="#1f2937" tick={{ fill: '#64748b', fontSize: 9 }} />
          <YAxis type="number" dataKey="y" name={primaryLabel} stroke="#1f2937" tick={{ fill: '#64748b', fontSize: 9 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name={lang === 'ar' ? 'توزيع القياسات' : 'Telemetry distribution'} data={chartData} fill="#ec4899" isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

// 8. Histogram
function WidgetHistogram({ metric, history }: { metric: string; history: any[] }) {
  const values = history.map(r => r[metric as keyof SensorReading]).filter((v): v is number => typeof v === 'number')

  const chartData = useMemo(() => {
    if (values.length < 5) return []
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const binCount = 8
    const binWidth = range / binCount
    const bins = Array.from({ length: binCount }, (_, i) => ({
      name: `${(min + i * binWidth).toFixed(0)}-${(min + (i + 1) * binWidth).toFixed(0)}`,
      count: 0
    }))

    for (const v of values) {
      let idx = Math.floor((v - min) / binWidth)
      if (idx >= binCount) idx = binCount - 1
      if (idx < 0) idx = 0
      bins[idx].count++
    }
    return bins
  }, [values])

  if (chartData.length === 0) return <EmptyWidgetState />

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 8 }} stroke="#1f2937" />
          <YAxis tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'var(--font-mono)' }} stroke="#1f2937" />
          <Tooltip />
          <Bar dataKey="count" fill="#eab308" radius={[1, 1, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 9. Heatmap
function WidgetHeatmap({ metric, history, thresholds }: { metric: string; history: any[]; thresholds: Thresholds }) {
  const data = history.slice(-60)
  if (data.length === 0) return <EmptyWidgetState />

  return (
    <div className="flex items-center justify-center h-44 px-2">
      <div className="grid grid-cols-10 gap-1.5 w-full max-w-[270px]">
        {Array.from({ length: 60 }).map((_, idx) => {
          const r = data[idx]
          const val = r ? (r[metric as keyof SensorReading] as number) : null
          if (val === null || val === undefined) {
            return <div key={idx} className="aspect-square bg-slate-950 border border-slate-900/50 rounded-sm" />
          }
          const state = getMetricState(metric, val, thresholds)
          const color = state === 'DANGER' ? 'bg-red-500/80 shadow-[0_0_4px_rgba(239,68,68,0.35)]' : state === 'WARNING' ? 'bg-amber-500/80' : 'bg-emerald-500/60'
          return (
            <div
              key={idx}
              className={`aspect-square rounded-sm border border-slate-950 transition-all ${color}`}
              title={`Value: ${val.toFixed(1)}`}
            />
          )
        })}
      </div>
    </div>
  )
}

// 10. Number / KPI Card
function WidgetKPICard({ metric, latest, history }: { metric: string; latest: any; history: any[] }) {
  const { t, lang } = useLanguage()
  const val = latest?.[metric] ?? 0
  const unit = METRIC_UNITS[metric] || ''

  const values = history.map(r => r[metric as keyof SensorReading]).filter((v): v is number => typeof v === 'number')
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0

  const lastTwo = values.slice(-2)
  let trend = 'flat'
  if (lastTwo.length === 2) {
    if (lastTwo[1] > lastTwo[0]) trend = 'up'
    else if (lastTwo[1] < lastTwo[0]) trend = 'down'
  }

  return (
    <div className="flex flex-col justify-center items-center h-44 gap-1 select-none font-sans font-mono">
      <div className="flex items-baseline gap-1 bg-bench-subtle px-6 py-2.5 rounded-lg border border-bench-border">
        <span className="text-3xl font-mono font-extrabold text-bench-text tracking-tight">{val.toFixed(1)}</span>
        <span className="text-xs font-mono text-bench-muted font-bold">{unit}</span>
      </div>

      <div className="flex gap-4 mt-3 text-[10px] font-mono">
        <div className="text-slate-500 flex flex-col items-center font-mono">
          <span>{lang === 'ar' ? 'الأدنى' : 'MIN'}</span>
          <span className="text-blue-400 font-bold font-mono">{min.toFixed(1)}</span>
        </div>
        <div className="border-r border-slate-800 font-mono" />
        <div className="text-slate-500 flex flex-col items-center font-mono">
          <span>{lang === 'ar' ? 'الاتجاه' : 'TREND'}</span>
          {trend === 'up' ? (
            <span className="text-emerald-500 font-bold font-mono">{lang === 'ar' ? '▲ متصاعد' : '▲ RISING'}</span>
          ) : trend === 'down' ? (
            <span className="text-red-500 font-bold font-mono">{lang === 'ar' ? '▼ متناقص' : '▼ FALLING'}</span>
          ) : (
            <span className="text-slate-400 font-bold font-mono">{lang === 'ar' ? '■ مستقر' : '■ STABLE'}</span>
          )}
        </div>
        <div className="border-r border-slate-800 font-mono" />
        <div className="text-slate-500 flex flex-col items-center font-mono">
          <span>{lang === 'ar' ? 'الأقصى' : 'MAX'}</span>
          <span className="text-amber-500 font-bold font-mono">{max.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

// 11. Progress Bar
function WidgetProgressBar({ metric, latest, thresholds }: { metric: string; latest: any; thresholds: Thresholds }) {
  const { t, lang } = useLanguage()
  const val = latest?.[metric] ?? 0
  const state = getMetricState(metric, val, thresholds)
  const unit = METRIC_UNITS[metric] || ''

  let max = 100
  if (metric === 'rpm') max = 9000
  else if (metric === 'vitesse') max = 25
  else if (metric === 'vibration') max = 4
  else if (metric === 'temp_echap') max = 1200
  else if (metric === 'temp_admission') max = 200

  const pct = Math.min(100, Math.max(0, (val / max) * 100))
  const color = state === 'DANGER' ? '#ef4444' : state === 'WARNING' ? '#f59e0b' : '#10b981'

  return (
    <div className="flex flex-col justify-center px-4 h-44 gap-2.5 select-none">
      <div className="flex justify-between items-baseline text-xs font-mono">
        <span className="text-slate-400 font-mono">{lang === 'ar' ? 'تحميل القناة' : 'Loading Channel'}</span>
        <span className="font-extrabold text-slate-100 font-mono">{pct.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden relative">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}88` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 font-mono text-center font-mono">
        {val.toFixed(1)} / {max} {unit}
      </span>
    </div>
  )
}

// 12. LED / Status Indicator
function WidgetLED({ metric, latest, thresholds }: { metric: string; latest: any; thresholds: Thresholds }) {
  const { t, lang } = useLanguage()
  const val = latest?.[metric] ?? 0
  const state = getMetricState(metric, val, thresholds)
  const label = t('metric.' + metric) || metric

  const color = state === 'DANGER' ? 'bg-red-500' : state === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
  const glow = state === 'DANGER' ? 'shadow-[0_0_20px_#ef4444] animate-pulse' : state === 'WARNING' ? 'shadow-[0_0_12px_#f59e0b]' : 'shadow-[0_0_8px_#10b981]'

  return (
    <div className="flex flex-col justify-center items-center h-44 gap-4 select-none">
      <div className="relative flex h-8 w-8">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${state === 'DANGER' ? 'bg-red-400' : state === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        <span className={`relative inline-flex rounded-full h-8 w-8 ${color} ${glow}`} />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-mono font-bold tracking-widest text-slate-300">
          {state === 'DANGER' ? (lang === 'ar' ? 'تحذير تجاوز الحد' : 'OVERLIMIT WARNING') : state === 'WARNING' ? (lang === 'ar' ? 'انتباه مطلوب' : 'ATTENTION REQUIRED') : (lang === 'ar' ? 'استقبال عادي' : 'NORMAL ACQUISITION')}
        </span>
        <span className="text-[9px] text-slate-500 font-mono mt-0.5">
          {lang === 'ar' ? `الإشارة المرتبطة: ${label} (${val.toFixed(1)})` : `Bound Metric: ${label} (${val.toFixed(1)})`}
        </span>
      </div>
    </div>
  )
}

// 13. Sparkline
function WidgetSparkline({ metric, history, thresholds }: { metric: string; history: any[]; thresholds: Thresholds }) {
  const val = history.map(r => r[metric as keyof SensorReading] ?? 0).slice(-45)
  const current = val[val.length - 1] ?? 0
  const state = getMetricState(metric, current, thresholds)
  const unit = METRIC_UNITS[metric] || ''

  return (
    <div className="flex items-center justify-center p-2 h-44">
      <Sparkline
        data={val}
        label=""
        unit={unit}
        color="#3b82f6"
        state={state}
        height={56}
        width={180}
      />
    </div>
  )
}

// 14. Multi-line Chart
function WidgetMultiLine({ history }: { history: any[] }) {
  const { t } = useLanguage()
  const data = history.slice(-65)
  if (data.length < 2) return <EmptyWidgetState />
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={false} stroke="#1f2937" />
          <YAxis tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'var(--font-mono)' }} stroke="#1f2937" />
          <Tooltip content={<CustomMiniTooltip />} />
          <Line type="monotone" dataKey="temp_carburant" name={t('metric.temp_carburant')} stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="temp_echap" name={t('metric.temp_echap')} stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="temp_admission" name={t('metric.temp_admission')} stroke="#8b5cf6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// 15. Candlestick
function WidgetCandlestick({ metric, history }: { metric: string; history: any[] }) {
  const values = history.map(r => r[metric as keyof SensorReading]).filter((v): v is number => typeof v === 'number')

  const candles = useMemo(() => {
    if (values.length < 10) return []
    const size = Math.floor(values.length / 5) || 1
    const list = []
    for (let i = 0; i < 5; i++) {
      const slice = values.slice(i * size, (i + 1) * size)
      if (slice.length === 0) continue
      const open = slice[0]
      const close = slice[slice.length - 1]
      const high = Math.max(...slice)
      const low = Math.min(...slice)
      list.push({ open, close, high, low })
    }
    return list
  }, [values])

  if (candles.length === 0) return <EmptyWidgetState />

  return (
    <div className="flex items-center justify-center h-44 w-full px-4 select-none">
      <svg className="w-full h-32" viewBox="0 0 100 60">
        {candles.map((c, i) => {
          const x = 12 + i * 19
          const maxVal = Math.max(...values) || 1
          const minVal = Math.min(...values) || 0
          const yRange = maxVal - minVal || 1

          const scaleY = (val: number) => 50 - ((val - minVal) / yRange) * 40

          const yOpen = scaleY(c.open)
          const yClose = scaleY(c.close)
          const yHigh = scaleY(c.high)
          const yLow = scaleY(c.low)

          const isGreen = c.close >= c.open
          const fill = isGreen ? '#10b981' : '#ef4444'
          const rectTop = Math.min(yOpen, yClose)
          const rectHeight = Math.max(1.5, Math.abs(yOpen - yClose))

          return (
            <g key={i}>
              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={fill} strokeWidth="1" />
              <rect x={x - 3} y={rectTop} width="6" height={rectHeight} fill={fill} rx="0.5" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// 16. Polar/Radar
function WidgetPolarRadar({ latest, thresholds }: { latest: any; thresholds: Thresholds }) {
  const { t } = useLanguage()
  const radarData = useMemo(() => {
    const metrics = ['rpm', 'vitesse', 'vibration', 'temp_carburant', 'temp_echap', 'temp_admission']
    const maxRanges: Record<string, number> = {
      rpm: 9000,
      vitesse: 25,
      vibration: 4,
      temp_carburant: 100,
      temp_echap: 1200,
      temp_admission: 200
    }

    return metrics.map(m => {
      const val = latest?.[m] ?? 0
      const limit = maxRanges[m] || 100
      const pct = Math.min(100, (val / limit) * 100)
      return {
        subject: t('metric.' + m)?.split(' ')[0] || m,
        value: pct,
        fullMark: 100
      }
    })
  }, [latest])

  return (
    <div className="h-44 w-full flex justify-center items-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
          <PolarGrid stroke="#1f2937" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="transparent" />
          <Radar name="Active telemetry" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 17. Waveform
function WidgetWaveform({ metric, latest }: { metric: string; latest: any }) {
  const { lang } = useLanguage()
  const val = latest?.[metric] ?? 0

  let max = 100
  if (metric === 'rpm') max = 9000
  else if (metric === 'vitesse') max = 25
  else if (metric === 'vibration') max = 4
  else if (metric === 'temp_echap') max = 1200
  else if (metric === 'temp_admission') max = 200

  const intensity = Math.min(1.0, val / max)
  const amplitude = 4 + intensity * 26
  const frequency = 0.08 + intensity * 0.45

  const [phase, setPhase] = useState(0)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const animate = () => {
      setPhase(p => (p + 0.12) % (2 * Math.PI))
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  const points = useMemo(() => {
    const pts = []
    const width = 200
    const height = 100
    const centerY = height / 2
    for (let x = 0; x <= width; x += 4) {
      const y = centerY + Math.sin(x * frequency + phase) * amplitude
      pts.push(`${x},${y}`)
    }
    return `M ${pts.join(' L ')}`
  }, [amplitude, frequency, phase])

  return (
    <div className="flex flex-col justify-center items-center h-44 px-2 select-none relative">
      <svg className="w-full h-32 bg-black/25 border border-slate-900/60 rounded" viewBox="0 0 200 100">
        <path d={points} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity={0.75} />
      </svg>
      <span className="absolute bottom-2.5 text-[8px] font-mono text-cyan-500/50 uppercase tracking-widest">{lang === 'ar' ? 'موجة الإشارة في الوقت الفعلي' : 'REAL-TIME SIGNAL WAVE'}</span>
    </div>
  )
}

// 18. Frequency Spectrum (FFT visualizer)
function WidgetFFT({ metric, latest }: { metric: string; latest: any }) {
  const { lang } = useLanguage()
  const val = latest?.[metric] ?? 0

  let max = 100
  if (metric === 'rpm') max = 9000
  else if (metric === 'vitesse') max = 25
  else if (metric === 'vibration') max = 4
  else if (metric === 'temp_echap') max = 1200
  else if (metric === 'temp_admission') max = 200

  const intensity = Math.min(1.0, val / max)
  const [heights, setHeights] = useState<number[]>(Array(12).fill(12))

  useEffect(() => {
    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: 12 }, () => {
          const base = 4 + intensity * 62
          const jitter = Math.random() * 22 * (intensity + 0.15)
          return Math.max(4, Math.min(85, base + (Math.random() - 0.5) * jitter))
        })
      )
    }, 110)
    return () => clearInterval(interval)
  }, [intensity])

  return (
    <div className="flex flex-col justify-center items-center h-44 select-none px-4 relative font-sans">
      <div className="flex items-end gap-1.5 w-full justify-center h-28 bg-black/15 border border-slate-900/60 rounded p-2">
        {heights.map((h, i) => (
          <div
            key={i}
            className="flex-1 max-w-[10px] bg-gradient-to-t from-cyan-500 via-indigo-500 to-rose-500 rounded-t-sm transition-all duration-100"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <span className="absolute bottom-2.5 text-[8px] font-mono text-indigo-500/50 uppercase tracking-widest font-semibold font-mono">{lang === 'ar' ? 'ترددات الاهتزاز (FFT)' : 'VIBRATION FREQUENCIES (FFT)'}</span>
    </div>
  )
}
