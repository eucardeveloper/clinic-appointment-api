'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Root page — reads JWT role from /api/auth/me and routes accordingly:
 *   ROLE_ADMIN   → /admin
 *   ROLE_DOCTOR  → /doctor
 *   ROLE_PATIENT → /patient
 * Unauthenticated → /login
 */
export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }

    switch (user.role) {
      case 'ROLE_ADMIN':   router.replace('/admin');   break
      case 'ROLE_DOCTOR':  router.replace('/doctor');  break
      case 'ROLE_PATIENT': router.replace('/patient'); break
      default:             router.replace('/login')
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-3 w-64">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}
