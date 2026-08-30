'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'

// ── Tiny sparkline (inline SVG, no lib required) ──────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const h = 40
  const w = 120
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h * 0.8) - h * 0.1
    return `${x},${y}`
  })
  const d = `M ${pts.join(' L ')}`
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface KpiCardProps {
  label: string
  value: number | null
  trendPercent?: number   // positive = up, negative = down
  sparkline?: number[]    // last 7 days
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  onClick?: () => void
  isLoading?: boolean
}

const colorMap = {
  primary: { text: 'hsl(var(--primary))',  soft: 'hsl(var(--primary-soft))'  },
  success: { text: 'hsl(var(--success))',  soft: 'hsl(var(--success-soft))'  },
  warning: { text: 'hsl(var(--warning))',  soft: 'hsl(var(--warning-soft))'  },
  danger:  { text: 'hsl(var(--danger))',   soft: 'hsl(var(--danger-soft))'   },
  info:    { text: 'hsl(var(--info))',     soft: 'hsl(var(--info-soft))'     },
  neutral: { text: 'hsl(var(--neutral))',  soft: 'hsl(var(--neutral-soft))'  },
}

export function KpiCard({
  label, value, trendPercent, sparkline, icon, color, onClick, isLoading
}: KpiCardProps) {
  const { t } = useI18n()
  const colors = colorMap[color]

  const trendSign = (trendPercent ?? 0) > 0 ? '+' : ''
  const TrendIcon = (trendPercent ?? 0) > 0 ? TrendingUp
                  : (trendPercent ?? 0) < 0 ? TrendingDown
                  : Minus
  const trendColor = (trendPercent ?? 0) > 0 ? 'hsl(var(--success))'
                   : (trendPercent ?? 0) < 0 ? 'hsl(var(--danger))'
                   : 'hsl(var(--muted-foreground))'

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'card flex flex-col gap-3 p-[var(--pad-card)] text-left w-full',
        'transition-all duration-120',
        onClick && 'hover:bg-[hsl(var(--surface-3))] hover:border-[hsl(var(--border-strong))] cursor-pointer active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]'
      )}
      aria-label={onClick ? `${label}: ${value ?? '—'} — filtrele` : undefined}
    >
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-label text-[hsl(var(--muted-foreground))]">{label}</span>
        <span style={{ color: colors.text }}>{icon}</span>
      </div>

      {/* Value + trend */}
      <div className="flex items-end justify-between gap-2">
        {isLoading
          ? <div className="h-8 w-16 rounded bg-[hsl(var(--surface-3))] animate-pulse" />
          : <span className="text-h1 text-[hsl(var(--foreground))] tabular-nums">
              {value ?? '—'}
            </span>
        }

        {trendPercent !== undefined && !isLoading && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-full)] text-xs font-medium mb-1"
            style={{ color: trendColor, backgroundColor: `${trendColor}1a` }}
          >
            <TrendIcon size={11} aria-hidden />
            <span>{trendSign}{trendPercent}%</span>
            <span className="font-normal text-[hsl(var(--muted-foreground))]">{t.trendVsYesterday}</span>
          </div>
        )}
      </div>

      {/* Sparkline */}
      {sparkline && !isLoading && (
        <div className="mt-auto" aria-hidden>
          <Sparkline values={sparkline} color={colors.text} />
        </div>
      )}

      {isLoading && <div className="h-10 rounded bg-[hsl(var(--surface-3))] animate-pulse" />}
    </Tag>
  )
}
