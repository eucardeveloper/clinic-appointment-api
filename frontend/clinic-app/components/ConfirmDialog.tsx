'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'

interface Props {
  open: boolean
  title: string
  description: string
  warning?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({
  open, title, description, warning,
  confirmLabel, onConfirm, onCancel, danger = true
}: Props) {
  const { t } = useI18n()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="card w-full max-w-sm shadow-[var(--shadow-popover)]">
        <div className="flex items-start justify-between px-5 pt-5 pb-0">
          <div className="flex items-start gap-3">
            {danger && (
              <div className="w-9 h-9 rounded-full bg-[hsl(var(--danger-soft))] flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-[hsl(var(--danger))]" aria-hidden />
              </div>
            )}
            <div>
              <h2 id="confirm-title" className="text-h2 text-[hsl(var(--foreground))]">{title}</h2>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" aria-label={t.btnCancel}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p id="confirm-desc" className="text-body text-[hsl(var(--muted-foreground))]">{description}</p>
          {warning && (
            <p className="mt-2 text-xs text-[hsl(var(--danger))]">{warning}</p>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-2 rounded-[var(--radius-md)] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-3))] transition-colors"
          >
            {t.btnCancel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors',
              danger
                ? 'bg-[hsl(var(--danger))] text-white hover:opacity-90'
                : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90'
            )}
          >
            {confirmLabel ?? t.btnDelete}
          </button>
        </div>
      </div>
    </div>
  )
}
