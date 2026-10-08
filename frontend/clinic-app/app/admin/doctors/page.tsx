'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, Mail, Phone, Search, X, Pencil, AlertCircle, Plus } from 'lucide-react'
import { cn, errorMessage, PHONE_REGEX, PHONE_MESSAGE } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'
import AppShell from '@/components/AppShell'
import { useToast } from '@/components/Toast'
import {
  getDoctors,
  getDepartments,
  createDoctor,
  createDepartment,
  updateDoctor,
  updateDepartment,
  toggleDoctorStatus,
  deleteDoctor,
  deleteDepartment,
  type DoctorResponse,
  type DepartmentResponse,
} from '@/lib/api'

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const clean = name.replace(/^Dr\.\s*/i, '')
  const initials = clean.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex-shrink-0',
      size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
    )}>
      {initials}
    </div>
  )
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex w-10 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        checked ? 'bg-primary' : 'bg-slate-300'
      )}
    >
      <span className={cn(
        'block w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function RowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><div className="h-4 rounded bg-surface-3" style={{ width: `${55 + (i * 13) % 40}%` }} /></td>
      ))}
    </tr>
  )
}

// ── Zod schemas ───────────────────────────────────────────────────────────────
const doctorSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  departmentId: z.string().optional(),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().trim().refine(v => v === '' || PHONE_REGEX.test(v), PHONE_MESSAGE).optional(),
})
const deptSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  floor: z.string().optional().refine(v => !v || /^-?\d{1,3}$/.test(v), 'Floor must be a whole number'),
  headDoctor: z.string().optional(),
})

type DoctorForm = z.infer<typeof doctorSchema>
type DeptForm = z.infer<typeof deptSchema>

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-card border border-border rounded-[var(--radius-xl)] shadow-popover w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-base">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-md text-muted-foreground hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="field-label">{label}</span>
        {children}
      </label>
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  )
}

