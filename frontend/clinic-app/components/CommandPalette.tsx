'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Search, Calendar, Plus, Stethoscope, ChevronRight,
  LayoutDashboard, Settings, HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onNewAppointment?: () => void
}

type Command = {
  label: string
  hint: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

export function CommandPalette({ open, onClose, onNewAppointment }: Props) {
  const [query, setQuery]             = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const router   = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  const isAdmin   = user?.role === 'ROLE_ADMIN'
  const isDoctor  = user?.role === 'ROLE_DOCTOR'
  const isPatient = user?.role === 'ROLE_PATIENT'

  // ── Static command registry ────────────────────────────────────────────────
  const allCommands: Command[] = [
    // New Appointment — shown only when handler provided
    ...(onNewAppointment ? [{
      label: 'New Appointment',
      hint: 'Open booking form',
      icon: <Plus className="h-4 w-4" />,
      shortcut: 'N',
      action: () => { onClose(); onNewAppointment() },
    }] : []),

    // Admin navigation
    ...(isAdmin && pathname !== '/admin' ? [{
      label: 'Dashboard',
      hint: 'Appointment overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => { onClose(); router.push('/admin') },
    }] : []),
    ...(isAdmin && pathname !== '/admin/doctors' ? [{
      label: 'Doctors & Departments',
      hint: 'Manage staff',
      icon: <Stethoscope className="h-4 w-4" />,
      action: () => { onClose(); router.push('/admin/doctors') },
    }] : []),

    // Doctor navigation
    ...(isDoctor && pathname !== '/doctor' ? [{
      label: 'My Agenda',
      hint: "Today's schedule",
      icon: <Calendar className="h-4 w-4" />,
      action: () => { onClose(); router.push('/doctor') },
    }] : []),

    // Patient navigation
    ...(isPatient && pathname !== '/patient' ? [{
      label: 'My Appointments',
      hint: 'Upcoming & past',
      icon: <Calendar className="h-4 w-4" />,
      action: () => { onClose(); router.push('/patient') },
    }] : []),
  ]

  // Filter by query
  const commands = query.trim().length < 1
    ? allCommands
    : allCommands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.hint.toLowerCase().includes(query.toLowerCase())
      )

  const totalItems = commands.length

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // ── Scroll active item into view ───────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape')    { e.preventDefault(); onClose() }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, totalItems - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      commands[activeIndex]?.action()
    }
  }, [open, activeIndex, totalItems, commands, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-md rounded-xl border bg-card shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Command search"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">ESC</kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-72 overflow-y-auto py-2" role="listbox">
          {commands.length > 0 ? (
            <>
              <p className="px-4 pb-1 pt-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {query.trim() ? 'Results' : 'Quick actions'}
              </p>
              {commands.map((cmd, i) => (
                <button
                  key={cmd.label}
                  data-idx={i}
                  onClick={cmd.action}
                  role="option"
                  aria-selected={activeIndex === i}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    activeIndex === i
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  <span className={cn('shrink-0', activeIndex === i ? 'text-primary' : 'text-muted-foreground')}>
                    {cmd.icon}
                  </span>
                  <div className="flex-1 text-left leading-tight">
                    <p className="font-medium">{cmd.label}</p>
                    <p className="text-xs text-muted-foreground">{cmd.hint}</p>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground shrink-0">
                      {cmd.shortcut}
                    </kbd>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No commands match &ldquo;<span className="font-medium">{query}</span>&rdquo;
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex gap-4 text-xs text-muted-foreground bg-muted/30">
          <span><kbd className="rounded border bg-background px-1 py-0.5">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border bg-background px-1 py-0.5">↵</kbd> select</span>
          <span><kbd className="rounded border bg-background px-1 py-0.5">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
