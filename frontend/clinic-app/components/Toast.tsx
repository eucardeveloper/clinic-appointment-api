'use client'

/**
 * Toast sistemi — tek kaynak, üst üste yığılmaz.
 * Kullanım:
 *   const toast = useToast()
 *   toast.success('Kaydedildi', { action: { label: 'Geri Al', onClick: undo } })
 *   toast.error('Hata oluştu')
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'warning' | 'error' | 'info'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: string
  type: ToastType
  message: string
  action?: ToastAction
  duration?: number
}

interface ToastContextValue {
  success: (message: string, opts?: { action?: ToastAction; duration?: number }) => void
  warning: (message: string, opts?: { action?: ToastAction; duration?: number }) => void
  error:   (message: string, opts?: { action?: ToastAction; duration?: number }) => void
  info:    (message: string, opts?: { action?: ToastAction; duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle  size={16} aria-hidden />,
  warning: <AlertTriangle size={16} aria-hidden />,
  error:   <XCircle     size={16} aria-hidden />,
  info:    <Info        size={16} aria-hidden />,
}

const colorMap: Record<ToastType, { text: string; bg: string; border: string }> = {
  success: { text: 'hsl(var(--success))',  bg: 'hsl(var(--success-soft))',  border: 'hsl(var(--success)/0.3)'  },
  warning: { text: 'hsl(var(--warning))',  bg: 'hsl(var(--warning-soft))',  border: 'hsl(var(--warning)/0.3)'  },
  error:   { text: 'hsl(var(--danger))',   bg: 'hsl(var(--danger-soft))',   border: 'hsl(var(--danger)/0.3)'   },
  info:    { text: 'hsl(var(--info))',     bg: 'hsl(var(--info-soft))',     border: 'hsl(var(--info)/0.3)'     },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const add = useCallback((type: ToastType, message: string, opts?: { action?: ToastAction; duration?: number }) => {
    const id = `${Date.now()}-${Math.random()}`
    const duration = opts?.duration ?? 5000
    setToasts(prev => {
      // Max 4 toasts at once — remove oldest if needed
      const next = [...prev, { id, type, message, action: opts?.action, duration }]
      return next.slice(-4)
    })
    const timer = setTimeout(() => dismiss(id), duration)
    timers.current.set(id, timer)
  }, [dismiss])

  const ctx: ToastContextValue = {
    success: (m, o) => add('success', m, o),
    warning: (m, o) => add('warning', m, o),
    error:   (m, o) => add('error',   m, o),
    info:    (m, o) => add('info',    m, o),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Portal-like fixed container */}
      <div
        role="region"
        aria-label="Bildirimler"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
      >
        {toasts.map(toast => {
          const c = colorMap[toast.type]
          return (
            <div
              key={toast.id}
              role="alert"
              className="flex items-start gap-3 p-3 rounded-[var(--radius-lg)] border shadow-[var(--shadow-popover)] backdrop-blur-sm animate-in slide-in-from-right-4 duration-180"
              style={{ backgroundColor: c.bg, borderColor: c.border }}
            >
              <span style={{ color: c.text }} className="mt-0.5 flex-shrink-0">
                {icons[toast.type]}
              </span>
              <span className="flex-1 text-sm text-[hsl(var(--foreground))] leading-snug">
                {toast.message}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {toast.action && (
                  <button
                    onClick={() => { toast.action!.onClick(); dismiss(toast.id) }}
                    className="text-xs font-medium underline underline-offset-2"
                    style={{ color: c.text }}
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  onClick={() => dismiss(toast.id)}
                  className="text-[hsl(var(--subtle-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  aria-label="Kapat"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
