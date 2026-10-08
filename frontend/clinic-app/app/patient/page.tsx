'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, ChevronRight, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { getAppointments, createAppointment, transitionStatus, getDoctors, getDepartments } from '@/lib/api'
import { formatDateTime, cn, errorMessage } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import type { Appointment, AppointmentStatus, AppointmentRequest } from '@/lib/types'

type WizardStep = 'department' | 'doctor' | 'datetime' | 'confirm'

// ── Inner component — useSearchParams requires Suspense in Next.js 15 ─────────
function PatientDashboardInner() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const qc = useQueryClient()
  const toast = useToast()
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

  const { data: all = [], isLoading, error: loadError, refetch } = useQuery({
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
    onError: (err: Error & { alternativeSlots?: string[] }) => {
      if (err?.alternativeSlots) setConflictSlots(err.alternativeSlots)
    },
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) => transitionStatus(id, { status: 'CANCELLED' }),
    onSuccess: updated => {
      qc.setQueryData<Appointment[]>(['appointments'], old =>
        (old ?? []).map(a => a.id === updated.id ? updated : a))
      toast.success('Appointment cancelled')
    },
    onError: (err) => toast.error(errorMessage(err, 'Appointment could not be cancelled.')),
  })

  const steps: WizardStep[] = ['department', 'doctor', 'datetime', 'confirm']
  const stepIndex = steps.indexOf(step)
  const timeInPast = !!form.appointmentTime && new Date(form.appointmentTime).getTime() <= Date.now()
  const canNext = step === 'department' ? !!form.department
    : step === 'doctor' ? !!form.doctorName
    : step === 'datetime' ? !!form.appointmentTime && !timeInPast
    : true

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-16 w-48"/></div>
  )

  return (
    <AppShell subtitle={t.patientPortal}>
      <div className="px-4 md:px-6 pt-6 pb-10 max-w-screen-2xl mx-auto w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-h1">{t.navMyAppointments}</h2>
        <button onClick={() => { setShowWizard(true); setStep('department') }}
          className="btn btn-primary">
          <Calendar className="h-4 w-4"/> {t.newAppointment}
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1 w-fit max-w-full mb-5">
        {(['upcoming', 'past'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
            className={cn('px-4 h-8 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === tab ? 'bg-card shadow-card text-primary' : 'text-muted-foreground hover:text-foreground')}>
            {tab === 'upcoming' ? t.upcoming : t.past}
            <span className="ml-1.5 rounded-full bg-surface-3 px-1.5 py-0.5 text-xs tabular-nums">
              {tab === 'upcoming' ? upcoming.length : past.length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-[68px] rounded-[var(--radius-xl)]"/>)}</div>
      ) : loadError ? (
        <div role="alert" className="rounded-[var(--radius-xl)] border border-border bg-card shadow-card px-4 py-10 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" aria-hidden />
          <p className="text-sm font-medium">{errorMessage(loadError, 'Appointments could not be loaded.')}</p>
          <button onClick={() => refetch()} className="btn btn-secondary mt-4">{t.tryAgain}</button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-card px-4 py-10 text-center">
          <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2"/>
          <p className="text-sm text-muted-foreground">{t.noAppointments}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(a => (
            <div key={a.id} className="rounded-[var(--radius-xl)] bg-card border border-border shadow-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-md bg-blue-50 p-2 shrink-0"><Calendar className="h-5 w-5 text-blue-600"/></div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{a.doctorName}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.department} · <span className="tabular-nums">{formatDateTime(a.appointmentTime)}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} statusLabels={STATUS_LABELS} className="whitespace-nowrap"/>
                {a.allowedTransitions.includes('CANCELLED') && (
                  <button onClick={() => cancelMut.mutate(a.id)} disabled={cancelMut.isPending}
                    className="text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-md px-3 h-8 transition-colors disabled:opacity-50">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] bg-card border border-border shadow-popover">
            <div className="flex border-b border-border" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1} aria-label="Booking progress">
              {steps.map((s, i) => (
                <div key={s} className={cn('flex-1 h-1 transition-colors',
                  i <= stepIndex ? 'bg-primary' : 'bg-surface-3')}/>
              ))}
            </div>
            <div className="p-6">
              <h2 id="wizard-title" className="text-lg font-semibold mb-1">{t.createAppointmentTitle}</h2>
              <p className="text-xs text-muted-foreground mb-5">Step {stepIndex + 1} / {steps.length}</p>

              {step === 'department' && (
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Select department">
                  {departmentNames.map(d => (
                    <button key={d} onClick={() => setForm(f => ({...f, department: d}))}
                      className={cn('rounded-md border p-3 text-sm text-left transition-colors',
                        form.department === d ? 'border-primary bg-blue-50 text-blue-800 font-medium' : 'border-border-strong hover:bg-surface-2')}>
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {step === 'doctor' && (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto" role="group" aria-label="Select doctor">
                  {activeDoctorNames.map(d => (
                    <button key={d} onClick={() => setForm(f => ({...f, doctorName: d}))}
                      className={cn('w-full rounded-md border p-3 text-sm text-left flex items-center gap-3 transition-colors',
                        form.doctorName === d ? 'border-primary bg-blue-50 text-blue-800 font-medium' : 'border-border-strong hover:bg-surface-2')}>
                      <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-xs font-semibold shrink-0">
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
                    aria-invalid={timeInPast} className="field-input"/>
                  {timeInPast && <p role="alert" className="field-error">Appointment must be in the future</p>}
                  {conflictSlots.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-medium text-amber-800 mb-2">This slot is taken</p>
                      <p className="text-xs text-amber-700 mb-2">Nearest available slots:</p>
                      <div className="flex flex-wrap gap-2">
                        {conflictSlots.map(slot => (
                          <button key={slot} onClick={() => { setForm(f => ({...f, appointmentTime: slot.slice(0,16)})); setConflictSlots([]) }}
                            className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors">
                            {formatDateTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 'confirm' && (
                <div className="rounded-md border border-border bg-surface-2 p-4 space-y-3 text-sm">
                  {[
                    [t.labelPatient, form.patientName],
                    [t.labelDoctor, form.doctorName],
                    [t.labelDepartment, form.department],
                    [t.labelDateTime, formatDateTime(form.appointmentTime)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-right break-words min-w-0">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {createMut.isError && conflictSlots.length === 0 && (
                <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage(createMut.error, t.errorCreating)}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={step === 'department' ? () => setShowWizard(false) : () => setStep(steps[stepIndex-1])}
                  className="btn btn-secondary">
                  <ChevronLeft className="h-4 w-4"/>
                  {step === 'department' ? t.cancel : t.back}
                </button>
                {step === 'confirm' ? (
                  <button disabled={createMut.isPending}
                    onClick={() => { setConflictSlots([]); createMut.mutate(form) }}
                    className="btn btn-primary flex-1">
                    <CheckCircle className="h-4 w-4"/>
                    {createMut.isPending ? t.saving : t.confirmBooking}
                  </button>
                ) : (
                  <button disabled={!canNext}
                    onClick={() => setStep(steps[stepIndex+1])}
                    className="btn btn-primary flex-1">
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
