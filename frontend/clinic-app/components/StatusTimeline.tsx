'use client'
import React from 'react'
import { Check, Clock, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppointmentStatus } from '@/lib/types'

const TIMELINE_STEPS: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED']

const STEP_ICONS: Record<AppointmentStatus, React.ReactNode> = {
  PENDING:   <Clock className="h-4 w-4" aria-hidden="true" />,
  CONFIRMED: <Check className="h-4 w-4" aria-hidden="true" />,
  COMPLETED: <Check className="h-4 w-4" aria-hidden="true" />,
  CANCELLED: <X className="h-4 w-4" aria-hidden="true" />,
  NO_SHOW:   <AlertCircle className="h-4 w-4" aria-hidden="true" />,
}

interface TimelineLabels {
  confirm: string
  complete: string
  markNoShow: string
  cancel: string
  statusLabels: Record<AppointmentStatus, string>
}

interface Props {
  current: AppointmentStatus
  allowedTransitions: AppointmentStatus[]
  onTransition: (status: AppointmentStatus) => void
  loading?: boolean
  labels: TimelineLabels
}

export function StatusTimeline({ current, allowedTransitions, onTransition, loading, labels }: Props) {
  const isCancelled = current === 'CANCELLED'
  const isNoShow    = current === 'NO_SHOW'
  const isTerminal  = current === 'COMPLETED' || isCancelled || isNoShow

  const activeIndex = isCancelled || isNoShow
    ? -1
    : TIMELINE_STEPS.indexOf(current)

  return (
    <div className="space-y-4" role="region" aria-label="Appointment status timeline">
      {/* Main timeline */}
      {!isCancelled && !isNoShow && (
        <ol className="flex items-center w-full" aria-label="Status progress">
          {TIMELINE_STEPS.map((step, i) => {
            const done   = i < activeIndex
            const active = i === activeIndex
            const future = i > activeIndex
            const stepLabel = labels.statusLabels[step]

            return (
              <li key={step}
                className={cn('flex items-center', i < TIMELINE_STEPS.length - 1 && 'flex-1')}
                aria-current={active ? 'step' : undefined}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                      done   && 'border-green-600 bg-green-600 text-white',
                      active && 'border-blue-600 bg-blue-600 text-white',
                      future && 'border-slate-300 bg-white text-slate-400',
                    )}
                    aria-label={`${stepLabel}: ${done ? 'completed' : active ? 'current' : 'upcoming'}`}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden="true" /> : STEP_ICONS[step]}
                  </div>
                  <span className={cn(
                    'mt-1 text-xs whitespace-nowrap',
                    active && 'font-semibold text-blue-700',
                    done   && 'text-green-700',
                    future && 'text-slate-400',
                  )}>
                    {stepLabel}
                  </span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={cn('flex-1 h-0.5 mx-2 mt-[-16px]', done ? 'bg-green-600' : 'bg-slate-200')}
                    aria-hidden="true"
                  />
                )}
              </li>
            )
          })}
        </ol>
      )}

      {/* Terminal state pill */}
      {(isCancelled || isNoShow) && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
            isCancelled && 'bg-red-50 border border-red-200 text-red-700',
            isNoShow    && 'bg-slate-100 border border-slate-200 text-slate-600',
          )}>
          {STEP_ICONS[current]}
          {labels.statusLabels[current]}
        </div>
      )}

      {/* Action buttons — driven by allowedTransitions from backend */}
      {!isTerminal && allowedTransitions.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Status transition actions"
        >
          {allowedTransitions.includes('CONFIRMED') && (
            <button
              onClick={() => onTransition('CONFIRMED')}
              disabled={loading}
              aria-label="Confirm appointment"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {labels.confirm}
            </button>
          )}
          {allowedTransitions.includes('COMPLETED') && (
            <button
              onClick={() => onTransition('COMPLETED')}
              disabled={loading}
              aria-label="Mark appointment as completed"
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              {labels.complete}
            </button>
          )}
          {allowedTransitions.includes('NO_SHOW') && (
            <button
              onClick={() => onTransition('NO_SHOW')}
              disabled={loading}
              aria-label="Mark appointment as no-show"
              className="rounded-md bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
            >
              {labels.markNoShow}
            </button>
          )}
          {allowedTransitions.includes('CANCELLED') && (
            <button
              onClick={() => onTransition('CANCELLED')}
              disabled={loading}
              aria-label="Cancel appointment"
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 bg-white hover:bg-red-50 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              {labels.cancel}
            </button>
          )}
        </div>
      )}

      {/* Loading indicator for screen readers */}
      {loading && (
        <p role="status" aria-live="polite" className="sr-only">
          Updating appointment status…
        </p>
      )}
    </div>
  )
}
