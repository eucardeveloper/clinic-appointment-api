'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  type ColumnDef, type Column, type SortingState, flexRender,
} from '@tanstack/react-table'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Calendar, Clock, CheckCircle, AlertCircle, XCircle,
  Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Check, X, Download,
  LayoutList, CalendarDays, Bell,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/components/Toast'
import { StatusTimeline } from '@/components/StatusTimeline'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { getAppointments, transitionStatus, deleteAppointment, createAppointment, getUsers, getDoctors, getDepartments } from '@/lib/api'
import { formatDateTime, cn, errorMessage } from '@/lib/utils'
import { appointmentSchema, type AppointmentFormValues } from '@/lib/schemas'
import type { Appointment, AppointmentStatus } from '@/lib/types'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const qc = useQueryClient()
  const toast = useToast()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [tlLoading, setTlLoading]   = useState(false)
  const [conflictSlots, setConflictSlots] = useState<string[]>([])
  const [sorting, setSorting]       = useState<SortingState>([{ id: 'appointmentTime', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | '' | '__today__'>('')
  const [viewMode, setViewMode]     = useState<'list' | 'calendar'>('list')
  const [reminderSent, setReminderSent] = useState(false)

  // Role guard
  useEffect(() => {
    if (!authLoading && user?.role !== 'ROLE_ADMIN') router.replace('/')
  }, [user, authLoading, router])

  const STATUS_LABELS: Record<AppointmentStatus, string> = {
    PENDING: t.statusPending, CONFIRMED: t.statusConfirmed,
    COMPLETED: t.statusCompleted, CANCELLED: t.statusCancelled, NO_SHOW: t.statusNoShow,
  }

  const { data: appointments = [], isLoading, error: apptError, refetch: refetchAppts } = useQuery({
    queryKey: ['appointments'],
    queryFn: getAppointments,
    enabled: user?.role === 'ROLE_ADMIN',
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers,
    enabled: user?.role === 'ROLE_ADMIN',
  })
  const patients = allUsers.filter(u => u.role === 'ROLE_PATIENT')

  const { data: doctorList = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: getDoctors,
    enabled: user?.role === 'ROLE_ADMIN',
    refetchOnMount: 'always',
  })
  const { data: departmentList = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: user?.role === 'ROLE_ADMIN',
    refetchOnMount: 'always',
  })
  const activeDoctorNames = doctorList.filter(d => d.active).map(d => d.name)
  const departmentNames = departmentList.map(d => d.name)

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
    mode: 'onTouched',
    defaultValues: { patientName: '', patientUsername: '', doctorName: '', department: '', appointmentTime: '' },
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
    onError: (err, _vars, ctx) => {
      qc.setQueryData(['appointments'], ctx?.prev)
      toast.error(errorMessage(err, 'Status could not be updated. Please try again.'))
    },
    onSuccess: (updated, { id }) => {
      qc.setQueryData<Appointment[]>(['appointments'], old =>
        (old ?? []).map(a => a.id === updated.id ? updated : a))
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
      toast.success('Appointment deleted')
    },
    onError: (err) => toast.error(errorMessage(err, 'Appointment could not be deleted.')),
  })

  const createMut = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      setShowForm(false)
      setConflictSlots([])
      reset()
    },
    onError: (err: Error & { alternativeSlots?: string[] }) => {
      if (err?.alternativeSlots) setConflictSlots(err.alternativeSlots)
    },
  })

  const onSubmit = useCallback((data: AppointmentFormValues) => {
    setConflictSlots([])
    createMut.mutate(data)
  }, [createMut])

  const handleTransition = async (status: AppointmentStatus) => {
    if (!selectedId) return
    const id = selectedId
    setTlLoading(true)
    try { await transitionMut.mutateAsync({ id, status }) }
    catch { /* ignore */ }
    finally { setTlLoading(false) }
  }

  const handleCloseForm = () => { setShowForm(false); setConflictSlots([]); reset() }

  // ── Quick approve / reject from row ───────────────────────────────────────
  const handleQuickApprove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    transitionMut.mutate({ id, status: 'CONFIRMED' })
  }
  const handleQuickReject = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    transitionMut.mutate({ id, status: 'CANCELLED' })
  }

  // ── Export XLSX ───────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    const XLSX = await import('xlsx')
    const rows = filteredData
    const wsData = [
      ['ID', 'Patient', 'Doctor', 'Department', 'Date & Time', 'Status'],
      ...rows.map(a => [
        a.id,
        a.patientName,
        a.doctorName,
        a.department,
        formatDateTime(a.appointmentTime),
        a.status,
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    // Column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Appointments')
    const filename = `randevular_${new Date().toISOString().slice(0,10)}.xlsx`
    XLSX.writeFile(wb, filename)
  }

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
      cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'doctorName',
      header: ({ column }) => <SortHeader label={t.doctor} column={column} />,
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'department',
      header: t.labelDepartment,
      cell: ({ getValue }) => (
        <span className="inline-block text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 font-medium border border-blue-200 whitespace-nowrap">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'appointmentTime',
      header: ({ column }) => <SortHeader label={t.appointment} column={column} />,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground whitespace-nowrap tabular-nums">{formatDateTime(getValue<string>())}</span>
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
      cell: ({ row }) => {
        const isPending = row.original.status === 'PENDING'
        return (
          <div className="flex items-center justify-end gap-1">
            {isPending && (
              <>
                <button
                  onClick={e => handleQuickApprove(e, row.original.id)}
                  className="rounded-md p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                  aria-label={t.tooltipConfirm}
                  title={t.tooltipConfirm}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={e => handleQuickReject(e, row.original.id)}
                  className="rounded-md p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                  aria-label={t.tooltipReject}
                  title={t.tooltipReject}
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); deleteMut.mutate(row.original.id) }}
              className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label={t.tooltipDelete}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, deleteMut, transitionMut])

  // Filter by status (or today)
  const filteredData = useMemo(() => {
    if (!statusFilter) return appointments
    if (statusFilter === '__today__') {
      const todayStr = new Date().toDateString()
      return appointments.filter(a => new Date(a.appointmentTime).toDateString() === todayStr)
    }
    return appointments.filter(a => a.status === statusFilter)
  }, [appointments, statusFilter])

  const table = useReactTable({
    data: filteredData,
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
      <div className="px-4 md:px-6 pt-6 pb-10 max-w-screen-2xl mx-auto w-full min-w-0">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[84px] rounded-[var(--radius-xl)]" />)
          : (<>
            <KpiCard
              icon={<Calendar className="h-5 w-5 text-blue-600" />}
              label={t.today} value={todayCount}
              onClick={() => setStatusFilter('')}
              active={statusFilter === '' && !globalFilter}
            />
            <KpiCard
              icon={<Clock className="h-5 w-5 text-amber-600" />}
              label={t.pending} value={pendingCount}
              onClick={() => setStatusFilter('PENDING')}
              active={statusFilter === 'PENDING'}
            />
            <KpiCard
              icon={<CheckCircle className="h-5 w-5 text-green-600" />}
              label={t.completed} value={completedCount}
              onClick={() => setStatusFilter('COMPLETED')}
              active={statusFilter === 'COMPLETED'}
            />
            <KpiCard
              icon={<AlertCircle className="h-5 w-5 text-slate-500" />}
              label={t.noShow} value={noShowCount}
              onClick={() => setStatusFilter('NO_SHOW')}
              active={statusFilter === 'NO_SHOW'}
            />
            <KpiCard
              icon={<XCircle className="h-5 w-5 text-red-600" />}
              label={t.cancelled} value={cancelledCount}
              onClick={() => setStatusFilter('CANCELLED')}
              active={statusFilter === 'CANCELLED'}
            />
          </>)
        }
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Left: Table / Calendar */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between min-w-0">
            <div className="flex flex-wrap gap-2 items-center min-w-0 w-full sm:w-auto">
              <input
                type="text"
                placeholder={t.searchDoctor}
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                aria-label={t.searchDoctor} className="field-input !w-full sm:!w-56"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as AppointmentStatus | '')}
                aria-label={t.status}
                className="field-input !w-auto"
              >
                <option value="">{t.allStatuses}</option>
                {(Object.keys(STATUS_LABELS) as AppointmentStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              {/* Quick filter chips */}
              <button
                onClick={() => { setStatusFilter(''); setGlobalFilter('') }}
                className={cn(
                  'px-3 h-9 rounded-full text-xs font-medium border transition-colors',
                  statusFilter === '' && !globalFilter
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border-strong text-muted-foreground hover:bg-surface-2'
                )}
              >
                {t.filterAll}
              </button>
              <button
                onClick={() => { setStatusFilter('PENDING'); setGlobalFilter('') }}
                className={cn(
                  'px-3 h-9 rounded-full text-xs font-medium border transition-colors',
                  statusFilter === 'PENDING'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border-strong text-muted-foreground hover:bg-surface-2'
                )}
              >
                {t.statusPending}
              </button>
              <button
                onClick={() => {
                  setStatusFilter('')
                  setGlobalFilter('')
                  // Filter via table global filter trick — we just tag a today-only filter via status='TODAY' sentinel
                  // Actually let's filter the data differently
                  setStatusFilter('__today__')
                }}
                className={cn(
                  'px-3 h-9 rounded-full text-xs font-medium border transition-colors',
                  statusFilter === '__today__'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border-strong text-muted-foreground hover:bg-surface-2'
                )}
              >
                {t.today}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View toggle */}
              <div className="flex border border-border-strong rounded-md overflow-hidden bg-card">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'h-9 w-9 flex items-center justify-center transition-colors',
                    viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-2'
                  )}
                  title={t.tooltipListView}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    'h-9 w-9 flex items-center justify-center transition-colors',
                    viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-2'
                  )}
                  title={t.tooltipCalendarView}
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </div>

              {/* Export XLSX */}
              <button
                onClick={handleExportCSV}
                className="btn btn-secondary"
                title={`${t.tooltipExportExcel} (${filteredData.length})`}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Excel ({filteredData.length})</span>
              </button>

              {/* New Appointment */}
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4" /> {t.newAppointment}
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            /* ── Table ── */
            <div className="rounded-[var(--radius-xl)] overflow-hidden bg-card border border-border shadow-card">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : apptError ? (
                <div role="alert" className="px-4 py-10 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" aria-hidden />
                  <p className="text-sm font-medium text-foreground">{errorMessage(apptError, 'Appointments could not be loaded.')}</p>
                  <button onClick={() => refetchAppts()} className="btn btn-secondary mt-4">{t.tryAgain}</button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        {table.getHeaderGroups().map(hg => (
                          <tr key={hg.id}>
                            {hg.headers.map(header => (
                              <th key={header.id} className={header.column.id === 'actions' ? 'actions' : undefined}>
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                          <tr>
                            <td colSpan={columns.length} className="!py-10 text-center">
                              <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" aria-hidden />
                              <p className="text-sm text-muted-foreground">{t.noAppointments}</p>
                            </td>
                          </tr>
                        ) : table.getRowModel().rows.map(row => (
                          <tr key={row.id}
                            data-row-id={row.original.id}
                            onClick={() => setSelectedId(row.original.id === selectedId ? null : row.original.id)}
                            className={cn('cursor-pointer', selectedId === row.original.id && '[&>td]:!bg-blue-50')}>
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className={cell.column.id === 'actions' ? 'actions' : undefined}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span className="min-w-0 truncate">
                      {t.page ?? 'Page'} {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
                      {' '}· {table.getFilteredRowModel().rows.length} {t.total ?? 'total'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                        aria-label={t.previous}
                        className="rounded-md p-1.5 hover:bg-surface-2 disabled:opacity-40 transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                        aria-label={t.next}
                        className="rounded-md p-1.5 hover:bg-surface-2 disabled:opacity-40 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── Calendar View ── */
            <CalendarView appointments={filteredData} onSelect={setSelectedId} selectedId={selectedId} />
          )}
        </div>

        {/* Right: Detail panel */}
        <div className="min-w-0">
          {selected ? (
            <div className="rounded-[var(--radius-xl)] bg-card border border-border shadow-card p-5 space-y-4 lg:sticky lg:top-4 slide-in-right">
              <div>
                <h2 className="font-semibold text-base break-words">{selected.patientName}</h2>
                <p className="text-sm text-muted-foreground">{selected.doctorName} · {selected.department}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(selected.appointmentTime)}</p>
              </div>
              <hr className="border-border" />

              {/* Reminder button */}
              <button
                onClick={() => {
                  setReminderSent(true)
                  setTimeout(() => setReminderSent(false), 3000)
                }}
                className={cn(
                  'w-full flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium transition-colors border',
                  reminderSent
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-card border-border-strong text-foreground hover:bg-surface-2'
                )}
              >
                <Bell className="h-4 w-4" />
                {reminderSent ? '✓ Reminder sent' : 'Send Reminder'}
              </button>

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
            <div className="rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-card p-6 text-center">
              <Calendar className="mx-auto h-6 w-6 text-slate-300 mb-2" />
              <p className="text-sm text-muted-foreground">{t.selectAppointment}</p>
            </div>
          )}
        </div>
      </div>

      </div>{/* end container */}

      {/* ── New Appointment Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={handleCloseForm}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] bg-card border border-border p-6 shadow-popover"
            onClick={e => e.stopPropagation()}>
            <h2 className="mb-5 font-semibold text-lg text-foreground">{t.createAppointmentTitle}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField label={t.labelPatient} error={errors.patientName?.message}>
                <Controller name="patientName" control={control} render={({ field }) => (
                  <select
                    value={field.value}
                    onChange={e => {
                      const selected = patients.find(p => (p.displayName ?? p.username) === e.target.value)
                      field.onChange(e.target.value)
                      setValue('patientUsername', selected?.username ?? '')
                    }}
                    aria-invalid={!!errors.patientName} className="field-input"
                  >
                    <option value="">— Select patient —</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.displayName ?? p.username}>
                        {p.displayName ?? p.username} ({p.username})
                      </option>
                    ))}
                  </select>
                )} />
              </FormField>

              <FormField label={t.labelDoctor} error={errors.doctorName?.message}>
                <Controller name="doctorName" control={control} render={({ field }) => (
                  <select {...field}
                    aria-invalid={!!errors.doctorName} className="field-input">
                    <option value="">{t.selectDoctor}</option>
                    {activeDoctorNames.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )} />
              </FormField>

              <FormField label={t.labelDepartment} error={errors.department?.message}>
                <Controller name="department" control={control} render={({ field }) => (
                  <select {...field}
                    aria-invalid={!!errors.department} className="field-input">
                    <option value="">{t.selectDepartment}</option>
                    {departmentNames.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )} />
              </FormField>

              <FormField label={t.labelDateTime} error={errors.appointmentTime?.message}>
                <input
                  type="datetime-local"
                  {...register('appointmentTime')}
                  aria-invalid={!!errors.appointmentTime} className="field-input"
                />
              </FormField>

              {conflictSlots.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    {t.slotTaken}
                  </p>
                  <p className="text-xs text-amber-700 mb-2">{t.alternatives}:</p>
                  <div className="flex flex-wrap gap-2">
                    {conflictSlots.map(slot => (
                      <button key={slot} type="button"
                        onClick={() => { setValue('appointmentTime', slot.slice(0, 16)); setConflictSlots([]) }}
                        className="rounded-md bg-white border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors">
                        {formatDateTime(slot)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {createMut.isError && conflictSlots.length === 0 && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage(createMut.error, t.errorCreating)}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseForm}
                  className="btn btn-secondary flex-1">
                  {t.cancel}
                </button>
                <button type="submit" disabled={isSubmitting || createMut.isPending}
                  className="btn btn-primary flex-1">
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

// ── Calendar View Component ────────────────────────────────────────────────
function CalendarView({ appointments, onSelect, selectedId }: {
  appointments: Appointment[]
  onSelect: (id: number | null) => void
  selectedId: number | null
}) {
  const [weekOffset, setWeekOffset] = useState(0)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

  const getAptsForSlot = (day: Date, hour: number) =>
    appointments.filter(a => {
      const d = new Date(a.appointmentTime)
      return d.toDateString() === day.toDateString() && d.getHours() === hour
    })

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-50 border-amber-200 text-amber-700',
    CONFIRMED: 'bg-blue-50 border-blue-200 text-blue-700',
    COMPLETED: 'bg-green-50 border-green-200 text-green-700',
    CANCELLED: 'bg-red-50 border-red-200 text-red-700',
    NO_SHOW: 'bg-slate-100 border-slate-200 text-slate-600',
  }

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="rounded-[var(--radius-xl)] overflow-hidden bg-card border border-border shadow-card">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {days[0].toLocaleDateString('tr-TR', { day:'numeric', month:'long' })} – {days[6].toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })}
        </span>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="px-2 py-2 text-xs text-muted-foreground" />
            {days.map((day, i) => (
              <div key={i} className={cn(
                'px-2 py-2 text-center border-l border-border',
                day.toDateString() === today.toDateString() && 'bg-blue-50/60'
              )}>
                <p className="text-xs text-muted-foreground">{DAY_NAMES[i]}</p>
                <p className={cn(
                  'text-sm font-semibold',
                  day.toDateString() === today.toDateString() ? 'text-primary' : 'text-foreground'
                )}>{day.getDate()}</p>
              </div>
            ))}
          </div>

          {/* Time slots */}
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border min-h-[48px]">
              <div className="px-2 py-1 text-xs text-muted-foreground text-right pr-3">{hour}:00</div>
              {days.map((day, di) => {
                const apts = getAptsForSlot(day, hour)
                return (
                  <div key={di} className={cn(
                    'border-l border-border p-0.5',
                    day.toDateString() === today.toDateString() && 'bg-blue-50/60'
                  )}>
                    {apts.map(apt => (
                      <button
                        key={apt.id}
                        onClick={() => onSelect(apt.id === selectedId ? null : apt.id)}
                        className={cn(
                          'w-full text-left px-1.5 py-0.5 rounded border text-xs mb-0.5 truncate transition-all',
                          STATUS_COLORS[apt.status] ?? STATUS_COLORS.PENDING,
                          apt.id === selectedId && 'ring-1 ring-primary'
                        )}
                        title={`${apt.patientName} — ${apt.doctorName}`}
                      >
                        {apt.patientName.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, onClick, active }: {
  icon: React.ReactNode; label: string; value: number
  onClick?: () => void; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'kpi-card bg-card border border-border shadow-card w-full min-w-0 text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active && '!border-primary ring-1 ring-primary/30'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</span>
        <div className="rounded-md bg-surface-2 p-2 shrink-0">{icon}</div>
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
    </button>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="field-label">{label}</span>
        {children}
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}

function SortHeader({ label, column }: { label: string; column: Column<Appointment, unknown> }) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="flex items-center gap-1 uppercase tracking-[.04em] font-semibold hover:text-foreground transition-colors"
    >
      {label}
      {sorted === 'asc'  ? <ArrowUp className="h-3 w-3" /> :
       sorted === 'desc' ? <ArrowDown className="h-3 w-3" /> :
       <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  )
}
