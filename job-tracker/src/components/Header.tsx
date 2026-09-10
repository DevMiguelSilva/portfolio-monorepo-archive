import { Link, NavLink } from 'react-router-dom'
import { AppLogo } from './AppLogo'
import { useAuth } from '../hooks/useAuth'
import { useInbox } from '../hooks/useInbox'
import { useJobs } from '../hooks/useJobs'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-track-accent text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-track-800'
  }`

export function Header() {
  const { signOut, isCloudEnabled, user } = useAuth()
  const { isCloudSync } = useJobs()
  const { newCount } = useInbox()
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-track-800 dark:bg-track-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <AppLogo />
          <div>
            <span className="font-bold text-track-accent">ApplyTrack</span>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          <NavLink to="/" className={navLinkClass} end>
            Board
          </NavLink>
          <NavLink to="/portals" className={navLinkClass}>
            Portals
          </NavLink>
          <NavLink to="/inbox" className={navLinkClass}>
            Inbox
            {newCount > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{newCount}</span>
            )}
          </NavLink>
          <NavLink to="/add" className={navLinkClass}>
            Add
          </NavLink>
          <NavLink to="/cv" className={navLinkClass}>
            CVs
          </NavLink>
          {isCloudSync && (
            <span className="hidden text-xs text-emerald-600 sm:inline" title="Synced to cloud">
              ☁️ Synced
            </span>
          )}
          {isCloudEnabled &&
            (user ? (
              <button
                type="button"
                onClick={() => signOut()}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                Sign out
              </button>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `${navLinkClass({ isActive })} shrink-0`
                }
              >
                Sign in
              </NavLink>
            ))}
        </nav>
      </div>
    </header>
  )
}
