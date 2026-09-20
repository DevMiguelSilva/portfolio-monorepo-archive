export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary/30 border-t-brand-primary" />
      <p className="text-sm text-brand-muted">{label}</p>
    </div>
  )
}
