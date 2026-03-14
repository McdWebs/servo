import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  icon?: ReactNode
  accent?: 'brass' | 'crimson' | 'muted' | 'default'
}

export default function StatCard({
  label,
  value,
  sublabel,
  icon,
  accent = 'default',
}: StatCardProps) {
  const valueColor =
    accent === 'brass' ? '#C9A962'
    : accent === 'crimson' ? '#C96070'
    : '#E8DFD4'

  return (
    <div
      className="relative rounded-[4px] p-4 transition-all duration-300 flourish-sm"
      style={{
        backgroundColor: '#251E19',
        border: '1px solid #4A3F35',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(201,169,98,0.35)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#4A3F35'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] tracking-[0.2em] uppercase mb-1.5"
            style={{ fontFamily: 'var(--font-display)', color: '#9C8B7A' }}
          >
            {label}
          </p>
          <p
            className="text-2xl tabular-nums"
            style={{ fontFamily: 'var(--font-display)', color: valueColor, letterSpacing: '0.02em' }}
          >
            {value}
          </p>
          {sublabel && (
            <p
              className="mt-0.5 text-[11px] italic"
              style={{ fontFamily: 'var(--font-body)', color: '#4A3F35' }}
            >
              {sublabel}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] text-base"
            style={{
              backgroundColor: '#1C1714',
              border: '1px solid #4A3F35',
              color: '#C9A962',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
