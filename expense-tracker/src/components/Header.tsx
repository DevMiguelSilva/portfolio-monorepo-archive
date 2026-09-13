import { NavLink } from 'react-router-dom'
import { AppLogo } from './AppLogo'
import { MonthPicker } from './MonthPicker'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
    isActive ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-emerald-800'
  }`

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <AppLogo />
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-slate-800">Split</span>
            <span className="text-emerald-600">plan</span>
          </span>
        </NavLink>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/90 p-1">
          <NavLink to="/" className={navLinkClass} end>
            Overview
          </NavLink>
          <NavLink to="/budget" className={navLinkClass}>
            Budget
          </NavLink>
          <NavLink to="/cards" className={navLinkClass}>
            Cards
          </NavLink>
        </nav>

        <MonthPicker />
      </div>
    </header>
  )
}
