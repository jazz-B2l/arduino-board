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
  SettingsIcon,
  TerminalIcon,
  UsbIcon,
  WifiIcon
} from 'lucide-react'

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
  const preview = usePreviewData()
  const [activeTab, setActiveTab] = useState<'json' | 'csv'>('json')
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const arduinoJsonCode = `// Format JSON
#include <Arduino.h>

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Vos lectures de capteurs
  float tempCarb = analogRead(A0) * 0.12; 
  float tempEch  = analogRead(A1) * 0.98;
  float tempAdm  = analogRead(A2) * 0.08;
  int rpm        = digitalRead(2) ? 3000 : 0;
  float vitesse  = analogRead(A3) * 0.03;
  float vib      = analogRead(A4) * 0.004;

  // Envoi de la trame JSON
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

  const arduinoCsvCode = `// Format CSV (Ordre strict)
#include <Arduino.h>

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Vos lectures de capteurs
  float tempCarb = 42.5; 
  float tempEch  = 580.2;
  float tempAdm  = 31.8;
  int rpm        = 2850;
  float vitesse  = 12.4;
  float vib      = 0.58;

  // Envoi séparé par des virgules
  Serial.print(tempCarb);    Serial.print(",");
  Serial.print(tempEch);     Serial.print(",");
  Serial.print(tempAdm);     Serial.print(",");
  Serial.print(rpm);         Serial.print(",");
  Serial.print(vitesse);     Serial.print(",");
  Serial.println(vib);       // Saut de ligne final

  delay(1000); // 1 Hz
}`

  const handleCopy = () => {
    const code = activeTab === 'json' ? arduinoJsonCode : arduinoCsvCode
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen text-[#e2e8f0] relative overflow-hidden flex flex-col font-sans" style={{ backgroundColor: '#0a0e1a' }}>
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 pointer-events-none blur-[140px]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 80%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-20 pointer-events-none blur-[140px]" style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 80%)' }} />
      
      {/* Animated subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Header */}
      <header className="relative z-10 border-b flex items-center justify-between px-6 py-4 max-w-7xl w-full mx-auto" style={{ borderColor: 'rgba(31, 41, 55, 0.5)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-sm border transition-transform hover:rotate-12" style={{ backgroundColor: '#111827', color: '#3b82f6', borderColor: '#3b82f6' }}>
            A#
          </div>
          <span className="text-base font-bold tracking-widest uppercase bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Arduino#board
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="px-4 py-1.5 rounded border text-xs font-mono font-semibold transition-all hover:bg-blue-500/10 hover:border-blue-400" style={{ borderColor: '#1f2937', color: '#94a3b8' }}>
            Accès Direct
          </Link>
          <Link href="/dashboard" className="px-4 py-1.5 rounded text-xs font-mono font-semibold transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]" style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}>
            Lancer la Console
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
              Télémétrie Série Web v1.0
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Le tableau de bord de télémétrie <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                Arduino#board
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-xl">
              Visualisez, analysez et enregistrez les signaux physiques de votre banc d&apos;essai mécanique ou thermique en temps réel. Connexion directe sans aucun logiciel tiers grâce à l&apos;API standard Web Serial.
            </p>

            <div className="flex flex-wrap gap-4 mt-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-6 py-3.5 rounded text-sm font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
              >
                Ouvrir la Console
                <ArrowRightIcon size={15} />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 px-6 py-3.5 rounded border text-sm font-mono font-bold transition-all hover:bg-slate-800/30"
                style={{ borderColor: '#1f2937', color: '#94a3b8' }}
              >
                Découvrir
              </a>
            </div>
          </div>

          {/* Interactive Simulated Preview Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              className="w-full max-w-sm rounded-lg border p-5 flex flex-col gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all hover:border-blue-500/50"
              style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#1f2937' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Live Preview</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <WifiIcon size={10} /> 9600 bps
                </div>
              </div>

              {/* Simulated Metrics */}
              <div className="flex flex-col gap-3.5">
                <div className="flex justify-between items-center bg-slate-950/30 p-2.5 rounded border" style={{ borderColor: 'rgba(31,41,55,0.4)' }}>
                  <span className="text-xs text-slate-400">Régime Moteur</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono font-bold text-blue-400">{preview.rpm.toLocaleString('fr-FR')}</span>
                    <span className="text-[9px] text-slate-500 font-mono">tr/min</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-950/30 p-2.5 rounded border" style={{ borderColor: 'rgba(31,41,55,0.4)' }}>
                  <span className="text-xs text-slate-400">Temp. Échappement</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono font-bold text-amber-500">{preview.temp_echap.toFixed(1)}</span>
                    <span className="text-[9px] text-slate-500 font-mono">°C</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-950/30 p-2.5 rounded border" style={{ borderColor: 'rgba(31,41,55,0.4)' }}>
                  <span className="text-xs text-slate-400">Vibrations G-Force</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono font-bold text-red-400">{preview.vibration.toFixed(2)}</span>
                    <span className="text-[9px] text-slate-500 font-mono">m/s²</span>
                  </div>
                </div>
              </div>

              {/* Dynamic waveform visualizer */}
              <div className="h-14 rounded flex items-end gap-[3px] p-2 bg-black/40 overflow-hidden relative">
                <span className="absolute top-2 left-2 text-[9px] font-mono text-slate-600">FRÉQUENCE DU FLUX — 1 HZ</span>
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
        <section id="features" className="flex flex-col gap-12">
          <div className="flex flex-col gap-2 items-center text-center">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-blue-400 font-semibold">
              Fonctionnalités Clés
            </h2>
            <h3 className="text-2xl md:text-4xl font-bold tracking-tight">
              Une station de travail complète dans votre navigateur
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: UsbIcon,
                title: "Web Serial Natif",
                desc: "Connectez votre Arduino directement via USB. Aucun démon, plugin ou driver tiers requis.",
                color: "#3b82f6"
              },
              {
                icon: ActivityIcon,
                title: "Télémétrie en Direct",
                desc: "Rendu instantané des indicateurs cruciaux (tours/minute, vitesses, vibrations et 3 capteurs thermiques).",
                color: "#10b981"
              },
              {
                icon: AlertTriangleIcon,
                title: "Surveillance des Seuils",
                desc: "Définissez des seuils Warning et Danger avec des alarmes automatiques et réactives.",
                color: "#ef4444"
              },
              {
                icon: LineChartIcon,
                title: "Graphiques Temporels",
                desc: "Générez des graphiques de tendances fluides avec des outils de zoom et d'analyse temporelle.",
                color: "#8b5cf6"
              },
              {
                icon: DownloadIcon,
                title: "Rapports & Export CSV",
                desc: "Conservez l'historique complet de vos sessions de test et exportez-les d'un clic au format Excel/CSV.",
                color: "#f59e0b"
              },
              {
                icon: SettingsIcon,
                title: "Ajustement des Paramètres",
                desc: "Ajustez le diamètre moteur, étalonnez les coefficients physiques et sauvegardez vos configurations.",
                color: "#06b6d4"
              }
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-lg border p-6 flex flex-col gap-3 group transition-all hover:scale-[1.01] hover:border-slate-700/60"
                style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
              >
                <div className="w-10 h-10 rounded flex items-center justify-center mb-2 transition-transform group-hover:scale-110" style={{ backgroundColor: `${f.color}18`, color: f.color, border: `1px solid ${f.color}33` }}>
                  <f.icon size={18} />
                </div>
                <h4 className="text-sm font-bold text-slate-100">{f.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Integration / Code Guide Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 flex flex-col gap-6 text-left">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              Comment ça marche ?
            </h2>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
              Simplicité d&apos;intégration logicielle
            </h3>
            
            <div className="flex flex-col gap-4 text-xs">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-900 border flex items-center justify-center font-mono font-bold text-slate-400" style={{ borderColor: '#1f2937' }}>1</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-200">Programmez votre Arduino</p>
                  <p className="text-slate-400 mt-0.5">Écrivez les variables lues sur le port série sous format JSON ou CSV.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-900 border flex items-center justify-center font-mono font-bold text-slate-400" style={{ borderColor: '#1f2937' }}>2</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-200">Connectez l&apos;appareil USB</p>
                  <p className="text-slate-400 mt-0.5">Branchez l&apos;Arduino et ouvrez la console sur un navigateur compatible desktop.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-900 border flex items-center justify-center font-mono font-bold text-slate-400" style={{ borderColor: '#1f2937' }}>3</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-200">Monitorez instantanément</p>
                  <p className="text-slate-400 mt-0.5">Appuyez sur connecter, sélectionnez le port COM/USB et observez les graphiques.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Code Snippet Display */}
          <div className="lg:col-span-7 w-full flex flex-col rounded-lg border overflow-hidden shadow-2xl" style={{ backgroundColor: '#0d1220', borderColor: '#1f2937' }}>
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-950/60" style={{ borderColor: '#1f2937' }}>
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              </div>
              
              {/* Tab Selector */}
              <div className="flex rounded border bg-slate-900 overflow-hidden text-[10px] font-mono" style={{ borderColor: '#1f2937' }}>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-3 py-1 transition-all ${activeTab === 'json' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Format JSON
                </button>
                <button
                  onClick={() => setActiveTab('csv')}
                  className={`px-3 py-1 transition-all ${activeTab === 'csv' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Format CSV
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border text-slate-400 hover:text-slate-200 transition-colors"
                style={{ borderColor: '#1f2937' }}
              >
                <FileCode2Icon size={11} />
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>

            {/* Terminal Content */}
            <div className="p-4 overflow-x-auto max-h-[300px] text-[11px] font-mono text-left leading-relaxed text-slate-300 select-text">
              <pre>
                <code>{activeTab === 'json' ? arduinoJsonCode : arduinoCsvCode}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* CTA Area */}
        <section
          className="rounded-xl border p-8 md:p-12 text-center flex flex-col gap-6 items-center relative overflow-hidden"
          style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
          
          <CpuIcon size={40} className="text-blue-400 animate-pulse" />
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Prêt à lancer l&apos;acquisition sur votre banc d&apos;essai ?
          </h3>
          <p className="text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed">
            Pas de compte requis, pas d&apos;installation. Branchez votre Arduino et accédez directement à vos données physiques.
          </p>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-3.5 rounded text-sm font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] mt-2"
            style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
          >
            Lancer Arduino#board
            <ArrowRightIcon size={14} />
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t py-6 px-6 text-center text-[10px] font-mono text-slate-600 relative z-10" style={{ borderColor: 'rgba(31, 41, 55, 0.4)' }}>
        <p className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <span>&copy; {new Date().getFullYear()} Arduino#board. Open Source Telemetry.</span>
          <span className="flex items-center gap-1.5">
            <TerminalIcon size={10} style={{ color: '#3b82f6' }} />
            Construit pour l&apos;ingénierie mécanique et thermique
          </span>
        </p>
      </footer>
    </div>
  )
}
