export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm shadow-orange-200/90 ${box}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className={icon} fill="none" aria-hidden>
        <path d="M4 12h4M16 12h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="8" y="9.5" width="8" height="5" rx="1.2" fill="currentColor" />
        <rect x="3" y="8.5" width="2" height="7" rx="0.9" fill="currentColor" fillOpacity="0.85" />
        <rect x="19" y="8.5" width="2" height="7" rx="0.9" fill="currentColor" fillOpacity="0.85" />
      </svg>
    </span>
  )
}
