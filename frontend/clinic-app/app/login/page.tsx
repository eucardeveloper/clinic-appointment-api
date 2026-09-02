'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { login } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { LANGUAGE_LABELS, type Language } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { t, lang, setLang } = useI18n()
  const { setUser } = useAuth()
  const [mounted, setMounted] = useState(false)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login({ username, password })
      setUser({ username: res.username, role: res.role as any })
      router.push('/')
    } catch {
      setError(t.loginError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="font-semibold">{t.appName}</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="lang-select" className="sr-only">Language</label>
          <select
            id="lang-select"
            value={lang}
            onChange={e => setLang(e.target.value as Language)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-md p-2 hover:bg-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <h1 className="mb-6 text-xl font-semibold text-center">{t.loginTitle}</h1>

            {/* aria-live region — announces errors to screen readers */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {error}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              noValidate
              aria-label="Login form"
            >
              <div className="space-y-1">
                <label htmlFor="username" className="text-sm font-medium">{t.username}</label>
                <input
                  id="username"
                  name="username"
                  required
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  aria-required="true"
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium">{t.password}</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-required="true"
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error && (
                <p id="login-error" role="alert" className="text-xs text-red-500">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {loading ? t.signingIn : t.signIn}
              </button>
            </form>

            {/* Test credentials hint */}
            <div className="mt-6 rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground space-y-1"
              aria-label="Test credentials">
              <p className="font-medium">Test credentials:</p>
              <p>admin / admin123 (Admin)</p>
              <p>dr.wilson / doctor123 (Doctor)</p>
              <p>ahmet.yilmaz / patient123 (Patient)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
