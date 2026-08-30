'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, Mail, Phone, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'
import AppShell from '@/components/AppShell'
import {
  getDoctors,
  getDepartments,
  createDoctor,
  createDepartment,
  toggleDoctorStatus,
  deleteDoctor,
  deleteDepartment,
  type DoctorResponse,
  type DepartmentResponse,
} from '@/lib/api'

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
]

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const clean = name.replace(/^Dr\.\s*/i, '')
  const initials = clean.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = AVATAR_COLORS[(name.charCodeAt(4) ?? 0) % AVATAR_COLORS.length]
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0',
      color,
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
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex w-10 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        checked ? 'bg-emerald-500' : 'bg-muted-foreground/30'
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
function RowSkeleton() {
  return (
    <div className="grid grid-cols-[2.5fr_1.2fr_2.5fr_1fr_auto] gap-4 px-4 py-3 items-center animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
      <div className="h-5 w-24 rounded-full bg-muted" />
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="flex items-center gap-2">
        <div className="w-10 h-5 rounded-full bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
      </div>
      <div className="w-7 h-7 rounded bg-muted" />
    </div>
  )
}

// ── Zod schemas ───────────────────────────────────────────────────────────────
const doctorSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  departmentId: z.string().optional(),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
})
const deptSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  floor: z.string().optional(),
  headDoctor: z.string().optional(),
})

