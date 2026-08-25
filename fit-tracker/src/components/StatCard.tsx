import { pageCardClass } from '../lib/appUi'

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'good' | 'warn' | 'alert'
}) {
  const valueClass =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'warn'
        ? 'text-amber-700'
        : tone === 'alert'
          ? 'text-rose-700'
          : 'text-slate-900'

  return (
    <div className={`${pageCardClass} p-4 sm:p-5`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
