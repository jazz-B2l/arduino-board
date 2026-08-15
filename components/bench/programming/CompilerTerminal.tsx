'use client'

import { useRef, useEffect } from 'react'
import { TerminalIcon, Trash2Icon } from 'lucide-react'

interface CompilerTerminalProps {
  logs: string[]
  onClear: () => void
}

export function CompilerTerminal({ logs, onClear }: CompilerTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="flex flex-col h-full bg-[#05080f]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0d1220]">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <TerminalIcon size={14} /> Output
        </div>
        <button 
          onClick={onClear}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          title="Clear Terminal"
        >
          <Trash2Icon size={14} />
        </button>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-[13px] leading-relaxed"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">No output. Ready to compile.</div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => {
              // Colorize based on content
              let colorClass = 'text-slate-300'
              if (log.includes('[Error]') || log.includes('error:')) colorClass = 'text-red-400'
              else if (log.includes('[AI]')) colorClass = 'text-purple-400'
              else if (log.includes('[Compiler]')) colorClass = 'text-blue-400'
              else if (log.includes('warning:')) colorClass = 'text-amber-400'
              else if (log.includes('successful') || log.includes('complete')) colorClass = 'text-emerald-400'

              return (
                <div key={i} className={`${colorClass} break-all whitespace-pre-wrap`}>
                  {log}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