function ErrorState({ error, onRetry, fallback }: { error: unknown; onRetry: () => void; fallback: string }) {
  return (
    <div role="alert" className="px-4 py-10 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" aria-hidden />
      <p className="text-sm font-medium">{errorMessage(error, fallback)}</p>
      <button type="button" onClick={onRetry} className="btn btn-secondary mt-4">Retry</button>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center text-muted-foreground py-10 text-sm">{text}</p>
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const toast = useToast()
  const [tab, setTab] = useState<'doctors' | 'departments'>('doctors')
  const [search, setSearch] = useState('')
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<DoctorResponse | null>(null)
  const [editingDept, setEditingDept] = useState<DepartmentResponse | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: doctors = [], isLoading: loadingDoctors, error: doctorsError, refetch: refetchDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: getDoctors,
    refetchOnMount: 'always',
  })

  const { data: departments = [], isLoading: loadingDepts, error: deptsError, refetch: refetchDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchOnMount: 'always',
  })

  // ── Mutations ────────────────────────────────────────────────────────────
  const createDoctorMut = useMutation({
    mutationFn: createDoctor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); setShowDoctorModal(false); toast.success('Doctor added') },
    onError: (err) => toast.error(errorMessage(err, 'Doctor could not be created (is the email already registered?)')),
  })

  const updateDoctorMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateDoctor>[1] }) =>
      updateDoctor(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); qc.invalidateQueries({ queryKey: ['appointments'] }); setEditingDoctor(null); toast.success('Doctor updated') },
    onError: (err) => toast.error(errorMessage(err, 'Doctor could not be updated. Please try again.')),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => toggleDoctorStatus(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
    onError: (err) => toast.error(errorMessage(err, 'Status could not be changed.')),
  })

  const deleteDoctorMut = useMutation({
    mutationFn: deleteDoctor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Doctor deleted') },
    onError: (err) => toast.error(errorMessage(err, 'Doctor could not be deleted.')),
  })
  const createDeptMut = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); qc.invalidateQueries({ queryKey: ['doctors'] }); setShowDeptModal(false); toast.success('Department added') },
    onError: (err) => toast.error(errorMessage(err, 'Department could not be created.')),
  })
  const updateDeptMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateDepartment>[1] }) =>
      updateDepartment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); qc.invalidateQueries({ queryKey: ['doctors'] }); setEditingDept(null); toast.success('Department updated') },
    onError: (err) => toast.error(errorMessage(err, 'Department could not be updated. Please try again.')),
  })
  const deleteDeptMut = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Department deleted') },
    onError: (err) => toast.error(errorMessage(err, 'Department could not be deleted (it may still have doctors).')),
  })

  // ── Forms ────────────────────────────────────────────────────────────────
  const doctorForm = useForm<DoctorForm>({ resolver: zodResolver(doctorSchema), mode: 'onTouched' })
  const editDoctorForm = useForm<DoctorForm>({ resolver: zodResolver(doctorSchema), mode: 'onTouched' })
  const deptForm = useForm<DeptForm>({ resolver: zodResolver(deptSchema), mode: 'onTouched' })
  const editDeptForm = useForm<DeptForm>({ resolver: zodResolver(deptSchema), mode: 'onTouched' })

  const onDoctorSubmit = (data: DoctorForm) => {
    createDoctorMut.mutate({
      name: data.name,
      departmentId: data.departmentId ? Number(data.departmentId) : null,
      email: data.email,
      phone: data.phone ?? '',
    })
  }

  const onEditDoctorSubmit = (data: DoctorForm) => {
    if (!editingDoctor) return
    updateDoctorMut.mutate({
      id: editingDoctor.id,
      data: {
        name: data.name,
        departmentId: data.departmentId ? Number(data.departmentId) : null,
        email: data.email,
        phone: data.phone ?? '',
      },
    })
  }

  const onDeptSubmit = (data: DeptForm) => {
    createDeptMut.mutate({
      name: data.name,
      floor: data.floor ? Number(data.floor) : null,
      headDoctor: data.headDoctor ?? '',
    })
  }

  const onEditDeptSubmit = (data: DeptForm) => {
    if (!editingDept) return
    updateDeptMut.mutate({
      id: editingDept.id,
      data: {
        name: data.name,
        floor: data.floor ? Number(data.floor) : null,
        headDoctor: data.headDoctor ?? '',
      },
    })
  }

  const openEditDoctorModal = (doc: DoctorResponse) => {
    setEditingDoctor(doc)
    editDoctorForm.reset({
      name: doc.name,
      email: doc.email,
      phone: doc.phone ?? '',
      departmentId: doc.departmentId ? String(doc.departmentId) : '',
    })
  }

  const openEditDeptModal = (dept: DepartmentResponse) => {
    setEditingDept(dept)
    editDeptForm.reset({
      name: dept.name,
      floor: dept.floor != null ? String(dept.floor) : '',
      headDoctor: dept.headDoctor ?? '',
    })
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.departmentName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const activeDoctorCount = doctors.filter(d => d.active).length

  const addLabel = tab === 'doctors' ? t.addDoctor : t.addDepartment
  const closeAddDoctor = () => { setShowDoctorModal(false); doctorForm.reset() }
  const closeAddDept = () => { setShowDeptModal(false); deptForm.reset() }

  return (
    <AppShell title={t.doctorMgmtTitle}>
      <div className="px-4 md:px-6 pb-10 pt-4 space-y-5 max-w-screen-2xl mx-auto w-full min-w-0">

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md">
          <div className="bg-card border border-border shadow-card rounded-[var(--radius-xl)] px-4 py-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{activeDoctorCount}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide truncate">{t.activeDoctors}</p>
          </div>
          <div className="bg-card border border-border shadow-card rounded-[var(--radius-xl)] px-4 py-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{departments.length}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide truncate">{t.departmentsCount}</p>
          </div>
        </div>

        {/* Tabs + Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex bg-surface-2 border border-border p-1 rounded-lg gap-1">
            {(['doctors', 'departments'] as const).map(key => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'px-4 h-8 rounded-md text-sm font-medium transition-colors',
                  tab === key
                    ? 'bg-card shadow-card text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {key === 'doctors' ? t.tabDoctors : t.tabDepartments}
              </button>
            ))}
          </div>
          <button
            onClick={() => tab === 'doctors' ? setShowDoctorModal(true) : setShowDeptModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" aria-hidden />
            {addLabel}
          </button>
        </div>

        {/* Table card */}
        <div className="bg-card rounded-[var(--radius-xl)] border border-border shadow-card overflow-hidden">

          {/* Search bar — doctors only */}
          {tab === 'doctors' && (
            <div className="px-4 py-3 border-b border-border">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" aria-hidden />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t.searchDoctors}
                  aria-label={t.searchDoctors}
                  className="field-input !pl-9"
                />
              </div>
            </div>
          )}

          {/* Doctors table */}
          {tab === 'doctors' && (doctorsError ? (
            <ErrorState error={doctorsError} onRetry={() => refetchDoctors()} fallback="Doctors could not be loaded." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.colName}</th>
                    <th>{t.colDepartment}</th>
                    <th>{t.colEmail} / {t.colPhone}</th>
                    <th>{t.colStatus}</th>
                    <th className="actions"><span className="sr-only">{t.colActions}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDoctors
                    ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} cols={5} />)
                    : filteredDoctors.length === 0
                      ? <tr><td colSpan={5}><EmptyState text={t.noDoctors} /></td></tr>
                      : filteredDoctors.map(doc => (
                        <DoctorRow
                          key={doc.id}
                          doc={doc}
                          t={t}
                          onToggle={(active) => toggleMut.mutate({ id: doc.id, active })}
                          onDelete={() => { if (confirm(`${doc.name}?`)) deleteDoctorMut.mutate(doc.id) }}
                          onEdit={() => openEditDoctorModal(doc)}
                        />
                      ))
                  }
                </tbody>
              </table>
            </div>
          ))}

          {/* Departments table */}
          {tab === 'departments' && (deptsError ? (
            <ErrorState error={deptsError} onRetry={() => refetchDepts()} fallback="Departments could not be loaded." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.colName}</th>
                    <th className="num">{t.colFloor}</th>
                    <th>{t.colHead}</th>
                    <th className="num">{t.colActiveDoctors}</th>
                    <th className="actions"><span className="sr-only">{t.colActions}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDepts
                    ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} cols={5} />)
                    : departments.length === 0
                      ? <tr><td colSpan={5}><EmptyState text={t.noDepartments} /></td></tr>
                      : departments.map(dept => (
                        <DeptRow
                          key={dept.id}
                          dept={dept}
                          onDelete={() => { if (confirm(`${dept.name}?`)) deleteDeptMut.mutate(dept.id) }}
                          onEdit={() => openEditDeptModal(dept)}
                        />
                      ))
                  }
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Add Doctor modal */}
      {showDoctorModal && (
        <Modal title={t.modalAddDoctor} onClose={closeAddDoctor}>
          <form onSubmit={doctorForm.handleSubmit(onDoctorSubmit)} className="space-y-4" noValidate>
            <DoctorFields form={doctorForm} departments={departments} t={t} isNew />
            <FormActions onCancel={closeAddDoctor} cancelLabel={t.btnCancel} pending={createDoctorMut.isPending} submitLabel={t.addDoctor} />
          </form>
        </Modal>
      )}

      {/* Edit Doctor modal */}
      {editingDoctor && (
        <Modal title={t.modalEditDoctor} onClose={() => setEditingDoctor(null)}>
          <form onSubmit={editDoctorForm.handleSubmit(onEditDoctorSubmit)} className="space-y-4" noValidate>
            <DoctorFields form={editDoctorForm} departments={departments} t={t} />
            <FormActions onCancel={() => setEditingDoctor(null)} cancelLabel={t.btnCancel} pending={updateDoctorMut.isPending} submitLabel={t.btnSave} />
          </form>
        </Modal>
      )}

      {/* Add Department modal */}
      {showDeptModal && (
        <Modal title={t.modalAddDept} onClose={closeAddDept}>
          <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-4" noValidate>
            <DeptFields form={deptForm} t={t} />
            <FormActions onCancel={closeAddDept} cancelLabel={t.btnCancel} pending={createDeptMut.isPending} submitLabel={t.addDepartment} />
          </form>
        </Modal>
      )}

      {/* Edit Department modal */}
      {editingDept && (
        <Modal title={t.modalEditDept} onClose={() => setEditingDept(null)}>
          <form onSubmit={editDeptForm.handleSubmit(onEditDeptSubmit)} className="space-y-4" noValidate>
            <DeptFields form={editDeptForm} t={t} />
            <FormActions onCancel={() => setEditingDept(null)} cancelLabel={t.btnCancel} pending={updateDeptMut.isPending} submitLabel={t.btnSave} />
          </form>
        </Modal>
      )}
    </AppShell>
  )
}

