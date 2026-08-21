'use client'

import { useRef, useEffect } from 'react'
import { TerminalIcon, Trash2Icon } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

interface CompilerTerminalProps {
  logs: string[]
  onClear: () => void
}

export function CompilerTerminal({ logs, onClear }: CompilerTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="flex flex-col h-full bg-bench-bg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-bench-border bg-bench-header-bg">
        <div className="flex items-center gap-2 text-xs font-medium text-bench-muted">
          <TerminalIcon size={14} /> {t('terminal.output')}
        </div>
        <button 
          onClick={onClear}
          className="text-bench-muted hover:text-bench-text transition-colors p-1 cursor-pointer"
          title={t('terminal.clear')}
        >
          <Trash2Icon size={14} />
        </button>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-[13px] leading-relaxed select-text"
      >
        {logs.length === 0 ? (
          <div className="text-bench-muted italic font-mono">{t('terminal.noOutput')}</div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => {
              // Colorize based on content
              let colorClass = 'text-bench-text'
              if (log.includes('[Error]') || log.includes('error:')) colorClass = 'text-red-600 dark:text-red-400'
              else if (log.includes('[AI]')) colorClass = 'text-violet-600 dark:text-violet-400'
              else if (log.includes('[Compiler]')) colorClass = 'text-blue-600 dark:text-blue-400'
              else if (log.includes('warning:')) colorClass = 'text-amber-600 dark:text-amber-500 font-semibold'
              else if (log.includes('successful') || log.includes('complete')) colorClass = 'text-emerald-600 dark:text-emerald-400 font-semibold'

              return (
                <div key={i} className={`${colorClass} break-all whitespace-pre-wrap font-mono`}>
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
