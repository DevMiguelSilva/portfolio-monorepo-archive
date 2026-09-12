/** Personal mark — warm teal & amber gradient (distinct from ApplyTrack). */
export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box =
    size === 'sm' ? 'h-8 w-8 rounded-lg text-xs' : size === 'lg' ? 'h-12 w-12 rounded-2xl text-base' : 'h-9 w-9 rounded-xl text-sm'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-teal-500 via-emerald-500 to-amber-500 font-display font-bold text-white shadow-sm shadow-teal-200/80 ${box}`}
      aria-hidden
    >
      MS
    </span>
  )
}