type T = ReturnType<typeof useI18n>['t']

// ── Form building blocks ──────────────────────────────────────────────────────
function FormActions({ onCancel, cancelLabel, pending, submitLabel }: {
  onCancel: () => void; cancelLabel: string; pending: boolean; submitLabel: string
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">{cancelLabel}</button>
      <button type="submit" disabled={pending} className="btn btn-primary flex-1">{pending ? '…' : submitLabel}</button>
    </div>
  )
}

function DoctorFields({ form, departments, t, isNew }: {
  form: UseFormReturn<DoctorForm>; departments: DepartmentResponse[]; t: T; isNew?: boolean
}) {
  const { register, formState: { errors } } = form
  return (
    <>
      <Field label={t.labelName} error={errors.name?.message}>
        <input {...register('name')} className="field-input" aria-invalid={!!errors.name} placeholder={isNew ? 'Dr. ' : undefined} />
      </Field>
      <Field label={t.colDepartment}>
        <select {...register('departmentId')} className="field-input">
          <option value="">—</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label={t.colEmail} error={errors.email?.message}>
        <input {...register('email')} type="email" className="field-input" aria-invalid={!!errors.email} placeholder="name@clinic.com" />
      </Field>
      <Field label={t.colPhone} error={errors.phone?.message}>
        <input {...register('phone')} type="tel" className="field-input" aria-invalid={!!errors.phone} placeholder="+1 555 000 0000" />
      </Field>
    </>
  )
}

