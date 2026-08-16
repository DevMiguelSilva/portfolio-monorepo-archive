import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useJobs } from '../hooks/useJobs'
import { useTheme } from '../hooks/useTheme'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-track-accent text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-track-800'
  }`

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { signOut, isCloudEnabled, user } = useAuth()
  const { isCloudSync } = useJobs()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-track-800 dark:bg-track-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">💼</span>
          <div>
            <span className="font-bold text-track-accent">ApplyTrack</span>
            <span className="ml-2 hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">
              AI Job Tracker
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/" className={navLinkClass} end>
            Board
          </NavLink>
          <NavLink to="/add" className={navLinkClass}>
            Add Job
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Profile
          </NavLink>
          {isCloudSync && (
            <span className="hidden text-xs text-emerald-500 sm:inline" title="Synced to cloud">
              ☁️
            </span>
          )}
          {isCloudEnabled && user && (
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-red-500 dark:text-slate-400"
            >
              Sign out
            </button>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="ml-1 rounded-lg p-2 text-lg transition hover:bg-slate-100 dark:hover:bg-track-800"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
  )
}
