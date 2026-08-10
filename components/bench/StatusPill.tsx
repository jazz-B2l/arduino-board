'use client'

interface StatusPillProps {
  frozen: boolean
}

export function StatusPill({ frozen }: StatusPillProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-medium"
      style={{
        backgroundColor: frozen ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
        borderColor:     frozen ? '#ef4444' : '#10b981',
        color:           frozen ? '#ef4444' : '#10b981',
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          backgroundColor: frozen ? '#ef4444' : '#10b981',
          boxShadow: frozen
            ? '0 0 6px 1px rgba(239,68,68,0.6)'
            : '0 0 6px 1px rgba(16,185,129,0.6)',
        }}
      />
      {frozen ? 'Arrêt d\'urgence' : 'Mode démo'}
    </div>
  )
}
