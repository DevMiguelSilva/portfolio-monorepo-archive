import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

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
        <h1 className="text-2xl font-bold">Cloud sync not configured</h1>
        <p className="mt-3 text-sm text-slate-500">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable login and cloud backup.
        </p>
        <a href="/" className="mt-6 inline-block text-track-accent hover:underline">
          Continue with local storage →
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-track-700 dark:bg-track-800">
        <h1 className="text-2xl font-bold">ApplyTrack</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in to sync your job applications across devices.
        </p>

        <div className="mt-6 flex rounded-lg bg-slate-100 p-1 dark:bg-track-900">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'signin' ? 'bg-white shadow dark:bg-track-700' : 'text-slate-500'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'signup' ? 'bg-white shadow dark:bg-track-700' : 'text-slate-500'
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              {message}
            </p>
          )}

          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)
              }
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-track-accent py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