function DeptFields({ form, t }: { form: UseFormReturn<DeptForm>; t: T }) {
  const { register, formState: { errors } } = form
  return (
    <>
      <Field label={t.labelName} error={errors.name?.message}>
        <input {...register('name')} className="field-input" aria-invalid={!!errors.name} />
      </Field>
      <Field label={t.labelFloor} error={errors.floor?.message}>
        <input {...register('floor')} type="number" className="field-input" aria-invalid={!!errors.floor} />
      </Field>
      <Field label={t.labelHeadDoctor}>
        <input {...register('headDoctor')} className="field-input" placeholder="Dr. " />
      </Field>
    </>
  )
}

// ── Doctor Row ────────────────────────────────────────────────────────────────
function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-blue-50 transition-colors"
        aria-label="Edit"
        title="Edit"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function DoctorRow({ doc, t, onToggle, onDelete, onEdit }: {
  doc: DoctorResponse
  t: T
  onToggle: (v: boolean) => void
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <tr>
      <td>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={doc.name} />
          <span className="font-medium truncate">{doc.name}</span>
        </div>
      </td>
      <td>
        {doc.departmentName
          ? <span className="inline-block text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 font-medium border border-blue-200 whitespace-nowrap">{doc.departmentName}</span>
          : <span className="text-xs text-muted-foreground">—</span>
        }
      </td>
      <td>
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 flex-shrink-0" aria-hidden />
            <span className="truncate">{doc.email}</span>
          </div>
          {doc.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 flex-shrink-0" aria-hidden />
              <span className="whitespace-nowrap tabular-nums">{doc.phone}</span>
            </div>
          )}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <Toggle checked={doc.active} onChange={onToggle} />
          <span className={cn('text-xs font-medium whitespace-nowrap', doc.active ? 'text-green-700' : 'text-muted-foreground')}>
            {doc.active ? t.statusActive : t.statusInactive}
          </span>
        </div>
      </td>
      <td className="actions"><ActionButtons onEdit={onEdit} onDelete={onDelete} /></td>
    </tr>
  )
}

// ── Department Row ────────────────────────────────────────────────────────────
function DeptRow({ dept, onDelete, onEdit }: {
  dept: DepartmentResponse
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <tr>
      <td className="font-medium">{dept.name}</td>
      <td className="num text-muted-foreground">{dept.floor != null ? dept.floor : '—'}</td>
      <td>
        <div className="flex items-center gap-3 min-w-0">
          {dept.headDoctor && <Avatar name={dept.headDoctor} size="sm" />}
          <span className="truncate">{dept.headDoctor ?? '—'}</span>
        </div>
      </td>
      <td className="num font-semibold text-green-700">{dept.activeDoctors}</td>
      <td className="actions"><ActionButtons onEdit={onEdit} onDelete={onDelete} /></td>
    </tr>
  )
}
