'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusTimeline } from '@/components/StatusTimeline'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { getAppointments, transitionStatus } from '@/lib/api'
import { formatDateTime, cn, errorMessage } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import type { Appointment, AppointmentStatus } from '@/lib/types'

// ── Inner component — useSearchParams requires Suspense in Next.js 15 ─────────
function DoctorDashboardInner() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const qc = useQueryClient()
  const toast = useToast()
  const searchParams = useSearchParams()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tlLoading, setTlLoading]   = useState(false)
  const [activeTab, setActiveTab]   = useState<'today' | 'week' | 'all'>('today')

  // Sync tab with ?tab= query param — fires on every URL change
  useEffect(() => {
    const tab = searchParams.get('tab') as 'today' | 'week' | 'all' | null
    if (tab) setActiveTab(tab)
    else setActiveTab('today')
  }, [searchParams])

  useEffect(() => {
    if (!authLoading && user?.role !== 'ROLE_DOCTOR') router.replace('/')
  }, [user, authLoading, router])

  const STATUS_LABELS: Record<AppointmentStatus, string> = {
    PENDING: t.statusPending, CONFIRMED: t.statusConfirmed,
    COMPLETED: t.statusCompleted, CANCELLED: t.statusCancelled, NO_SHOW: t.statusNoShow,
  }

  const { data: all = [], isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['appointments'],
    queryFn: getAppointments,
    enabled: user?.role === 'ROLE_DOCTOR',
  })

  // Backend already scopes appointments to this doctor via findByDoctorUsername.
  const mine = all

  const now = new Date()
  const todayStr = now.toDateString()
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)

  const todayAppts = mine.filter(a => new Date(a.appointmentTime).toDateString() === todayStr)
  const weekAppts  = mine.filter(a => {
    const d = new Date(a.appointmentTime)
    return d >= now && d <= weekEnd
  })

  const displayed = activeTab === 'today' ? todayAppts
    : activeTab === 'week' ? weekAppts
    : mine

  const pendingCount   = mine.filter(a => a.status === 'PENDING').length
  const confirmedCount = mine.filter(a => a.status === 'CONFIRMED').length
  const todayCount     = todayAppts.length

  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AppointmentStatus }) =>
      transitionStatus(id, { status }),
    onSuccess: (updated, { id }) => {
      qc.setQueryData<Appointment[]>(['appointments'], old =>
        (old ?? []).map(a => a.id === updated.id ? updated : a))
      setSelectedId(id)
    },
    onError: (err) => toast.error(errorMessage(err, 'Status could not be updated. Please try again.')),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })

  const handleTransition = async (status: AppointmentStatus) => {
    if (!selectedId) return
    const id = selectedId
    setTlLoading(true)
    try { await transitionMut.mutateAsync({ id, status }) }
    catch { /* handled in onError */ }
    finally { setTlLoading(false) }
  }

  const selected = mine.find(a => a.id === selectedId) ?? null

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-16 w-48"/></div>
  )

  return (
    <AppShell subtitle={t.doctorPortal}>
      <div className="px-4 md:px-6 pt-6 pb-10 max-w-screen-2xl mx-auto w-full min-w-0">
      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 mb-6">
        {[
          { label: t.today, value: todayCount, icon: <Calendar className="h-5 w-5 text-blue-600"/> },
          { label: t.pending, value: pendingCount, icon: <Clock className="h-5 w-5 text-amber-600"/> },
          { label: t.confirmed, value: confirmedCount, icon: <CheckCircle className="h-5 w-5 text-green-600"/> },
        ].map(k => (
          <div key={k.label} className="rounded-[var(--radius-xl)] bg-card border border-border shadow-card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{isLoading ? '–' : k.value}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate mt-1">{k.label}</p>
            </div>
            <div className="rounded-md bg-surface-2 p-2 shrink-0">{k.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Appointment list */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          {/* Tabs */}
          <div role="tablist" className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1 w-fit max-w-full overflow-x-auto">
            {(['today', 'week', 'all'] as const).map(tab => (
              <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
                className={cn('px-4 h-8 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab ? 'bg-card shadow-card text-primary' : 'text-muted-foreground hover:text-foreground')}>
                {tab === 'today' ? t.today : tab === 'week' ? t.thisWeek : t.allAppointments}
              </button>
            ))}
          </div>

          <div className="rounded-[var(--radius-xl)] bg-card border border-border shadow-card overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-12"/>)}</div>
            ) : loadError ? (
              <div role="alert" className="px-4 py-10 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" aria-hidden />
                <p className="text-sm font-medium">{errorMessage(loadError, 'Appointments could not be loaded.')}</p>
                <button onClick={() => refetch()} className="btn btn-secondary mt-4">{t.tryAgain}</button>
              </div>
            ) : displayed.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2"/>
                <p className="text-sm text-muted-foreground">{t.noAppointments}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {displayed.map(a => (
                  <li key={a.id}>
                    <button type="button" onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
                      aria-pressed={a.id === selectedId}
                      className={cn('w-full text-left flex items-center justify-between gap-3 px-4 py-3 table-row-hover transition-colors',
                        selectedId === a.id && '!bg-blue-50')}>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.patientName}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.department} · <span className="tabular-nums">{formatDateTime(a.appointmentTime)}</span></p>
                      </div>
                      <StatusBadge status={a.status} statusLabels={STATUS_LABELS} className="flex-shrink-0 whitespace-nowrap"/>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="min-w-0">
          {selected ? (
            <div className="rounded-[var(--radius-xl)] bg-card border border-border shadow-card p-5 space-y-4 lg:sticky lg:top-4">
              <div>
                <h2 className="font-semibold">{selected.patientName}</h2>
                <p className="text-sm text-muted-foreground">{selected.department}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(selected.appointmentTime)}</p>
              </div>
              <hr className="border-border"/>
              <StatusTimeline
                current={selected.status}
                allowedTransitions={selected.allowedTransitions}
                onTransition={handleTransition}
                loading={tlLoading}
                labels={{ confirm: t.confirm, complete: t.complete, markNoShow: t.markNoShow, cancel: t.cancel2, statusLabels: STATUS_LABELS }}
              />
            </div>
          ) : (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-card p-6 text-center">
              <Calendar className="mx-auto h-6 w-6 text-slate-300 mb-2"/>
              <p className="text-sm text-muted-foreground">{t.selectAppointment}</p>
            </div>
          )}
        </div>
      </div>
      </div>{/* end container */}
    </AppShell>
  )
}

// ── Default export wraps inner component in Suspense (Next.js 15 requirement) ─
export default function DoctorDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-16 w-48"/>
      </div>
    }>
      <DoctorDashboardInner />
    </Suspense>
  )
}