type DoctorForm = z.infer<typeof doctorSchema>
type DeptForm = z.infer<typeof deptSchema>

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'doctors' | 'departments'>('doctors')
  const [search, setSearch] = useState('')
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [showDeptModal, setShowDeptModal] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: getDoctors,
  })

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })

  // ── Mutations ────────────────────────────────────────────────────────────
  const createDoctorMut = useMutation({
    mutationFn: createDoctor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); setShowDoctorModal(false) },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => toggleDoctorStatus(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  })

  const deleteDoctorMut = useMutation({
    mutationFn: deleteDoctor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  })

  const createDeptMut = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setShowDeptModal(false) },
  })

  const deleteDeptMut = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })

  // ── Forms ────────────────────────────────────────────────────────────────
  const doctorForm = useForm<DoctorForm>({ resolver: zodResolver(doctorSchema) })
  const deptForm = useForm<DeptForm>({ resolver: zodResolver(deptSchema) })

  const onDoctorSubmit = (data: DoctorForm) => {
    createDoctorMut.mutate({
      name: data.name,
      departmentId: data.departmentId ? Number(data.departmentId) : null,
      email: data.email,
      phone: data.phone ?? '',
    })
  }

  const onDeptSubmit = (data: DeptForm) => {
    createDeptMut.mutate({
      name: data.name,
      floor: data.floor ? Number(data.floor) : null,
      headDoctor: data.headDoctor ?? '',
    })
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.departmentName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const activeDoctorCount = doctors.filter(d => d.active).length

  // ── Field classes ─────────────────────────────────────────────────────────
  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const labelCls = 'block text-sm font-medium text-muted-foreground mb-1'

  return (
    <AppShell title={t.doctorMgmtTitle}>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        {/* Stats row */}
        <div className="flex gap-4">
          <div className="bg-card rounded-xl border border-border px-5 py-3">
            <p className="text-2xl font-bold">{activeDoctorCount}</p>
            <p className="text-xs text-muted-foreground">{t.activeDoctors}</p>
          </div>
          <div className="bg-card rounded-xl border border-border px-5 py-3">
            <p className="text-2xl font-bold">{departments.length}</p>
            <p className="text-xs text-muted-foreground">{t.departmentsCount}</p>
          </div>
        </div>

        {/* Tabs + Action */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-muted p-1 rounded-lg gap-1">
            {(['doctors', 'departments'] as const).map(key => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  tab === key
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {key === 'doctors' ? t.tabDoctors : t.tabDepartments}
              </button>
            ))}
          </div>
          <button
            onClick={() => tab === 'doctors' ? setShowDoctorModal(true) : setShowDeptModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {tab === 'doctors' ? t.addDoctor : t.addDepartment}
          </button>
        </div>

        {/* Table card */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">

          {/* Search bar — doctors only */}
          {tab === 'doctors' && (
            <div className="px-4 py-3 border-b border-border">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t.searchDoctors}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Doctors table */}
          {tab === 'doctors' && (
            <>
              <div className="grid grid-cols-[2.5fr_1.2fr_2.5fr_1fr_auto] gap-4 px-4 py-2 bg-white/5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-white/5">
                <span>{t.colName}</span>
                <span>{t.colDepartment}</span>
                <span>{t.colEmail} / {t.colPhone}</span>
                <span>{t.colStatus}</span>
                <span />
              </div>
              <div className="divide-y divide-border">
                {loadingDoctors
                  ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                  : filteredDoctors.length === 0
                    ? <p className="text-center text-muted-foreground py-10 text-sm">{t.noDoctors}</p>
                    : filteredDoctors.map(doc => (
                      <DoctorRow
                        key={doc.id}
                        doc={doc}
                        t={t}
                        onToggle={(active) => toggleMut.mutate({ id: doc.id, active })}
                        onDelete={() => deleteDoctorMut.mutate(doc.id)}
                      />
                    ))
                }
              </div>
            </>
          )}

          {/* Departments table */}
          {tab === 'departments' && (
            <>
              <div className="grid grid-cols-[2fr_0.8fr_2fr_1fr_auto] gap-4 px-4 py-2 bg-white/5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-white/5">
                <span>{t.colName}</span>
                <span>{t.colFloor}</span>
                <span>{t.colHead}</span>
                <span>{t.colActiveDoctors}</span>
                <span />
              </div>
              <div className="divide-y divide-border">
                {loadingDepts
                  ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
                  : departments.length === 0
                    ? <p className="text-center text-muted-foreground py-10 text-sm">{t.noDepartments}</p>
                    : departments.map(dept => (
                      <DeptRow
                        key={dept.id}
                        dept={dept}
                        onDelete={() => deleteDeptMut.mutate(dept.id)}
                      />
                    ))
                }
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Doctor modal */}
      {showDoctorModal && (
        <Modal title={t.modalAddDoctor} onClose={() => { setShowDoctorModal(false); doctorForm.reset() }}>
          <form onSubmit={doctorForm.handleSubmit(onDoctorSubmit)} className="space-y-4">
            <div>
              <label className={labelCls}>{t.labelName}</label>
              <input {...doctorForm.register('name')} className={inputCls} placeholder="Dr. " />
              {doctorForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{doctorForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>{t.colDepartment}</label>
              <select {...doctorForm.register('departmentId')} className={inputCls}>
                <option value="">—</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.colEmail}</label>
              <input {...doctorForm.register('email')} type="email" className={inputCls} />
              {doctorForm.formState.errors.email && (
                <p className="text-xs text-destructive mt-1">{doctorForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>{t.colPhone}</label>
              <input {...doctorForm.register('phone')} className={inputCls} placeholder="+49 30 …" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowDoctorModal(false); doctorForm.reset() }}
                className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={createDoctorMut.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {createDoctorMut.isPending ? '…' : t.addDoctor}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Department modal */}
      {showDeptModal && (
        <Modal title={t.modalAddDept} onClose={() => { setShowDeptModal(false); deptForm.reset() }}>
          <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-4">
            <div>
              <label className={labelCls}>{t.labelName}</label>
              <input {...deptForm.register('name')} className={inputCls} />
              {deptForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{deptForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>{t.labelFloor}</label>
              <input {...deptForm.register('floor')} type="number" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.labelHeadDoctor}</label>
              <input {...deptForm.register('headDoctor')} className={inputCls} placeholder="Dr. " />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowDeptModal(false); deptForm.reset() }}
                className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={createDeptMut.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {createDeptMut.isPending ? '…' : t.addDepartment}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  )
}

// ── Doctor Row ────────────────────────────────────────────────────────────────
function DoctorRow({ doc, t, onToggle, onDelete }: {
  doc: DoctorResponse
  t: ReturnType<typeof useI18n>['t']
  onToggle: (v: boolean) => void
  onDelete: () => void
}) {
  return (
    <div className="grid grid-cols-[2.5fr_1.2fr_2.5fr_1fr_auto] gap-4 px-4 py-3 items-center table-row-hover transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={doc.name} />
        <span className="font-medium text-sm truncate">{doc.name}</span>
      </div>
      <div>
        {doc.departmentName
          ? <span className="text-xs bg-primary/15 text-primary rounded-full px-2.5 py-1 font-medium border border-primary/20">{doc.departmentName}</span>
          : <span className="text-xs text-muted-foreground">—</span>
        }
      </div>
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <Mail className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{doc.email}</span>
        </div>
        {doc.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span>{doc.phone}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Toggle checked={doc.active} onChange={onToggle} />
        <span className={cn('text-xs font-medium', doc.active ? 'text-emerald-400' : 'text-muted-foreground')}>
          {doc.active ? t.statusActive : t.statusInactive}
        </span>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        aria-label="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Department Row ────────────────────────────────────────────────────────────
function DeptRow({ dept, onDelete }: {
  dept: DepartmentResponse
  onDelete: () => void
}) {
  return (
    <div className="grid grid-cols-[2fr_0.8fr_2fr_1fr_auto] gap-4 px-4 py-3 items-center table-row-hover transition-colors">
      <span className="font-medium text-sm">{dept.name}</span>
      <span className="text-sm text-muted-foreground">{dept.floor != null ? `F${dept.floor}` : '—'}</span>
      <div className="flex items-center gap-3">
        {dept.headDoctor && <Avatar name={dept.headDoctor} size="sm" />}
        <span className="text-sm truncate">{dept.headDoctor ?? '—'}</span>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400"><span className="pulse-dot" />{dept.activeDoctors}</span>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        aria-label="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
