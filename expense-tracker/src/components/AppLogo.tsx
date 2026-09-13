export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200/90 ${box}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className={icon} fill="none" aria-hidden>
        <rect x="4" y="14" width="16" height="6" rx="1.2" fill="currentColor" fillOpacity="0.35" />
        <rect x="5.5" y="9" width="13" height="6" rx="1.2" fill="currentColor" fillOpacity="0.65" />
        <rect x="7" y="4" width="10" height="6" rx="1.2" fill="currentColor" />
      </svg>
    </span>
  )
}
