import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#fff4ea_100%)]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        FitTrack · Built by Miguel Silva
      </footer>
    </div>
  )
}
