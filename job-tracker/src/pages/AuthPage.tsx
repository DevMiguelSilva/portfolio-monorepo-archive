import { useState } from 'react'
import { AppLogo } from '../components/AppLogo'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'
import { btnPrimaryClass, pageCardClass, sectionLabelClass } from '../lib/appUi'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setMessage('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">Cloud sync not configured</h1>
        <p className="mt-3 text-sm text-slate-500">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable login and cloud backup.
        </p>
        <a href="/" className="mt-6 inline-block font-medium text-sky-600 hover:underline">
          Continue with local storage →
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <div className={`relative overflow-hidden ${pageCardClass} p-8 shadow-glow`}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/50" />
        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <AppLogo />
            <div>
              <p className={sectionLabelClass}>ApplyTrack</p>
              <h1 className="font-display text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="text-sm text-slate-500">Sign in to sync across devices</p>
            </div>
          </div>

          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}
            {message && (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <button type="submit" disabled={loading} className={`w-full ${btnPrimaryClass} py-2.5`}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
