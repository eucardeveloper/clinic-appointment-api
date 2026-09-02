'use client'
import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // bfcache'den restore edildi — cookie artık yok, login'e yönlendir
        window.location.replace('/login')
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return <>{children}</>
}
