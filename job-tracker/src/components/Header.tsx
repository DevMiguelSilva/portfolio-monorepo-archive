import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
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

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50 hover:text-sky-700'
  }`

export function Header() {
  const { signOut, isCloudEnabled, user } = useAuth()
  const { isCloudSync } = useJobs()
  const { newCount } = useInbox()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

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

        <nav className="hidden items-center gap-2 rounded-xl bg-slate-100/90 p-1 sm:flex">
          <NavLink to="/" className={navLinkClass} end>
            Board
          </NavLink>
          <NavLink to="/portals" className={navLinkClass}>
            Portals
          </NavLink>
          <NavLink to="/inbox" className={navLinkClass}>
            Inbox
            <InboxBadge count={newCount} />
          </NavLink>
          <NavLink to="/add" className={navLinkClass}>
            Add
          </NavLink>
          <NavLink to="/cv" className={navLinkClass}>
            CVs
          </NavLink>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {isCloudSync && (
            <span
              className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
              title="Synced to cloud"
            >
              Synced
            </span>
          )}
          <AuthControls isCloudEnabled={isCloudEnabled} signedIn={Boolean(user)} onSignOut={signOut} />
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="border-t border-slate-200/80 px-4 pb-3 sm:hidden">
          <nav className="flex flex-col gap-0.5 py-2">
            <NavLink to="/add" className={mobileNavLinkClass}>
              Add
            </NavLink>
            <NavLink to="/cv" className={mobileNavLinkClass}>
              CVs
            </NavLink>
          </nav>
          {(isCloudSync || isCloudEnabled) && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              {isCloudSync ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Synced
                </span>
              ) : (
                <span />
              )}
              <AuthControls isCloudEnabled={isCloudEnabled} signedIn={Boolean(user)} onSignOut={signOut} />
            </div>
          )}
        </div>
      )}
    </header>
  )
}

function InboxBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  )
}

function AuthControls({
  isCloudEnabled,
  signedIn,
  onSignOut,
}: {
  isCloudEnabled: boolean
  signedIn: boolean
  onSignOut: () => Promise<void>
}) {
  if (!isCloudEnabled) return null
  if (signedIn) {
    return (
      <button
        type="button"
        onClick={onSignOut}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
      >
        Sign out
      </button>
    )
  }
  return (
    <NavLink
      to="/login"
      className="rounded-lg bg-sky-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
    >
      Sign in
    </NavLink>
  )
}
