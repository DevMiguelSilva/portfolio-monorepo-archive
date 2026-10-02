/** Kanban-column mark. Brand tone is the board palette; sky stays on other pages. */
export function AppLogo({ size = 'md', tone = 'sky' }: { size?: 'sm' | 'md'; tone?: 'sky' | 'brand' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'
  const toneClass =
    tone === 'brand'
      ? 'bg-brand-primary text-brand-ink'
      : 'bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-200/90'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${toneClass} ${box}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className={icon} fill="none" aria-hidden>
        <rect x="3" y="5" width="5" height="14" rx="1.25" fill="currentColor" fillOpacity="0.35" />
        <rect x="9.5" y="3" width="5" height="11" rx="1.25" fill="currentColor" fillOpacity="0.65" />
        <rect x="16" y="7" width="5" height="12" rx="1.25" fill="currentColor" />
      </svg>
    </span>
  )
}
