import { formatMonthLabel, shiftMonth } from '../lib/dates'
import { btnGhostClass } from '../lib/appUi'
import { useBudget } from '../hooks/useBudget'

export function MonthPicker() {
  const { monthKey, setMonthKey } = useBudget()

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`${btnGhostClass} px-3`}
        onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
        aria-label="Previous month"
      >
        ←
      </button>
      <p className="min-w-[9.5rem] text-center text-sm font-semibold text-slate-800">
        {formatMonthLabel(monthKey)}
      </p>
      <button
        type="button"
        className={`${btnGhostClass} px-3`}
        onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
        aria-label="Next month"
      >
        →
      </button>
    </div>
  )
}
