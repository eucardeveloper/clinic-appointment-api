'use client'

import { useEffect, useRef } from 'react'
import {
  X, CheckCircle, RotateCcw, Ban, Pencil, FileText,
  Clock, User, Stethoscope, Building2, Calendar, MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    icon: Clock,        colorVar: '--warning' },
  CONFIRMED:  { label: 'Confirmed',  icon: CheckCircle,  colorVar: '--info'    },
  COMPLETED:  { label: 'Completed', icon: CheckCircle,  colorVar: '--success' },
  CANCELLED:  { label: 'Cancelled',  icon: Ban,          colorVar: '--danger'  },
  NO_SHOW:    { label: 'No Show',    icon: X,            colorVar: '--neutral' },
} as const

type AppointmentStatus = keyof typeof STATUS_CONFIG

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-full)] text-sm font-medium"
      style={{
        color: `hsl(var(${cfg.colorVar}))`,
        backgroundColor: `hsl(var(${cfg.colorVar})/0.12)`,
      }}
      aria-label={`Status: ${cfg.label}`}
    >
      <Icon size={14} aria-hidden />
      {cfg.label}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLOURS = [
  'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))',
  'hsl(var(--info))',    'hsl(var(--danger))',
]
function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colour = AVATAR_COLOURS[name.charCodeAt(0) % AVATAR_COLOURS.length]
  const sz = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-14 h-14 text-xl' }[size]
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0', sz)}
      style={{ backgroundColor: colour }} aria-hidden>
      {initials}
    </div>
  )
}

// ── Appointment data type ─────────────────────────────────────────────────────
export interface AppointmentDetail {
  id: number
  patientName: string
  patientId?: string
  doctorName: string
  department: string
  date: string     // ISO
  time: string
  complaint?: string
  status: AppointmentStatus
  history?: Array<{ date: string; complaint: string; status: AppointmentStatus }>
}

// ── Sheet ─────────────────────────────────────────────────────────────────────
interface Props {
  appointment: AppointmentDetail | null
  open: boolean
  onClose: () => void
  onMarkDone?: (id: number) => void
  onReschedule?: (id: number) => void
  onCancel?: (id: number) => void
}

export function AppointmentSheet({ appointment, open, onClose, onMarkDone, onReschedule, onCancel }: Props) {
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus trap
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  if (!appointment) return null

  const formattedDate = new Date(appointment.date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <>
      {/* Backdrop (mobile full screen) */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-180',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-label="Appointment Detail"
        className={cn(
          'fixed top-0 right-0 h-full z-40 flex flex-col',
          'bg-[hsl(var(--surface-1))] border-l border-[hsl(var(--border))]',
          'w-full sm:w-[400px] md:w-[440px]',
          'transition-transform duration-180 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <span className="text-h2">Appointment Detail</span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-[var(--radius-md)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Patient */}
          <div className="flex items-center gap-4">
            <Avatar name={appointment.patientName} size="lg" />
            <div>
              <p className="text-h2">{appointment.patientName}</p>
              {appointment.patientId && (
                <p className="text-label text-[hsl(var(--muted-foreground))]">#{appointment.patientId}</p>
              )}
            </div>
          </div>

          {/* Status badge — prominent */}
          <StatusBadge status={appointment.status} />

          {/* Details */}
          <div className="card p-4 space-y-3 bg-[hsl(var(--surface-2))]">
            <InfoRow icon={<Stethoscope size={14} />} label="Doctor" value={appointment.doctorName} />
            <InfoRow icon={<Building2 size={14} />} label="Department" value={appointment.department} />
            <InfoRow icon={<Calendar size={14} />} label="Date" value={formattedDate} />
            <InfoRow icon={<Clock size={14} />} label="Time" value={appointment.time} />
            {appointment.complaint && (
              <InfoRow icon={<MessageSquare size={14} />} label="Complaint" value={appointment.complaint} />
            )}
          </div>

          {/* Past appointments */}
          {appointment.history && appointment.history.length > 0 && (
            <div>
              <h3 className="text-label text-[hsl(var(--muted-foreground))] mb-3">Past Appointments</h3>
              <div className="space-y-2">
                {appointment.history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0">
                    <div>
                      <p className="text-sm text-[hsl(var(--foreground))]">
                        {new Date(h.date).toLocaleDateString('en-GB')}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{h.complaint}</p>
                    </div>
                    <StatusBadge status={h.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="border-t border-[hsl(var(--border))] px-5 py-4 space-y-2">
          {/* Primary actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onMarkDone?.(appointment.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-md)] bg-[hsl(var(--success))] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <CheckCircle size={15} aria-hidden />
              {t.actionMarkDone}
            </button>
            <button
              onClick={() => onReschedule?.(appointment.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-md)] bg-[hsl(var(--surface-3))] text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--border))] transition-colors"
            >
              <RotateCcw size={15} aria-hidden />
              {t.actionReschedule}
            </button>
          </div>
          {/* Secondary actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onCancel?.(appointment.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-md)] bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger))] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Ban size={15} aria-hidden />
              {t.actionCancel}
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-md)] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-sm hover:bg-[hsl(var(--surface-3))] transition-colors">
              <Pencil size={15} aria-hidden />
              {t.actionEdit}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[hsl(var(--muted-foreground))] mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-label text-[hsl(var(--subtle-foreground))]">{label}</p>
        <p className="text-sm text-[hsl(var(--foreground))]">{value}</p>
      </div>
    </div>
  )
}
