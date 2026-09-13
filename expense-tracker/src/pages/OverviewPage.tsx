import { Link } from 'react-router-dom'
import { MoneyBar } from '../components/MoneyBar'
import { StatCard } from '../components/StatCard'
import { useBudget } from '../hooks/useBudget'
import { btnPrimaryClass, btnSecondaryClass, pageCardClass, sectionLabelClass } from '../lib/appUi'
import { formatMonthLabel } from '../lib/dates'
import { buildInsights, insightToneClass } from '../lib/insights'
import { formatCents } from '../lib/money'
import { methodLabel } from '../types/budget'

export function OverviewPage() {
  const { snapshot, monthKey } = useBudget()
  const insights = buildInsights(snapshot)
  const leftoverTone =
    snapshot.leftoverCents < 0 ? 'alert' : snapshot.leftoverCents > 0 ? 'good' : 'default'

  return (
    <div className="space-y-6">
      <section className={`relative overflow-hidden ${pageCardClass} p-8 sm:p-10`}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50" />
        <div className="relative">
          <p className={sectionLabelClass}>Household budget</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {formatMonthLabel(monthKey)}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Bills, cards, and leftover pots — a bit more detail than the spreadsheet, without a
            second job of bookkeeping.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/budget" className={btnPrimaryClass}>
              Open budget
            </Link>
            <Link to="/cards" className={btnSecondaryClass}>
              Update cards
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Real income"
          value={formatCents(snapshot.realIncomeCents)}
          hint={`Possible ${formatCents(snapshot.possibleIncomeCents)}`}
        />
        <StatCard
          label="Expenses"
          value={formatCents(snapshot.actualExpenseCents)}
          hint={`${formatCents(snapshot.paidExpenseCents)} marked paid`}
        />
        <StatCard
          label="After pots"
          value={formatCents(snapshot.leftoverCents)}
          hint={`Pots ${formatCents(snapshot.distributionCents)}`}
          tone={leftoverTone}
        />
        <StatCard
          label="Card debt"
          value={formatCents(snapshot.totalDebtCents)}
          hint={`${formatCents(snapshot.totalAvailableCents)} available`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={`${pageCardClass} p-5 sm:p-6`}>
          <h2 className="font-display font-semibold text-slate-900">What to watch</h2>
          <ul className="mt-4 space-y-3">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className={`rounded-xl border px-4 py-3 ${insightToneClass(insight.tone)}`}
              >
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="mt-1 text-sm opacity-90">{insight.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${pageCardClass} p-5 sm:p-6`}>
          <h2 className="font-display font-semibold text-slate-900">Income by person</h2>
          <ul className="mt-4 space-y-4">
            {snapshot.incomeByPerson.map((row) => {
              const percent =
                row.possibleCents > 0
                  ? Math.min(100, Math.round((row.realCents / row.possibleCents) * 100))
                  : 0
              return (
                <li key={row.person.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{row.person.name}</span>
                    <span className="text-slate-500">
                      {formatCents(row.realCents)} / {formatCents(row.possibleCents)}
                    </span>
                  </div>
                  <MoneyBar percent={percent} />
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={`${pageCardClass} p-5 sm:p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-slate-900">Unpaid this month</h2>
            <Link to="/budget" className="text-sm font-semibold text-emerald-700">
              Budget →
            </Link>
          </div>
          {snapshot.monthlyLines.filter((row) => !row.month?.paid && row.amountCents > 0).length ===
          0 ? (
            <p className="mt-4 text-sm text-slate-500">Nothing unpaid with an amount yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {snapshot.monthlyLines
                .filter((row) => !row.month?.paid && row.amountCents > 0)
                .slice(0, 8)
                .map((row) => (
                  <li key={row.line.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{row.line.name}</p>
                      <p className="text-xs text-slate-500">
                        {methodLabel(row.line.method)}
                        {row.account ? ` · ${row.account.name}` : ''}
                        {row.line.dueDay ? ` · day ${row.line.dueDay}` : ' · no fixed day'}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCents(row.amountCents)}</p>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className={`${pageCardClass} p-5 sm:p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-slate-900">Card utilization</h2>
            <Link to="/cards" className="text-sm font-semibold text-emerald-700">
              Cards →
            </Link>
          </div>
          <ul className="mt-4 space-y-4">
            {[...snapshot.cards, ...snapshot.storeCards].map((row) => (
              <li key={row.account.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {row.account.name}
                    {row.owner ? ` · ${row.owner.name}` : ''}
                  </span>
                  <span className={row.utilization >= 70 ? 'font-semibold text-amber-700' : 'text-slate-500'}>
                    {row.utilization}%
                  </span>
                </div>
                <MoneyBar percent={row.utilization} overspent={row.utilization >= 90} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
