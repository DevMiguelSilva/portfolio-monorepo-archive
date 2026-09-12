import { Link, NavLink } from 'react-router-dom'
import { AppLogo } from './AppLogo'
import { useAuth } from '../hooks/useAuth'
import { useInbox } from '../hooks/useInbox'
import { useJobs } from '../hooks/useJobs'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-white text-sky-700 shadow-sm'
      : 'text-slate-600 hover:text-sky-700'
  }`

export function Header() {
  const { signOut, isCloudEnabled, user } = useAuth()
  const { isCloudSync } = useJobs()
  const { newCount } = useInbox()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <AppLogo />
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-slate-800">Apply</span>
            <span className="text-sky-600">Track</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100/90 p-1">
          <NavLink to="/" className={navLinkClass} end>
            Board
          </NavLink>
          <NavLink to="/portals" className={navLinkClass}>
            Portals
          </NavLink>
          <NavLink to="/inbox" className={navLinkClass}>
            Inbox
            {newCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
                {newCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/add" className={navLinkClass}>
            Add
          </NavLink>
          <NavLink to="/cv" className={navLinkClass}>
            CVs
          </NavLink>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {isCloudSync && (
            <span
              className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 sm:inline"
              title="Synced to cloud"
            >
              Synced
            </span>
          )}
          {isCloudEnabled &&
            (user ? (
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              >
                Sign out
              </button>
            ) : (
              <NavLink
                to="/login"
                className="rounded-lg bg-sky-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                Sign in
              </NavLink>
            ))}
        </div>
      </div>
    </header>
  )
}
