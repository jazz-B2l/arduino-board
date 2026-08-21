'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CpuIcon,
  DownloadIcon,
  FileCode2Icon,
  LineChartIcon,
  MailIcon,
  SettingsIcon,
  TerminalIcon,
  UsbIcon,
  WifiIcon
} from 'lucide-react'
import { useLanguage } from '@/components/bench/LanguageContext'

// Simulated data generator for the hero preview widget
function usePreviewData() {
  const [reading, setReading] = useState({
    rpm: 2400,
    temp_echap: 560,
    vibration: 0.52,
    timestamp: 0
  })

  useEffect(() => {
    const id = setInterval(() => {
      setReading(prev => {
        const driftRpm = (Math.random() - 0.5) * 60
        const driftTemp = (Math.random() - 0.5) * 4
        const driftVib = (Math.random() - 0.5) * 0.05
        return {
          rpm: Math.round(Math.max(1000, Math.min(8000, prev.rpm + driftRpm))),
          temp_echap: Math.round(Math.max(200, Math.min(1000, prev.temp_echap + driftTemp))),
          vibration: Math.round(Math.max(0.1, Math.min(3.5, prev.vibration + driftVib)) * 100) / 100,
          timestamp: Date.now()
        }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return reading
}

export default function LandingPage() {
  const { t, lang, setLang } = useLanguage()
  const preview = usePreviewData()
  const [activeTab, setActiveTab] = useState<'json' | 'csv'>('json')
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const arduinoJsonCode = `// JSON Format
#include <Arduino.h>

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Your sensor readings
  float tempCarb = analogRead(A0) * 0.12; 
  float tempEch  = analogRead(A1) * 0.98;
  float tempAdm  = analogRead(A2) * 0.08;
  int rpm        = digitalRead(2) ? 3000 : 0;
  float vitesse  = analogRead(A3) * 0.03;
  float vib      = analogRead(A4) * 0.004;

  // Sending JSON frame
  Serial.print("{\\"temp_carburant\\": ");
  Serial.print(tempCarb);
  Serial.print(", \\"temp_echap\\": ");
  Serial.print(tempEch);
  Serial.print(", \\"temp_admission\\": ");
  Serial.print(tempAdm);
  Serial.print(", \\"rpm\\": ");
  Serial.print(rpm);
  Serial.print(", \\"vitesse\\": ");
  Serial.print(vitesse);
  Serial.print(", \\"vibration\\": ");
  Serial.print(vib);
  Serial.println("}");

  delay(1000); // 1 Hz
}`

  const arduinoCsvCode = `// CSV Format (Strict order)
#include <Arduino.h>

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Your sensor readings
  float tempCarb = 42.5; 
  float tempEch  = 580.2;
  float tempAdm  = 31.8;
  int rpm        = 2850;
  float vitesse  = 12.4;
  float vib      = 0.58;

  // Send separated by commas
  Serial.print(tempCarb);    Serial.print(",");
  Serial.print(tempEch);     Serial.print(",");
  Serial.print(tempAdm);     Serial.print(",");
  Serial.print(rpm);         Serial.print(",");
  Serial.print(vitesse);     Serial.print(",");
  Serial.println(vib);       // Final newline

  delay(1000); // 1 Hz
}`

  const handleCopy = () => {
    const code = activeTab === 'json' ? arduinoJsonCode : arduinoCsvCode
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="forced-dark min-h-screen text-bench-text relative overflow-hidden flex flex-col font-sans bg-bench-bg">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-10 dark:opacity-20 pointer-events-none blur-[140px]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 80%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-10 dark:opacity-20 pointer-events-none blur-[140px]" style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 80%)' }} />
      
      {/* Animated subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--bench-muted) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Header */}
      <header className="relative z-10 border-b flex items-center justify-between px-6 py-4 max-w-7xl w-full mx-auto border-bench-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-sm border transition-transform hover:rotate-12" style={{ backgroundColor: 'var(--bench-surface)', color: '#3b82f6', borderColor: '#3b82f6' }}>
            A#
          </div>
          <span className="text-base font-bold tracking-widest uppercase bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Arduino#board
          </span>
        </div>
        <div className="flex items-center gap-4 animate-fade-in">
          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded border text-xs font-semibold font-mono border-bench-border text-bench-muted hover:text-bench-text hover:bg-bench-subtle transition-all cursor-pointer"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          <Link href="/dashboard" className="px-4 py-1.5 rounded border text-xs font-mono font-semibold transition-all hover:bg-blue-500/10 hover:border-blue-400 border-bench-border text-bench-muted">
            {t('landing.directAccess')}
          </Link>
          <Link href="/dashboard" className="px-4 py-1.5 rounded text-xs font-mono font-semibold transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]" style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}>
            {t('landing.launchConsole')}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col gap-24">
        
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono font-medium self-start bg-blue-950/20 text-blue-400 border-blue-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Web Serial Telemetry v1.0
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              {t('landing.title')} <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent animate-gradient-text">
                Arduino#board
              </span>
            </h1>

            <p className="text-sm md:text-base text-bench-muted leading-relaxed max-w-xl">
              {t('landing.subtitle')}
            </p>

            <div className="flex flex-wrap gap-4 mt-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-6 py-3.5 rounded text-sm font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
              >
                {t('landing.openConsole')}
                <ArrowRightIcon size={15} />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 px-6 py-3.5 rounded border text-sm font-mono font-bold transition-all hover:bg-bench-subtle border-bench-border text-bench-muted"
              >
                {t('landing.discover')}
              </a>
            </div>
          </div>

          {/* Interactive Simulated Preview Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              className="w-full max-w-sm rounded-lg border p-5 flex flex-col gap-4 shadow-xl transition-all hover:border-blue-500/50 bg-bench-surface border-bench-border"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b pb-3 border-bench-border">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-bench-muted">{t('landing.livePreview')}</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <WifiIcon size={10} /> 9600 bps
                </div>
              </div>

              {/* Simulated Metrics */}
              <div className="flex flex-col gap-3.5">
                <div className="flex justify-between items-center bg-bench-bg p-2.5 rounded border border-bench-border">
                  <span className="text-xs text-bench-muted">{t('landing.engineSpeed')}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono font-bold text-blue-500">{preview.rpm.toLocaleString('en-US')}</span>
                    <span className="text-[9px] text-bench-muted font-mono">rpm</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-bench-bg p-2.5 rounded border border-bench-border">
                  <span className="text-xs text-bench-muted">{t('metric.temp_echap')}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono font-bold text-amber-500">{preview.temp_echap.toFixed(1)}</span>
                    <span className="text-[9px] text-bench-muted font-mono">°C</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-bench-bg p-2.5 rounded border border-bench-border">
                  <span className="text-xs text-bench-muted">{t('landing.vibrationG')}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono font-bold text-red-500">{preview.vibration.toFixed(2)}</span>
                    <span className="text-[9px] text-bench-muted font-mono">m/s²</span>
                  </div>
                </div>
              </div>

              {/* Dynamic waveform visualizer */}
              <div className="h-14 rounded flex items-end gap-[3px] p-2 bg-black/5 dark:bg-black/40 overflow-hidden relative">
                <span className="absolute top-2 left-2 text-[9px] font-mono text-bench-muted/60">{t('landing.streamRate')}</span>
                {Array.from({ length: 28 }).map((_, i) => {
                  const h = mounted
                    ? 15 + Math.sin((preview.timestamp / 1000) + i * 0.4) * 12 + Math.random() * 8
                    : 15
                  return (
                    <div
                      key={i}
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${Math.max(4, Math.min(42, h))}px`,
                        backgroundColor: i === 27 ? '#10b981' : i > 22 ? 'rgba(59,130,246,0.8)' : 'rgba(59,130,246,0.3)'
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="flex flex-col gap-12 animate-fade-in">
          <div className="flex flex-col gap-2 items-center text-center">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-blue-500 font-semibold">
              {t('landing.keyFeatures')}
            </h2>
            <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-bench-text">
              {t('landing.workstation')}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: UsbIcon,
                title: t('landing.nativeSerial'),
                desc: t('landing.nativeSerialDesc'),
                color: "#3b82f6"
              },
              {
                icon: ActivityIcon,
                title: t('landing.liveTelemetry'),
                desc: t('landing.liveTelemetryDesc'),
                color: "#10b981"
              },
              {
                icon: AlertTriangleIcon,
                title: t('landing.thresholdMonitor'),
                desc: t('landing.thresholdMonitorDesc'),
                color: "#ef4444"
              },
              {
                icon: LineChartIcon,
                title: t('landing.timeSeries'),
                desc: t('landing.timeSeriesDesc'),
                color: "#8b5cf6"
              },
              {
                icon: DownloadIcon,
                title: t('landing.csvExport'),
                desc: t('landing.csvExportDesc'),
                color: "#f59e0b"
              },
              {
                icon: SettingsIcon,
                title: t('landing.paramTuning'),
                desc: t('landing.paramTuningDesc'),
                color: "#06b6d4"
              }
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-lg border p-6 flex flex-col gap-3 group transition-all hover:scale-[1.01] hover:border-bench-muted bg-bench-surface border-bench-border"
              >
                <div className="w-10 h-10 rounded flex items-center justify-center mb-2 transition-transform group-hover:scale-110" style={{ backgroundColor: `${f.color}18`, color: f.color, border: `1px solid ${f.color}33` }}>
                  <f.icon size={18} />
                </div>
                <h4 className="text-sm font-bold text-bench-text">{f.title}</h4>
                <p className="text-xs text-bench-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Integration / Code Guide Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 flex flex-col gap-6 text-left">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-emerald-500 font-semibold">
              {t('landing.howItWorks')}
            </h2>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-bench-text">
              {t('landing.integrationSimplicity')}
            </h3>
            
            <div className="flex flex-col gap-4 text-xs">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-bench-surface border flex items-center justify-center font-mono font-bold text-bench-muted border-bench-border">1</div>
                <div className="flex-1">
                  <p className="font-semibold text-bench-text">{t('landing.step1Title')}</p>
                  <p className="text-bench-muted mt-0.5">{t('landing.step1Desc')}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-bench-surface border flex items-center justify-center font-mono font-bold text-bench-muted border-bench-border">2</div>
                <div className="flex-1">
                  <p className="font-semibold text-bench-text">{t('landing.step2Title')}</p>
                  <p className="text-bench-muted mt-0.5">{t('landing.step2Desc')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-bench-surface border flex items-center justify-center font-mono font-bold text-bench-muted border-bench-border">3</div>
                <div className="flex-1">
                  <p className="font-semibold text-bench-text">{t('landing.step3Title')}</p>
                  <p className="text-bench-muted mt-0.5">{t('landing.step3Desc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Code Snippet Display */}
          <div className="lg:col-span-7 w-full flex flex-col rounded-lg border overflow-hidden shadow-2xl bg-bench-surface border-bench-border">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-black/5 dark:bg-black/40 border-bench-border">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              </div>
              
              {/* Tab Selector */}
              <div className="flex rounded border bg-bench-bg overflow-hidden text-[10px] font-mono border-bench-border">
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-3 py-1 transition-all cursor-pointer ${activeTab === 'json' ? 'bg-[#3b82f6] text-white' : 'text-bench-muted hover:text-bench-text'}`}
                >
                  {lang === 'ar' ? 'صيغة JSON' : 'JSON Format'}
                </button>
                <button
                  onClick={() => setActiveTab('csv')}
                  className={`px-3 py-1 transition-all cursor-pointer ${activeTab === 'csv' ? 'bg-[#3b82f6] text-white' : 'text-bench-muted hover:text-bench-text'}`}
                >
                  {lang === 'ar' ? 'صيغة CSV' : 'CSV Format'}
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded bg-bench-bg border text-bench-muted hover:text-bench-text transition-colors border-bench-border cursor-pointer"
              >
                <FileCode2Icon size={11} />
                {copied ? t('chat.copied') : t('chat.copy')}
              </button>
            </div>

            {/* Terminal Content */}
            <div className="p-4 overflow-x-auto max-h-[300px] text-[11px] font-mono text-left leading-relaxed text-bench-text select-text bg-bench-bg">
              <pre>
                <code className="font-mono">{activeTab === 'json' ? arduinoJsonCode : arduinoCsvCode}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* CTA Area */}
        <section
          className="rounded-xl border p-8 md:p-12 text-center flex flex-col gap-6 items-center relative overflow-hidden bg-bench-surface border-bench-border"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
          
          <CpuIcon size={40} className="text-blue-400 animate-pulse" />
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-bench-text">
            {t('landing.ctaTitle')}
          </h3>
          <p className="text-xs md:text-sm text-bench-muted max-w-lg leading-relaxed">
            {t('landing.ctaDesc')}
          </p>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-3.5 rounded text-sm font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] mt-2"
            style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
          >
            {t('landing.ctaButton')}
            <ArrowRightIcon size={14} />
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-8 px-6 text-xs font-mono text-bench-muted/60 relative z-10 border-bench-border bg-bench-surface/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <span className="font-bold text-bench-text">&copy; {new Date().getFullYear()} Arduino#board</span>
            <span className="text-[10px]">{t('landing.footerDesc')}</span>
          </div>

          {/* Personal Info Badge */}
          <div className="flex flex-col items-center gap-3 border border-bench-border/80 bg-bench-surface/60 px-6 py-4 rounded-xl backdrop-blur-md transition-all hover:border-blue-500/40 hover:bg-bench-surface/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            <span className="text-xs uppercase tracking-widest text-blue-400 font-extrabold flex items-center gap-1.5">
              <CpuIcon size={12} className="text-blue-400 animate-pulse" />
              {t('account.developer')}
            </span>
            <div className="flex items-center gap-5 text-bench-muted font-medium text-xs">
              <a
                href="mailto:merabtiahmedabderahim213@gmail.com"
                className="flex items-center gap-2 hover:text-blue-400 hover:scale-105 transition-all text-xs"
                title="Email Ahmed Merabti"
              >
                <MailIcon size={14} className="text-blue-500" />
                <span>Email</span>
              </a>
              <span className="text-bench-border/80">|</span>
              <a
                href="https://github.com/jazz-B2l"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-emerald-400 hover:scale-105 transition-all text-xs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-500"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
                <span>GitHub</span>
              </a>
              <span className="text-bench-border/80">|</span>
              <a
                href="https://www.linkedin.com/in/ahmed-merabti-536790282/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-indigo-400 hover:scale-105 transition-all text-xs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-indigo-400"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1.5 text-[10px] md:text-right">
            <span className="flex items-center gap-1.5">
              <TerminalIcon size={11} style={{ color: '#3b82f6' }} />
              {t('landing.footerMotto')}
            </span>
            <span>{t('landing.footerApi')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
