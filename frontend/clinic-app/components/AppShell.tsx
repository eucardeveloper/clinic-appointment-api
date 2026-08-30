'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Stethoscope, Calendar, ClipboardList,
  Bell, HelpCircle, Search, ChevronLeft, ChevronRight,
  Menu, X, AlertTriangle, Plus, LogOut
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
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langOpen) return
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
        { href: '/admin',         label: t.navDashboard, icon: <LayoutDashboard size={18} /> },
        { href: '/admin/doctors', label: t.navDoctors,   icon: <Stethoscope size={18} /> },
      ]
    : isDoctor
    ? [
        { href: '/doctor', label: t.navDashboard,        icon: <LayoutDashboard size={18} /> },
      ]
    : [
        { href: '/patient', label: t.navDashboard,       icon: <LayoutDashboard size={18} /> },
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
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Ana navigasyon">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
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

      {/* Bottom: New Appointment + Collapse */}
      <div className={cn('px-3 pb-4 space-y-2', collapsed && 'px-0')}>
        {onNewAppointment && (
          <button
            onClick={onNewAppointment}
            className={cn(
              'w-full flex items-center gap-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-[var(--radius-md)] py-2 text-sm font-medium hover:opacity-90 transition-opacity',
              collapsed ? 'justify-center px-0 w-10 mx-auto' : 'px-3'
            )}
            title={collapsed ? t.navNewAppointment : undefined}
            aria-label={t.navNewAppointment}
          >
            <Plus size={16} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{t.navNewAppointment}</span>}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={async () => { try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }) } catch(_) {} setUser(null); router.push("/login") }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] transition-colors',
            collapsed && 'justify-center px-0 w-10 mx-auto'
          )}
          title={collapsed ? 'Çıkış' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
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
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden fade-in">

        {/* Top bar — identical across all pages */}
        <header className="flex items-center gap-3 px-4 md:px-6 h-14 flex-shrink-0 border-b border-white/5 bg-[hsl(var(--surface-1))]/70 backdrop-blur-md">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded text-[hsl(var(--muted-foreground))]"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
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
              <div className="absolute right-0 top-full mt-1 w-72 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] shadow-lg z-50 overflow-hidden">
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
              <div className="absolute right-0 top-full mt-1 w-36 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] shadow-lg z-50 overflow-hidden">
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

          {/* User avatar */}
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
            <span className="text-[hsl(var(--primary-foreground))] text-xs font-semibold">
              {user?.username?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
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
            <div className="flex gap-3">
              <a
                href="tel:112"
                className="flex-1 text-center py-2.5 rounded-[var(--radius-md)] bg-[hsl(var(--danger))] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                onClick={() => setEmergencyOpen(false)}
              >
                📞 112
              </a>
              <button
                onClick={() => setEmergencyOpen(false)}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
