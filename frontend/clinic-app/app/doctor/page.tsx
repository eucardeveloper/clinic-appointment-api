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
import { formatDateTime, cn } from '@/lib/utils'
import type { Appointment, AppointmentStatus } from '@/lib/types'

// ── Inner component — useSearchParams requires Suspense in Next.js 15 ─────────
function DoctorDashboardInner() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const qc = useQueryClient()
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

  const { data: all = [], isLoading } = useQuery({
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })

  const handleTransition = async (status: AppointmentStatus) => {
    if (!selectedId) return
    const id = selectedId
    setTlLoading(true)
    try { await transitionMut.mutateAsync({ id, status }) }
    catch (_) { /* handled in onError */ }
    finally { setTlLoading(false) }
  }

  const selected = mine.find(a => a.id === selectedId) ?? null

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-16 w-48"/></div>
  )

  return (
    <AppShell subtitle={t.doctorPortal}>
      <div className="px-6 pt-6 pb-10 max-w-screen-xl mx-auto">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl glass-strong p-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2"><Calendar className="h-5 w-5 text-blue-500"/></div>
          <div><p className="text-xs text-muted-foreground">{t.today}</p><p className="text-2xl font-bold">{todayCount}</p></div>
        </div>
        <div className="rounded-xl glass-strong p-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2"><Clock className="h-5 w-5 text-amber-500"/></div>
          <div><p className="text-xs text-muted-foreground">{t.pending}</p><p className="text-2xl font-bold">{pendingCount}</p></div>
        </div>
        <div className="rounded-xl glass-strong p-4 flex items-center gap-3">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-2"><CheckCircle className="h-5 w-5 text-green-500"/></div>
          <div><p className="text-xs text-muted-foreground">{t.confirmed}</p><p className="text-2xl font-bold">{confirmedCount}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Appointment list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border bg-muted p-1 w-fit">
            {(['today', 'week', 'all'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === tab ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {tab === 'today' ? t.today : tab === 'week' ? t.thisWeek : t.allAppointments}
              </button>
            ))}
          </div>

          <div className="rounded-xl glass-strong overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-16"/>)}</div>
            ) : displayed.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3"/>
                <p className="text-sm text-muted-foreground">{t.noAppointments}</p>
              </div>
            ) : (
              <div className="divide-y">
                {displayed.map(a => (
                  <div key={a.id} onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
                    className={cn('flex items-center justify-between p-4 cursor-pointer table-row-hover transition-colors',
                      selectedId === a.id && 'bg-primary/5')}>
                    <div>
                      <p className="font-medium text-sm">{a.patientName}</p>
                      <p className="text-xs text-muted-foreground">{a.department} · {formatDateTime(a.appointmentTime)}</p>
                    </div>
                    <StatusBadge status={a.status} statusLabels={STATUS_LABELS}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail */}
        <div>
          {selected ? (
            <div className="rounded-xl glass-strong p-5 space-y-5 sticky top-20">
              <div>
                <h2 className="font-semibold">{selected.patientName}</h2>
                <p className="text-sm text-muted-foreground">{selected.department}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(selected.appointmentTime)}</p>
              </div>
              <hr/>
              <StatusTimeline
                current={selected.status}
                allowedTransitions={selected.allowedTransitions}
                onTransition={handleTransition}
                loading={tlLoading}
                labels={{ confirm: t.confirm, complete: t.complete, markNoShow: t.markNoShow, cancel: t.cancel2, statusLabels: STATUS_LABELS }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-card p-10 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2"/>
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
