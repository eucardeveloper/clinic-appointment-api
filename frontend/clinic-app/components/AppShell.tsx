'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Stethoscope,
  Bell, HelpCircle, Search, ChevronLeft, ChevronRight,
  Menu, X, AlertTriangle, Plus, LogOut, Globe,
  CalendarDays, ClipboardList, Users, UserCog, Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'
import { LANGUAGE_LABELS, type Language } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import CommandPalette from './CommandPalette'

interface Props {
  children: React.ReactNode
  title?: string
  subtitle?: string
  onNewAppointment?: () => void
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

export default function AppShell({ children, title, subtitle, onNewAppointment }: Props) {
  const { t, lang, setLang } = useI18n()
  const { user, setUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [notifCount] = useState(3) // TODO: real notifications
  const [langOpen, setLangOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langOpen && !userMenuOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-lang-menu]')) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [langOpen])

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const isAdmin  = user?.role === 'ROLE_ADMIN'
  const isDoctor = user?.role === 'ROLE_DOCTOR'

  const navItems: NavItem[] = isAdmin
    ? [
        { href: '/admin',         label: t.navDashboard,    icon: <LayoutDashboard size={18} /> },
        { href: '/admin/doctors', label: t.navDoctors,      icon: <Stethoscope size={18} /> },
        { href: '/admin/users',   label: t.navUsers,        icon: <Users size={18} /> },
      ]
    : isDoctor
    ? [
        { href: '/doctor',           label: t.navMyAppointments, icon: <CalendarDays size={18} /> },
        { href: '/doctor?tab=today', label: t.navAgenda,         icon: <Clock size={18} /> },
        { href: '/doctor?tab=all',   label: t.navSchedule,       icon: <ClipboardList size={18} /> },
      ]
    : [
        { href: '/patient',       label: t.navMyAppointments, icon: <CalendarDays size={18} /> },
        { href: '/patient?new=1', label: t.navNewAppointment, icon: <Plus size={18} /> },
      ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-[hsl(var(--border))]',
        collapsed && 'justify-center px-0'
      )}>
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
          <span className="text-[hsl(var(--primary-foreground))] font-bold text-sm">L</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-semibold text-[hsl(var(--foreground))] text-sm truncate">{t.appName}</p>
            <p className="text-[hsl(var(--subtle-foreground))] text-xs truncate">{t.appSubtitle}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {navItems.map(item => {
          const hrefPath = item.href.split('?')[0]
          const active = pathname === hrefPath || pathname.startsWith(hrefPath + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors duration-120',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]',
                active
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))]',
                collapsed && 'justify-center px-0 w-10 mx-auto'
              )}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Logout + Collapse */}
      <div className={cn('px-3 pb-4 space-y-2', collapsed && 'px-0')}>

        {/* Logout */}
        <button
          onClick={async () => { try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }) } catch(_) {} setUser(null); window.location.replace('/login') }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] transition-colors',
            collapsed && 'justify-center px-0 w-10 mx-auto'
          )}
          title={collapsed ? t.logout : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>{t.logout}</span>}
        </button>

        {/* Collapse toggle — always visible */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="w-full flex items-center justify-center py-2 rounded-[var(--radius-md)] text-[hsl(var(--subtle-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--muted-foreground))] transition-colors"
          aria-label={collapsed ? t.navExpand : t.navCollapse}
          title={collapsed ? t.navExpand : t.navCollapse}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">

      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex flex-col flex-shrink-0 border-r border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(226_35%_14%)] to-[hsl(220_25%_10%)] border-r border-[hsl(226_20%_20%)] transition-all duration-200',
          collapsed ? 'w-[60px]' : 'w-56'
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="relative w-56 flex-shrink-0 bg-[hsl(var(--surface-1))] flex flex-col z-50 border-r border-[hsl(var(--border))]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Help Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setHelpOpen(false)}>
          <div className="glass-strong rounded-[var(--radius-lg)] shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
                <HelpCircle size={18} className="text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h2 className="font-bold text-[hsl(var(--foreground))]">Help & Shortcuts</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Keyboard shortcuts and tips</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div className="rounded-lg bg-[hsl(var(--surface-2))] p-3">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1.5 text-sm">
                  {[
                    ['Ctrl + K', 'Open command palette'],
                    ['Ctrl + N', 'New appointment'],
                    ['Escape', 'Close modal / panel'],
                    ['↑ / ↓', 'Navigate list'],
                    ['Enter', 'Open appointment detail'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[hsl(var(--muted-foreground))]">{desc}</span>
                      <kbd className="px-2 py-0.5 rounded bg-[hsl(var(--surface-3))] border border-[hsl(var(--border))] text-xs font-mono text-[hsl(var(--foreground))]">{key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-[hsl(var(--surface-2))] p-3">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Quick Tips</p>
                <ul className="space-y-1 text-sm text-[hsl(var(--muted-foreground))]">
                  <li>• Click a row to open the detail panel</li>
                  <li>• Click a KPI card to filter appointments</li>
                  <li>• Use ✓ and ✗ buttons on PENDING rows for quick actions</li>
                  <li>• Excel export only includes the currently filtered appointments</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              className="w-full py-2.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden fade-in">

        {/* Top bar — identical across all pages */}
        <header className="relative z-[100] flex items-center gap-3 px-4 md:px-6 h-14 flex-shrink-0 border-b border-white/5 bg-[hsl(var(--surface-1))]/70 backdrop-blur-md">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded text-[hsl(var(--muted-foreground))]"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Search / ⌘K */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))] text-[hsl(var(--subtle-foreground))] text-sm hover:border-[hsl(var(--border-strong))] transition-colors w-48 md:w-64"
            aria-label={t.navSearch}
          >
            <Search size={14} />
            <span className="flex-1 text-left text-xs">{t.navSearch}</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--surface-3))] text-[hsl(var(--subtle-foreground))] font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Page title (mobile only) */}
          {title && (
            <span className="md:hidden flex-1 font-semibold text-sm truncate text-[hsl(var(--foreground))]">
              {title}
            </span>
          )}

          <div className="flex-1 hidden md:block" />

          {/* Emergency button */}
          <button
            onClick={() => setEmergencyOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger))] text-sm font-medium hover:bg-[hsl(var(--danger)/0.2)] transition-colors"
            aria-label={t.navEmergency}
          >
            <AlertTriangle size={14} />
            <span>{t.navEmergency}</span>
          </button>

          {/* Help */}
          <button
            onClick={() => setHelpOpen(true)}
            className="p-1.5 rounded-[var(--radius-md)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label={t.navHelp}
          >
            <HelpCircle size={18} />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative p-1.5 rounded-[var(--radius-md)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] transition-colors"
              aria-label={`${t.navNotifications} (${notifCount})`}
            >
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[hsl(var(--danger))]" aria-hidden />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] shadow-2xl z-[9999] overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{t.navNotifications}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{notifCount} new</span>
                </div>
                {[
                  { msg: 'New appointment: Helga Richter → Dr. Emily Carter', time: '5m ago' },
                  { msg: 'Appointment confirmed: patient1 → Dr. James Wilson', time: '1h ago' },
                  { msg: 'No-show recorded: Gerhard Schäfer', time: '2h ago' },
                ].map((n, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-[hsl(var(--surface-3))] border-b border-[hsl(var(--border)/0.5)] last:border-0 cursor-pointer">
                    <p className="text-xs text-[hsl(var(--foreground))]">{n.msg}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Language selector */}
          <div className="relative" data-lang-menu>
            <button
              onClick={() => setLangOpen(v => !v)}
              className="p-1.5 rounded-[var(--radius-md)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] transition-colors flex items-center gap-1"
              aria-label="Language / Sprache / Dil"
              title="Language"
            >
              <Globe size={18} />
              <span className="hidden md:inline text-xs font-medium uppercase">{lang}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] shadow-2xl z-[9999] overflow-hidden">
                {(Object.keys(LANGUAGE_LABELS) as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setLangOpen(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--surface-3))] transition-colors',
                      lang === l ? 'text-[hsl(var(--primary))] font-medium' : 'text-[hsl(var(--foreground))]'
                    )}
                  >
                    {LANGUAGE_LABELS[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User avatar + logout dropdown */}
          <div className="relative" data-user-menu>
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
              title={user?.username ?? 'User'}
            >
              <span className="text-[hsl(var(--primary-foreground))] text-xs font-semibold">
                {user?.username?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] shadow-2xl z-[9999] overflow-hidden">
                <div className="px-3 py-2 border-b border-[hsl(var(--border)/0.5)]">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))]">{user?.username}</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] capitalize">{user?.role?.toLowerCase()}</p>
                </div>
                <button
                  onClick={async () => { setUserMenuOpen(false); try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch(_) {} setUser(null); window.location.replace('/login') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-3))] transition-colors"
                >
                  <LogOut size={14} />
                  {t.logout}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {/* Page header — consistent across all screens */}
          {title && (
            <div className="px-6 pt-6 pb-2">
              <h1 className="text-h1 text-[hsl(var(--foreground))]">{title}</h1>
              {subtitle && (
                <p className="text-body text-[hsl(var(--muted-foreground))] mt-1">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNewAppointment={onNewAppointment} />

      {/* Emergency Modal */}
      {emergencyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEmergencyOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-[hsl(var(--surface-1))] border border-[hsl(var(--danger)/0.4)] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--danger-soft))] flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-[hsl(var(--danger))]" />
              </div>
              <div>
                <h2 className="font-bold text-[hsl(var(--foreground))]">{t.navEmergency}</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Emergency Services</p>
              </div>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">Call emergency services immediately?</p>
            <div className="rounded-xl bg-[hsl(var(--danger))] p-4 mb-4 text-center shadow-lg">
              <p className="text-5xl font-black text-white tracking-widest drop-shadow">📞 112</p>
              <p className="text-xs text-white/80 mt-1 font-medium">European Emergency Number</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard?.writeText('112'); setEmergencyOpen(false) }}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] bg-[hsl(var(--danger))] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Copy Number
              </button>
              <button
                onClick={() => setEmergencyOpen(false)}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
