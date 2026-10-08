'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Trash2, Shield, Stethoscope, User, Search, Eye, EyeOff, AlertCircle } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { useI18n } from '@/lib/i18n-context'
import { Skeleton } from '@/components/ui/skeleton'
import { getUsers, createUser, deleteUser, type CreateUserRequest } from '@/lib/api'
import { cn, errorMessage } from '@/lib/utils'
import { useToast } from '@/components/Toast'

const ROLE_COLORS: Record<string, string> = {
  ROLE_ADMIN:   'bg-slate-100 text-slate-700 border border-slate-200',
  ROLE_DOCTOR:  'bg-blue-50 text-blue-700 border border-blue-200',
  ROLE_PATIENT: 'bg-green-50 text-green-700 border border-green-200',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  ROLE_ADMIN:   <Shield   size={12} />,
  ROLE_DOCTOR:  <Stethoscope size={12} />,
  ROLE_PATIENT: <User     size={12} />,
}

const createSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(150),
  username:    z.string().min(3, 'Username must be at least 3 characters').max(50)
               .regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, numbers, dot, underscore, hyphen'),
  password:    z.string().min(6, 'Password must be at least 6 characters').max(100),
  role:        z.enum(['ROLE_DOCTOR', 'ROLE_PATIENT']),
})
type CreateForm = z.infer<typeof createSchema>

export default function AdminUsersPage() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const toast = useToast()
  const [showModal, setShowModal]   = useState(false)
  const [showPass, setShowPass]     = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [search, setSearch]         = useState('')

  const { data: users = [], isLoading, error: usersError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    mode: 'onTouched',
    defaultValues: { role: 'ROLE_PATIENT' },
  })

  const createMut = useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setShowModal(false)
      reset()
      toast.success('User created')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User deleted') },
    onError: (err) => toast.error(errorMessage(err, 'User could not be deleted.')),
  })

  const onSubmit = (data: CreateForm) => createMut.mutate(data)

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    const q = search.toLowerCase()
    const matchSearch = !q
      || u.username.toLowerCase().includes(q)
      || (u.displayName ?? '').toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  const counts = {
    all:     users.length,
    admin:   users.filter(u => u.role === 'ROLE_ADMIN').length,
    doctor:  users.filter(u => u.role === 'ROLE_DOCTOR').length,
    patient: users.filter(u => u.role === 'ROLE_PATIENT').length,
  }

  return (
    <AppShell subtitle={t.adminPortal}>
      <div className="px-4 md:px-6 pt-6 pb-10 max-w-screen-2xl mx-auto w-full min-w-0 flex flex-col gap-5">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-h1">{t.usersTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t.usersSubtitle}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <UserPlus size={16} /> {t.newUser}
          </button>
        </div>

        {/* KPI chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: `${t.filterAll} (${counts.all})`,        value: 'ALL' },
            { label: `Admin (${counts.admin})`,     value: 'ROLE_ADMIN' },
            { label: `${t.filterDoctor} (${counts.doctor})`,   value: 'ROLE_DOCTOR' },
            { label: `${t.filterPatient} (${counts.patient})`,   value: 'ROLE_PATIENT' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRoleFilter(value)}
              className={cn('rounded-full border px-3 h-8 text-xs font-medium transition-colors',
                roleFilter === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-surface-2 border-border-strong text-muted-foreground')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden/>
          <input
            placeholder={t.searchUserPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t.searchUserPlaceholder}
            className="field-input !pl-9"
          />
        </div>

        {/* User table */}
        <div className="rounded-[var(--radius-xl)] bg-card border border-border shadow-card overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10"/>)}</div>
          ) : usersError ? (
            <div role="alert" className="px-4 py-10 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" aria-hidden />
              <p className="text-sm font-medium">{errorMessage(usersError, 'Users could not be loaded.')}</p>
              <button onClick={() => refetch()} className="btn btn-secondary mt-4">{t.tryAgain}</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">{t.noUsersFound}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.colFullName}</th>
                    <th>{t.username}</th>
                    <th>{t.colRole}</th>
                    <th className="actions"><span className="sr-only">{t.colActions}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td className="font-medium">
                        {u.displayName ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="font-mono text-xs text-muted-foreground">{u.username}</td>
                      <td>
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                          ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600 border border-slate-200')}>
                          {ROLE_ICONS[u.role]} {u.role === "ROLE_ADMIN" ? "Admin" : u.role === "ROLE_DOCTOR" ? t.filterDoctor : t.filterPatient}
                        </span>
                      </td>
                      <td className="actions">
                        {u.role !== 'ROLE_ADMIN' && (
                          <button
                            onClick={() => {
                              if (confirm(`${t.deleteUserTitle}: ${u.username}?`)) {
                                deleteMut.mutate(u.id)
                              }
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={t.tooltipDeleteUser}
                            aria-label={t.tooltipDeleteUser}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] bg-card border border-border shadow-popover p-6">
            <h2 className="text-lg font-semibold mb-1">{t.createNewUser}</h2>
            <p className="text-xs text-muted-foreground mb-5">
              {t.createUserSubtitle}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Role */}
              <div>
                <label className="field-label">{t.colRole}</label>
                <div className="flex gap-2">
                  {(['ROLE_DOCTOR', 'ROLE_PATIENT'] as const).map(r => (
                    <label key={r} className={cn('flex-1 cursor-pointer rounded-md border border-border-strong p-3 text-center text-sm transition-colors',
					'has-[:checked]:border-primary has-[:checked]:bg-blue-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40')}>
					<input type="radio" value={r} {...register('role')} className="sr-only"/>
				<div>
				<span className="block font-medium">{r === "ROLE_DOCTOR" ? t.filterDoctor : t.filterPatient}</span>
				<span className="text-xs text-muted-foreground">{r === 'ROLE_DOCTOR' ? t.canManageAppts : t.canBookAppts}</span>
				</div>
				</label>
                  ))}
                </div>
                {errors.role && <p className="field-error">{errors.role.message}</p>}
              </div>

              {/* Display Name */}
              <div>
                <label className="field-label">{t.labelFullName}</label>
                <input {...register('displayName')} placeholder="Dr. Anna Müller"
                  className="field-input"/>
                {errors.displayName && <p className="field-error">{errors.displayName.message}</p>}
              </div>

              {/* Username */}
              <div>
                <label className="field-label">{t.username} *</label>
                <input {...register('username')} placeholder="dr.yilmaz"
                  className="field-input font-mono"/>
                {errors.username && <p className="field-error">{errors.username.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="field-label">{t.labelPassword}</label>
                <div className="relative">
                  <input {...register('password')} type={showPass ? 'text' : 'password'}
                    placeholder={t.passwordPlaceholder}
                    className="field-input !pr-9"/>
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {errors.password && <p className="field-error">{errors.password.message}</p>}
              </div>

              {createMut.isError && (
                <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {errorMessage(createMut.error, t.errorCreateUser)}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset() }}
                  className="btn btn-secondary flex-1">
                  {t.btnCancel}
                </button>
                <button type="submit" disabled={createMut.isPending}
                  className="btn btn-primary flex-1">
                  {createMut.isPending ? t.btnCreating : t.btnCreateUser}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
