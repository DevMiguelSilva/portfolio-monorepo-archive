import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { MobileTabBar } from './MobileTabBar'
import { ScrollToTopButton } from './ScrollToTopButton'

export function Layout() {
  const { pathname } = useLocation()
  const showTabs = pathname !== '/login'
  const onBoard = pathname === '/'

  return (
    <div
      className={`min-h-screen ${
        onBoard ? 'bg-brand-canvas' : 'bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]'
      } ${showTabs ? 'pb-[calc(6.25rem+env(safe-area-inset-bottom))] sm:pb-0' : ''}`}
    >
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        ApplyTrack · Built by Miguel Silva
      </footer>
      {showTabs && <MobileTabBar />}
      <ScrollToTopButton />
    </div>
  )
}
