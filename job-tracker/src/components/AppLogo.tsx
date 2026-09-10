/** AI job-search mark: magnifying glass + sparkle on brand gradient. */
export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500 via-track-accent to-violet-600 text-white shadow-sm ${box}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className={icon} fill="none" aria-hidden>
        <path
          d="M10.5 4.5a6 6 0 104.24 10.24l3.76 3.76"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8.5 9.5h4M10.5 7.5v4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M16.5 5.5l.75 1.5 1.5.75-1.5.75-.75 1.5-.75-1.5-1.5-.75 1.5-.75-.75-1.5-1.5-.75.75-1.5z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    </span>
  )
}
