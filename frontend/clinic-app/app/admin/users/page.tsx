'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Trash2, Shield, Stethoscope, User, Search, Eye, EyeOff } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { useI18n } from '@/lib/i18n-context'
import { Skeleton } from '@/components/ui/skeleton'
import { getUsers, createUser, deleteUser, type UserResponse, type CreateUserRequest } from '@/lib/api'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<string, string> = {
  ROLE_ADMIN:   'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  ROLE_DOCTOR:  'bg-blue-100   text-blue-700   dark:bg-blue-950/40   dark:text-blue-300',
  ROLE_PATIENT: 'bg-green-100  text-green-700  dark:bg-green-950/40  dark:text-green-300',
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
  const [showModal, setShowModal]   = useState(false)
  const [showPass, setShowPass]     = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [search, setSearch]         = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'ROLE_PATIENT' },
  })

  const createMut = useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setShowModal(false)
      reset()
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
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
      <div className="px-6 pt-6 pb-10 max-w-screen-2xl mx-auto flex flex-col gap-6">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.usersTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t.usersSubtitle}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
              className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                roleFilter === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input
            placeholder={t.searchUserPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* User table */}
        <div className="rounded-xl glass-strong overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-14"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">{t.noUsersFound}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">{t.colFullName}</th>
                  <th className="px-4 py-3 text-left font-medium">{t.username}</th>
                  <th className="px-4 py-3 text-left font-medium">{t.colRole}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {u.displayName ?? <span className="text-muted-foreground italic">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        ROLE_COLORS[u.role] ?? 'bg-muted text-muted-foreground')}>
                        {ROLE_ICONS[u.role]} {u.role === "ROLE_ADMIN" ? "Admin" : u.role === "ROLE_DOCTOR" ? t.filterDoctor : t.filterPatient}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'ROLE_ADMIN' && (
                        <button
                          onClick={() => {
                            if (confirm(`${t.deleteUserTitle}: ${u.username}?`)) {
                              deleteMut.mutate(u.id)
                            }
                          }}
                          className="rounded p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title={t.tooltipDeleteUser}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
		onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="w-full max-w-md rounded-xl glass-strong shadow-2xl p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">{t.createNewUser}</h2>
            <p className="text-xs text-muted-foreground mb-5">
              {t.createUserSubtitle}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Role */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.colRole}</label>
                <div className="flex gap-2">
                  {(['ROLE_DOCTOR', 'ROLE_PATIENT'] as const).map(r => (
                    <label key={r} className={cn('flex-1 cursor-pointer rounded-lg border p-3 text-center text-sm transition-colors',
					'has-[:checked]:border-primary has-[:checked]:bg-primary/5')}>
					<input type="radio" value={r} {...register('role')} className="sr-only"/>
				<div>
				<span className="block font-medium">{r === "ROLE_DOCTOR" ? t.filterDoctor : t.filterPatient}</span>
				<span className="text-xs text-muted-foreground">{r === 'ROLE_DOCTOR' ? t.canManageAppts : t.canBookAppts}</span>
				</div>
				</label>
                  ))}
                </div>
                {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
              </div>

              {/* Display Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.labelFullName}</label>
                <input {...register('displayName')} placeholder="Dr. Anna Müller"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
                {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName.message}</p>}
              </div>

              {/* Username */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.username} *</label>
                <input {...register('username')} placeholder="dr.yilmaz"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"/>
                {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.labelPassword}</label>
                <div className="relative">
                  <input {...register('password')} type={showPass ? 'text' : 'password'}
                    placeholder={t.passwordPlaceholder}
                    className="w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              {createMut.isError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
                  {t.errorCreateUser}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset() }}
                  className="flex-1 py-2.5 rounded-md border text-sm hover:bg-muted transition-colors">
                  {t.btnCancel}
                </button>
                <button type="submit" disabled={createMut.isPending}
                  className="flex-1 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
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
