'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  type ColumnDef, type SortingState, flexRender,
} from '@tanstack/react-table'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Calendar, Clock, CheckCircle, AlertCircle, XCircle,
  Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusTimeline } from '@/components/StatusTimeline'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { getAppointments, transitionStatus, deleteAppointment, createAppointment } from '@/lib/api'
import { formatDateTime, DEPARTMENTS, GERMAN_DOCTORS, cn } from '@/lib/utils'
import { appointmentSchema, type AppointmentFormValues } from '@/lib/schemas'
import type { Appointment, AppointmentStatus } from '@/lib/types'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const qc = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [tlLoading, setTlLoading]   = useState(false)
  const [conflictSlots, setConflictSlots] = useState<string[]>([])
  const [sorting, setSorting]       = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('')

  // Role guard
  useEffect(() => {
    if (!authLoading && user?.role !== 'ROLE_ADMIN') router.replace('/')
  }, [user, authLoading, router])

  const STATUS_LABELS: Record<AppointmentStatus, string> = {
    PENDING: t.statusPending, CONFIRMED: t.statusConfirmed,
    COMPLETED: t.statusCompleted, CANCELLED: t.statusCancelled, NO_SHOW: t.statusNoShow,
  }

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: getAppointments,
    enabled: user?.role === 'ROLE_ADMIN',
  })

  // ── React Hook Form + Zod ──────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { patientName: '', doctorName: '', department: '', appointmentTime: '' },
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AppointmentStatus }) =>
      transitionStatus(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['appointments'] })
      const prev = qc.getQueryData<Appointment[]>(['appointments'])
      qc.setQueryData<Appointment[]>(['appointments'], old =>
        (old ?? []).map(a => a.id === id ? { ...a, status } : a))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['appointments'], ctx?.prev)
    },
    onSuccess: (updated, { id }) => {
      qc.setQueryData<Appointment[]>(['appointments'], old =>
        (old ?? []).map(a => a.id === updated.id ? updated : a))
      // Keep selection on the same appointment
      setSelectedId(id)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: (_, id) => {
      qc.setQueryData<Appointment[]>(['appointments'], old => (old ?? []).filter(a => a.id !== id))
      if (selectedId === id) setSelectedId(null)
    },
  })

  const createMut = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      setShowForm(false)
      setConflictSlots([])
      reset()
    },
    onError: (err: any) => {
      if (err?.alternativeSlots) setConflictSlots(err.alternativeSlots)
    },
  })

  const onSubmit = useCallback((data: AppointmentFormValues) => {
    setConflictSlots([])
    createMut.mutate(data)
  }, [createMut])

  const handleTransition = async (status: AppointmentStatus) => {
    if (!selectedId) return
    const id = selectedId  // capture before any async re-render
    setTlLoading(true)
    try { await transitionMut.mutateAsync({ id, status }) }
    catch (_) { /* error handled in onError */ }
    finally { setTlLoading(false) }
  }

  const handleCloseForm = () => { setShowForm(false); setConflictSlots([]); reset() }

  // ── KPI ───────────────────────────────────────────────────────────────────
  const today = new Date().toDateString()
  const todayCount     = appointments.filter(a => new Date(a.appointmentTime).toDateString() === today).length
  const pendingCount   = appointments.filter(a => a.status === 'PENDING').length
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length
  const noShowCount    = appointments.filter(a => a.status === 'NO_SHOW').length
  const cancelledCount = appointments.filter(a => a.status === 'CANCELLED').length

  // ── TanStack Table column definitions ────────────────────────────────────
  const columns = useMemo<ColumnDef<Appointment>[]>(() => [
    {
      accessorKey: 'patientName',
      header: ({ column }) => <SortHeader label={t.patient} column={column} />,
      cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'doctorName',
      header: ({ column }) => <SortHeader label={t.doctor} column={column} />,
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'appointmentTime',
      header: ({ column }) => <SortHeader label={t.appointment} column={column} />,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(getValue<string>())}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: t.status,
      filterFn: (row, _id, value) => !value || row.original.status === value,
      cell: ({ getValue }) => <StatusBadge status={getValue<AppointmentStatus>()} statusLabels={STATUS_LABELS} />,
    },
    {
      id: 'actions',
      header: t.action,
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={e => { e.stopPropagation(); deleteMut.mutate(row.original.id) }}
          className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, deleteMut])

  // Filter by status (custom column filter)
  const data = useMemo(
    () => statusFilter ? appointments.filter(a => a.status === statusFilter) : appointments,
    [appointments, statusFilter],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const selected = appointments.find(a => a.id === selectedId) ?? null

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Skeleton className="h-16 w-48" />
    </div>
  )

  return (
    <AppShell subtitle={t.appSubtitle} onNewAppointment={() => setShowForm(true)}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-8">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : (<>
            <KpiCard icon={<Calendar className="h-5 w-5 text-blue-400" />}    label={t.today}     value={todayCount}    glow="glow-blue" />
            <KpiCard icon={<Clock className="h-5 w-5 text-amber-400" />}      label={t.pending}   value={pendingCount}  glow="glow-amber" />
            <KpiCard icon={<CheckCircle className="h-5 w-5 text-emerald-400" />} label={t.completed} value={completedCount} glow="glow-green" />
            <KpiCard icon={<AlertCircle className="h-5 w-5 text-gray-400" />}  label={t.noShow}    value={noShowCount} />
            <KpiCard icon={<XCircle className="h-5 w-5 text-red-400" />}      label={t.cancelled} value={cancelledCount}  glow="glow-red" />
          </>)
        }
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Left: TanStack Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder={t.searchDoctor}
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-48"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t.allStatuses}</option>
                {(Object.keys(STATUS_LABELS) as AppointmentStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> {t.newAppointment}
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden glass-strong">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/5 bg-white/5">
                      {table.getHeaderGroups().map(hg => (
                        <tr key={hg.id}>
                          {hg.headers.map(header => (
                            <th key={header.id}
                              className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y">
                      {table.getRowModel().rows.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                            {t.noAppointments}
                          </td>
                        </tr>
                      ) : table.getRowModel().rows.map(row => (
                        <tr key={row.id}
                          data-row-id={row.original.id}
                          onClick={() => setSelectedId(row.original.id === selectedId ? null : row.original.id)}
                          className={cn('cursor-pointer table-row-hover transition-colors',
                            selectedId === row.original.id && 'bg-primary/5 ring-1 ring-inset ring-primary/20'
                          )}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {t.page ?? 'Page'} {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
                    {' '}· {table.getFilteredRowModel().rows.length} {t.total ?? 'total'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                      className="rounded p-1 hover:bg-muted disabled:opacity-40 transition-colors" aria-label="Previous page">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                      className="rounded p-1 hover:bg-muted disabled:opacity-40 transition-colors" aria-label="Next page">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div>
          {selected ? (
            <div className="rounded-xl glass-strong p-5 space-y-5 sticky top-20 slide-in-right">
              <div>
                <h2 className="font-semibold text-base">{selected.patientName}</h2>
                <p className="text-sm text-muted-foreground">{selected.doctorName} · {selected.department}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(selected.appointmentTime)}</p>
              </div>
              <hr className="border-border" />
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.statusHistory}</p>
                <StatusTimeline
                  current={selected.status}
                  allowedTransitions={selected.allowedTransitions}
                  onTransition={handleTransition}
                  loading={tlLoading}
                  labels={{
                    confirm: t.confirm, complete: t.complete,
                    markNoShow: t.markNoShow, cancel: t.cancel2,
                    statusLabels: STATUS_LABELS,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed glass p-10 text-center opacity-70">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">{t.selectAppointment}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── New Appointment Modal (React Hook Form + Zod) ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={handleCloseForm}>
          <div className="w-full max-w-md rounded-xl glass-strong p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h2 className="mb-5 font-semibold text-lg">{t.createAppointmentTitle}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Patient Name */}
              <FormField label={t.labelPatient} error={errors.patientName?.message}>
                <input
                  {...register('patientName')}
                  placeholder="Thomas Müller"
                  className={cn(
                    'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                    errors.patientName && 'border-red-400 focus:ring-red-400'
                  )}
                />
              </FormField>

              {/* Doctor */}
              <FormField label={t.labelDoctor} error={errors.doctorName?.message}>
                <Controller name="doctorName" control={control} render={({ field }) => (
                  <select {...field}
                    className={cn(
                      'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                      errors.doctorName && 'border-red-400 focus:ring-red-400'
                    )}>
                    <option value="">{t.selectDoctor}</option>
                    {GERMAN_DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )} />
              </FormField>

              {/* Department */}
              <FormField label={t.labelDepartment} error={errors.department?.message}>
                <Controller name="department" control={control} render={({ field }) => (
                  <select {...field}
                    className={cn(
                      'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                      errors.department && 'border-red-400 focus:ring-red-400'
                    )}>
                    <option value="">{t.selectDepartment}</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )} />
              </FormField>

              {/* Date & Time */}
              <FormField label={t.labelDateTime} error={errors.appointmentTime?.message}>
                <input
                  type="datetime-local"
                  {...register('appointmentTime')}
                  className={cn(
                    'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                    errors.appointmentTime && 'border-red-400 focus:ring-red-400'
                  )}
                />
              </FormField>

              {/* 409 Conflict UX */}
              {conflictSlots.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ {t.slotTaken}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">{t.alternatives}:</p>
                  <div className="flex flex-wrap gap-2">
                    {conflictSlots.map(slot => (
                      <button key={slot} type="button"
                        onClick={() => { setValue('appointmentTime', slot.slice(0, 16)); setConflictSlots([]) }}
                        className="rounded-md bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors">
                        {formatDateTime(slot)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {createMut.isError && conflictSlots.length === 0 && (
                <p className="text-xs text-red-500">
                  {(createMut.error as any)?.detail ?? t.errorCreating}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseForm}
                  className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors">
                  {t.cancel}
                </button>
                <button type="submit" disabled={isSubmitting || createMut.isPending}
                  className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {(isSubmitting || createMut.isPending) ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, glow = '' }: { icon: React.ReactNode; label: string; value: number; glow?: string }) {
  return (
    <div className={`kpi-card glass-strong ${glow}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="rounded-xl bg-white/5 p-2.5 shrink-0">{icon}</div>
        <span className="text-3xl font-bold tracking-tight">{value}</span>
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  )
}

function SortHeader({ label, column }: { label: string; column: any }) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sorted === 'asc'  ? <ArrowUp className="h-3 w-3" /> :
       sorted === 'desc' ? <ArrowDown className="h-3 w-3" /> :
       <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  )
}
