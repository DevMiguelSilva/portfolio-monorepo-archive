import { NavLink } from 'react-router-dom'
import { useInbox } from '../hooks/useInbox'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
    isActive ? 'text-brand-primary' : 'text-brand-muted'
  }`

export function MobileTabBar() {
  const { newCount } = useInbox()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 sm:hidden"
    >
      <div className="grid h-16 grid-cols-3 rounded-2xl border border-brand-line bg-white/95 shadow-lg shadow-brand-ink/10 backdrop-blur-md">
        <NavLink to="/" end className={tabClass}>
          <BoardIcon />
          Board
        </NavLink>
        <NavLink to="/portals" className={tabClass}>
          <PortalsIcon />
          Portals
        </NavLink>
        <NavLink to="/inbox" className={tabClass}>
          <span className="relative">
            <InboxIcon />
            {newCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-brand-ink">
                {newCount > 99 ? '99+' : newCount}
              </span>
            )}
          </span>
          Inbox
        </NavLink>
      </div>
    </nav>
  )
}

function BoardIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function PortalsIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" d="M4 12h16M12 4c2.2 2.4 3.3 5.2 3.3 8s-1.1 5.6-3.3 8c-2.2-2.4-3.3-5.2-3.3-8s1.1-5.6 3.3-8z" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l2.2-6.2A2 2 0 017.1 5.5h9.8a2 2 0 011.9 1.3L21 13v4.5a2 2 0 01-2 2H5a2 2 0 01-2-2V13z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h5l1.5 2h5L16 13h5" />
    </svg>
  )
}
