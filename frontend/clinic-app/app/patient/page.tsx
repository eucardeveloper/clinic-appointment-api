'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { getAppointments, createAppointment, transitionStatus, getDoctors, getDepartments } from '@/lib/api'
import { formatDateTime, cn } from '@/lib/utils'
import type { Appointment, AppointmentStatus, AppointmentRequest } from '@/lib/types'

type WizardStep = 'department' | 'doctor' | 'datetime' | 'confirm'

// ── Inner component — useSearchParams requires Suspense in Next.js 15 ─────────
function PatientDashboardInner() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const qc = useQueryClient()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab]   = useState<'upcoming' | 'past'>('upcoming')
  const [showWizard, setShowWizard] = useState(false)
  const [step, setStep]             = useState<WizardStep>('department')
  const [form, setForm]             = useState<AppointmentRequest>({
    patientName: '', patientUsername: '', doctorName: '', appointmentTime: '', department: '',
  })
  const [conflictSlots, setConflictSlots] = useState<string[]>([])

  // Auto-open wizard when ?new=1 is in URL (sidebar shortcut) — reacts to URL changes
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowWizard(true)
      setStep('department')
    }
  }, [searchParams])

  useEffect(() => {
    if (!authLoading && user?.role !== 'ROLE_PATIENT') router.replace('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user?.username) setForm(f => ({
      ...f,
      patientName: user.displayName ?? user.username,
      patientUsername: user.username,
    }))
  }, [user])

  const STATUS_LABELS: Record<AppointmentStatus, string> = {
    PENDING: t.statusPending, CONFIRMED: t.statusConfirmed,
    COMPLETED: t.statusCompleted, CANCELLED: t.statusCancelled, NO_SHOW: t.statusNoShow,
  }

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: getAppointments,
    enabled: user?.role === 'ROLE_PATIENT',
  })

  const { data: doctorList = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: getDoctors,
    refetchOnMount: 'always',
  })
  const { data: departmentList = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchOnMount: 'always',
  })
  const activeDoctorNames = doctorList.filter(d => d.active).map(d => d.name)
  const departmentNames   = departmentList.map(d => d.name)

  // Backend already scopes to this patient via findByPatientUsername/findByPatientName
  const mine = all
  const now      = new Date()
  const upcoming = mine.filter(a => new Date(a.appointmentTime) >= now && a.status !== 'CANCELLED')
  const past     = mine.filter(a => new Date(a.appointmentTime) < now || a.status === 'CANCELLED')
  const displayed = activeTab === 'upcoming' ? upcoming : past

  const createMut = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      setShowWizard(false); setStep('department'); setConflictSlots([])
      setForm(f => ({ ...f, doctorName: '', appointmentTime: '', department: '' }))
    },
    onError: (err: any) => {
      if (err?.alternativeSlots) setConflictSlots(err.alternativeSlots)
    },
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) => transitionStatus(id, { status: 'CANCELLED' }),
    onSuccess: updated => {
      qc.setQueryData<Appointment[]>(['appointments'], old =>
        (old ?? []).map(a => a.id === updated.id ? updated : a))
    },
  })

  const steps: WizardStep[] = ['department', 'doctor', 'datetime', 'confirm']
  const stepIndex = steps.indexOf(step)
  const canNext = step === 'department' ? !!form.department
    : step === 'doctor' ? !!form.doctorName
    : step === 'datetime' ? !!form.appointmentTime
    : true

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-16 w-48"/></div>
  )

  return (
    <AppShell subtitle={t.patientPortal}>
      <div className="px-6 pt-6 pb-10 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">My Appointments</h2>
        <button onClick={() => { setShowWizard(true); setStep('department') }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Calendar className="h-4 w-4"/> {t.newAppointment}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1 w-fit mb-6">
        {(['upcoming', 'past'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {tab === 'upcoming' ? t.upcoming : t.past}
            <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-xs">
              {tab === 'upcoming' ? upcoming.length : past.length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-20 rounded-xl"/>)}</div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3"/>
          <p className="text-sm text-muted-foreground">{t.noAppointments}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(a => (
            <div key={a.id} className="rounded-xl glass-strong p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-muted p-2"><Calendar className="h-5 w-5 text-muted-foreground"/></div>
                <div>
                  <p className="font-medium text-sm">{a.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{a.department} · {formatDateTime(a.appointmentTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} statusLabels={STATUS_LABELS}/>
                {a.allowedTransitions.includes('CANCELLED') && (
                  <button onClick={() => cancelMut.mutate(a.id)}
                    className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded px-2 py-1 transition-colors">
                    {t.cancel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      </div>{/* end container */}

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
          <div className="w-full max-w-md rounded-xl glass-strong shadow-xl overflow-hidden">
            <div className="flex border-b" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1} aria-label="Booking progress">
              {steps.map((s, i) => (
                <div key={s} className={cn('flex-1 h-1 transition-colors',
                  i <= stepIndex ? 'bg-primary' : 'bg-muted')}/>
              ))}
            </div>
            <div className="p-6">
              <h2 id="wizard-title" className="text-lg font-semibold mb-1">{t.createAppointmentTitle}</h2>
              <p className="text-xs text-muted-foreground mb-5">Step {stepIndex + 1} / {steps.length}</p>

              {step === 'department' && (
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Select department">
                  {departmentNames.map(d => (
                    <button key={d} onClick={() => setForm(f => ({...f, department: d}))}
                      className={cn('rounded-lg border p-3 text-sm text-left transition-colors',
                        form.department === d ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted')}>
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {step === 'doctor' && (
                <div className="space-y-2" role="group" aria-label="Select doctor">
                  {activeDoctorNames.map(d => (
                    <button key={d} onClick={() => setForm(f => ({...f, doctorName: d}))}
                      className={cn('w-full rounded-lg border p-3 text-sm text-left flex items-center gap-3 transition-colors',
                        form.doctorName === d ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted')}>
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {d.replace('dr.','').charAt(0).toUpperCase()}
                      </div>
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {step === 'datetime' && (
                <div className="space-y-4">
                  <input type="datetime-local" id="wizard-datetime" aria-label="Appointment date and time" aria-required="true" value={form.appointmentTime}
                    onChange={e => { setConflictSlots([]); setForm(f => ({...f, appointmentTime: e.target.value})) }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
                  {conflictSlots.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">⚠️ This slot is taken</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">Nearest available slots:</p>
                      <div className="flex flex-wrap gap-2">
                        {conflictSlots.map(slot => (
                          <button key={slot} onClick={() => { setForm(f => ({...f, appointmentTime: slot.slice(0,16)})); setConflictSlots([]) }}
                            className="rounded-md bg-amber-100 dark:bg-amber-900/50 border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors">
                            {formatDateTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 'confirm' && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3 text-sm">
                  {[
                    [t.labelPatient, form.patientName],
                    [t.labelDoctor, form.doctorName],
                    [t.labelDepartment, form.department],
                    [t.labelDateTime, formatDateTime(form.appointmentTime)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={step === 'department' ? () => setShowWizard(false) : () => setStep(steps[stepIndex-1])}
                  className="flex items-center gap-1 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors">
                  <ChevronLeft className="h-4 w-4"/>
                  {step === 'department' ? t.cancel : t.back}
                </button>
                {step === 'confirm' ? (
                  <button disabled={createMut.isPending}
                    onClick={() => { setConflictSlots([]); createMut.mutate(form) }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    <CheckCircle className="h-4 w-4"/>
                    {createMut.isPending ? t.saving : t.confirmBooking}
                  </button>
                ) : (
                  <button disabled={!canNext}
                    onClick={() => setStep(steps[stepIndex+1])}
                    className="flex-1 flex items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    Next <ChevronRight className="h-4 w-4"/>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

// ── Default export wraps inner component in Suspense (Next.js 15 requirement) ─
export default function PatientDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-16 w-48"/>
      </div>
    }>
      <PatientDashboardInner />
    </Suspense>
  )
}
