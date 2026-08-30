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
                      done   && 'border-green-500 bg-green-500 text-white',
                      active && 'border-blue-500 bg-blue-500 text-white',
                      future && 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800',
                    )}
                    aria-label={`${stepLabel}: ${done ? 'completed' : active ? 'current' : 'upcoming'}`}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden="true" /> : STEP_ICONS[step]}
                  </div>
                  <span className={cn(
                    'mt-1 text-xs whitespace-nowrap',
                    active && 'font-semibold text-blue-600 dark:text-blue-400',
                    done   && 'text-green-600 dark:text-green-400',
                    future && 'text-gray-400',
                  )}>
                    {stepLabel}
                  </span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={cn('flex-1 h-0.5 mx-2 mt-[-16px]', done ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700')}
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
            isCancelled && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            isNoShow    && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
              className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {labels.confirm}
            </button>
          )}
          {allowedTransitions.includes('COMPLETED') && (
            <button
              onClick={() => onTransition('COMPLETED')}
              disabled={loading}
              aria-label="Mark appointment as completed"
              className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
            >
              {labels.complete}
            </button>
          )}
          {allowedTransitions.includes('NO_SHOW') && (
            <button
              onClick={() => onTransition('NO_SHOW')}
              disabled={loading}
              aria-label="Mark appointment as no-show"
              className="rounded-md bg-gray-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              {labels.markNoShow}
            </button>
          )}
          {allowedTransitions.includes('CANCELLED') && (
            <button
              onClick={() => onTransition('CANCELLED')}
              disabled={loading}
              aria-label="Cancel appointment"
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
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
