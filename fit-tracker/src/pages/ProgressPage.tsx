import { LoadingSpinner } from '../components/LoadingSpinner'
import { StatCard } from '../components/StatCard'
import { useFit } from '../hooks/useFit'
import { pageCardClass, pageTitleClass, sectionLabelClass } from '../lib/appUi'
import { formatWeekLabel, localDateKey, mondayOf } from '../lib/dates'
import { buildWeekReports, formatKg } from '../lib/weeks'

export function ProgressPage() {
  const { state, loading } = useFit()
  const today = localDateKey()
  const reports = buildWeekReports(state, today)
  const current = reports.find((r) => r.monday === mondayOf(today)) ?? reports[0]

  if (loading) return <LoadingSpinner label="Loading progress…" />

  const deltaTone =
    current?.deltaKg == null ? 'default' : current.deltaKg < 0 ? 'good' : current.deltaKg > 0 ? 'warn' : 'default'

  return (
    <div className="space-y-6">
      <section>
        <p className={sectionLabelClass}>Weekly report</p>
        <h1 className={`mt-1 ${pageTitleClass}`}>Progress</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Weekly training and body-weight trends.
        </p>
      </section>

      {current && (
        <section className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="This week avg"
            value={current.avgKg != null ? formatKg(current.avgKg) : '—'}
            hint={
              current.weighIns === 0
                ? 'No weigh-ins yet. Missed days don’t count as 0.'
                : `Average of ${current.weighIns} logged day${current.weighIns === 1 ? '' : 's'} (skipped days don’t count)`
            }
          />
          <StatCard
            label="vs last week"
            value={
              current.deltaKg == null
                ? '—'
                : `${current.deltaKg > 0 ? '+' : ''}${formatKg(current.deltaKg)}`
            }
            hint={current.deltaKg == null ? 'Need two weeks with weigh-ins' : 'Negative means down'}
            tone={deltaTone}
          />
          <StatCard
            label="Days trained"
            value={
              current.trainingGoal != null
                ? `${current.daysTrained} / ${current.trainingGoal}`
                : String(current.daysTrained)
            }
            hint={
              current.trainingGoal != null
                ? `Goal = routines at week start · ${formatWeekLabel(current.monday)}`
                : formatWeekLabel(current.monday)
            }
            tone={
              current.trainingGoal != null && current.daysTrained >= current.trainingGoal ? 'good' : 'default'
            }
          />
          <StatCard
            label="Exercises done"
            value={
              current.exercisesPlanned
                ? `${current.exercisesCompleted}/${current.exercisesPlanned}`
                : String(current.exercisesCompleted)
            }
            hint="Against this week’s planned exercises"
          />
        </section>
      )}

      <section className={`${pageCardClass} overflow-hidden`}>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-display font-semibold text-slate-900">Week by week</h2>
        </div>
        {reports.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Log a weight or start a workout to see weeks here.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reports.map((week) => (
              <li key={week.monday} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{formatWeekLabel(week.monday)}</p>
                  <p className="text-xs text-slate-500">
                    {week.daysTrained} day{week.daysTrained === 1 ? '' : 's'} trained
                    {week.trainingGoal != null ? ` / ${week.trainingGoal} goal` : ''}
                    {week.exercisesPlanned > 0
                      ? ` · ${week.exercisesCompleted}/${week.exercisesPlanned} exercises`
                      : ''}
                    {week.weighIns > 0
                      ? ` · avg of ${week.weighIns} weigh-in${week.weighIns === 1 ? '' : 's'}`
                      : ' · no weigh-ins'}
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {week.avgKg != null ? formatKg(week.avgKg) : 'No kg'}
                </p>
                <p
                  className={`text-sm font-medium ${
                    week.deltaKg == null
                      ? 'text-slate-400'
                      : week.deltaKg < 0
                        ? 'text-emerald-700'
                        : week.deltaKg > 0
                          ? 'text-amber-700'
                          : 'text-slate-500'
                  }`}
                >
                  {week.deltaKg == null
                    ? '—'
                    : `${week.deltaKg > 0 ? '+' : ''}${week.deltaKg.toFixed(1)} kg`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
