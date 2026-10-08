'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Loader2, AlertCircle } from 'lucide-react'
import { login } from '@/lib/api'
import { useAuth, type UserRole } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { LANGUAGE_LABELS, type Language } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { t, lang, setLang } = useI18n()
  const { setUser } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched]   = useState({ username: false, password: false })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const usernameError = touched.username && !username.trim() ? `${t.username} is required` : ''
  const passwordError = touched.password && !password ? `${t.password} is required` : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ username: true, password: true })
    if (!username.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await login({ username, password })
      setUser({ username: res.username, role: res.role as UserRole })
      router.push('/')
    } catch (err) {
      // fetch() network failures surface as TypeError; API errors are plain {title, detail} objects
      setError(err instanceof TypeError ? 'Server unreachable. Please try again.' : t.loginError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground flex-shrink-0" aria-hidden="true">
            <Calendar className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm truncate">{t.appName}</span>
        </div>
        <div>
          <label htmlFor="lang-select" className="sr-only">Language</label>
          <select
            id="lang-select"
            value={lang}
            onChange={e => setLang(e.target.value as Language)}
            className="field-input !w-auto !py-1.5"
          >
            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm min-w-0">
          <div className="rounded-[var(--radius-xl)] border border-border bg-card p-6 sm:p-8 shadow-card">
            <h1 className="text-xl font-semibold text-center mb-1">{t.loginTitle}</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">{t.appSubtitle}</p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="Login form">
              <div>
                <label htmlFor="username" className="field-label">{t.username}</label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onBlur={() => setTouched(v => ({ ...v, username: true }))}
                  aria-invalid={!!usernameError}
                  aria-describedby={usernameError ? 'username-error' : undefined}
                  className="field-input"
                />
                {usernameError && <p id="username-error" className="field-error">{usernameError}</p>}
              </div>
              <div>
                <label htmlFor="password" className="field-label">{t.password}</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setTouched(v => ({ ...v, password: true }))}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className="field-input"
                />
                {passwordError && <p id="password-error" className="field-error">{passwordError}</p>}
              </div>

              {error && (
                <div id="login-error" role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary w-full">
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {loading ? t.signingIn : t.signIn}
              </button>
            </form>
          </div>

          {/* Demo accounts */}
          <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 text-xs text-muted-foreground space-y-0.5" aria-label="Test credentials">
            <p className="font-medium text-foreground">Test credentials</p>
            <p>admin / admin123 (Admin)</p>
            <p>dr.wilson / doctor123 (Doctor)</p>
            <p>ahmet.yilmaz / patient123 (Patient)</p>
          </div>
        </div>
      </main>
    </div>
  )
}
