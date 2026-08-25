import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AppLogo } from './AppLogo'
import { useAuth } from '../hooks/useAuth'
import { useFit } from '../hooks/useFit'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
    isActive ? 'bg-white text-orange-800 shadow-sm' : 'text-slate-600 hover:text-orange-800'
  }`

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-orange-50 text-orange-800' : 'text-slate-700 hover:bg-slate-50 hover:text-orange-800'
  }`

export function Header() {
  const { signOut, isCloudEnabled, user } = useAuth()
  const { isCloudSync } = useFit()
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
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <AppLogo />
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-slate-800">Fit</span>
            <span className="text-orange-600">Track</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-xl bg-slate-100/90 p-1 sm:flex">
          <NavLink to="/" className={navLinkClass} end>
            Today
          </NavLink>
          <NavLink to="/routines" className={navLinkClass}>
            Routines
          </NavLink>
          <NavLink to="/progress" className={navLinkClass}>
            Progress
          </NavLink>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {isCloudSync && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Synced
            </span>
          )}
          <AuthControls isCloudEnabled={isCloudEnabled} signedIn={Boolean(user)} onSignOut={signOut} />
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 sm:hidden"
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
            <NavLink to="/" className={mobileNavLinkClass} end>
              Today
            </NavLink>
            <NavLink to="/routines" className={mobileNavLinkClass}>
              Routines
            </NavLink>
            <NavLink to="/progress" className={mobileNavLinkClass}>
              Progress
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
        onClick={() => void onSignOut()}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
      >
        Sign out
      </button>
    )
  }
  return (
    <NavLink
      to="/login"
      className="rounded-lg bg-orange-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
    >
      Sign in
    </NavLink>
  )
}
