export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-track-accent/30 border-t-track-accent" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
