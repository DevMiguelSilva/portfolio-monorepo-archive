export function MoneyBar({
  percent,
  overspent = false,
}: {
  percent: number
  overspent?: boolean
}) {
  const width = Math.min(100, Math.max(0, percent))
  const fill = overspent ? 'bg-rose-500' : 'bg-emerald-500'

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
    </div>
  )
}
