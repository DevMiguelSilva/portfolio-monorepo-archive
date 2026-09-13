import { useMemo, useState } from 'react'
import { DayInput } from '../components/DayInput'
import { MoneyInput } from '../components/MoneyInput'
import { useBudget } from '../hooks/useBudget'
import {
  btnGhostClass,
  btnPrimaryClass,
  btnSecondaryClass,
  formControlClass,
  formLabelClass,
  formPanelClass,
  formSelectClass,
  pageCardClass,
  pageTitleClass,
  tableControlClass,
  tableSelectClass,
} from '../lib/appUi'
import { formatCents } from '../lib/money'
import {
  LINE_GROUPS,
  PAY_METHODS,
  type LineCadence,
  type LineGroup,
  type PayMethod,
} from '../types/budget'
import type { LineView } from '../lib/snapshot'

function LineTable({
  rows,
  showDueMonth = false,
}: {
  rows: LineView[]
  showDueMonth?: boolean
}) {
  const { state, updateLine, deleteLine, setLineActual, setLinePaid } = useBudget()
  const grouped = useMemo(() => {
    const map = new Map<LineGroup, LineView[]>()
    for (const row of rows) {
      const list = map.get(row.line.group) ?? []
      list.push(row)
      map.set(row.line.group, list)
    }
    return LINE_GROUPS.filter((group) => map.has(group.id)).map((group) => ({
      group,
      rows: map.get(group.id) ?? [],
    }))
  }, [rows])

  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-slate-500">No lines yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[52rem] w-full text-left text-sm">
        <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-2 font-medium">Paid</th>
            <th className="px-3 py-2 font-medium">Expense</th>
            <th className="px-3 py-2 font-medium">Method</th>
            <th className="px-3 py-2 font-medium">Card</th>
            <th className="px-3 py-2 font-medium text-right">Planned</th>
            <th className="px-3 py-2 font-medium text-right">Actual</th>
            <th className="px-3 py-2 font-medium">Day</th>
            {showDueMonth && <th className="px-3 py-2 font-medium">Month</th>}
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        {grouped.map(({ group, rows: groupRows }) => (
          <tbody key={group.id} className="border-b border-slate-100 last:border-0">
            <tr className="bg-slate-50/80">
              <td colSpan={showDueMonth ? 9 : 8} className="px-3 py-1.5 text-xs font-semibold text-slate-500">
                {group.label}
              </td>
            </tr>
            {groupRows.map((row) => (
              <tr key={row.line.id} className={row.month?.paid ? 'bg-emerald-50/40' : ''}>
                <td className="px-3 py-1">
                  <input
                    type="checkbox"
                    checked={Boolean(row.month?.paid)}
                    onChange={(e) => setLinePaid(row.line.id, e.target.checked)}
                    aria-label={`Paid ${row.line.name}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={tableControlClass}
                    value={row.line.name}
                    onChange={(e) => updateLine(row.line.id, { name: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    className={tableSelectClass}
                    value={row.line.method}
                    onChange={(e) => updateLine(row.line.id, { method: e.target.value as PayMethod })}
                  >
                    {PAY_METHODS.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select
                    className={tableSelectClass}
                    value={row.line.accountId ?? ''}
                    onChange={(e) =>
                      updateLine(row.line.id, { accountId: e.target.value || null })
                    }
                  >
                    <option value="">—</option>
                    {state.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <MoneyInput
                    className={`${tableControlClass} text-right`}
                    cents={row.line.plannedCents}
                    onCommit={(cents) => updateLine(row.line.id, { plannedCents: cents })}
                    ariaLabel={`${row.line.name} planned`}
                  />
                </td>
                <td className="px-1 py-1">
                  <MoneyInput
                    className={`${tableControlClass} text-right`}
                    cents={row.month?.actualCents ?? 0}
                    onCommit={(cents) => setLineActual(row.line.id, cents === 0 ? null : cents)}
                    ariaLabel={`${row.line.name} actual`}
                    placeholder="same"
                  />
                </td>
                <td className="w-16 px-1 py-1">
                  <DayInput
                    className={`${tableControlClass} text-center`}
                    day={row.line.dueDay}
                    onCommit={(day) => updateLine(row.line.id, { dueDay: day })}
                    ariaLabel={`${row.line.name} day`}
                  />
                </td>
                {showDueMonth && (
                  <td className="w-16 px-1 py-1">
                    <input
                      className={`${tableControlClass} text-center`}
                      inputMode="numeric"
                      defaultValue={row.line.dueMonth ?? ''}
                      onBlur={(e) => {
                        const value = Number(e.target.value)
                        updateLine(row.line.id, {
                          dueMonth:
                            Number.isInteger(value) && value >= 1 && value <= 12 ? value : null,
                        })
                      }}
                    />
                  </td>
                )}
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-rose-600"
                    onClick={() => {
                      if (window.confirm(`Remove ${row.line.name}?`)) deleteLine(row.line.id)
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

export function BudgetPage() {
  const {
    snapshot,
    state,
    addLine,
    upsertIncome,
    upsertDistribution,
    deleteDistribution,
    seedMonthPots,
    copyPreviousMonth,
    addPerson,
  } = useBudget()

  const [message, setMessage] = useState<string | null>(null)
  const [personName, setPersonName] = useState('')
  const [draft, setDraft] = useState({
    name: '',
    group: 'other' as LineGroup,
    method: 'debit' as PayMethod,
    accountId: '',
    dueDay: '',
    cadence: 'monthly' as LineCadence,
  })

  const flash = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 2200)
  }

  const leftoverTone =
    snapshot.leftoverCents < 0
      ? 'text-rose-700'
      : snapshot.leftoverCents > 0
        ? 'text-emerald-700'
        : 'text-slate-900'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={pageTitleClass}>Monthly budget</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Same sheet as Excel: each bill has a method, card, planned amount, and due day. Actual
            is for variable spend (Mercado, gas). Check paid when it goes out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondaryClass}
            onClick={() => flash(copyPreviousMonth() ? 'Copied last month’s income and pots' : 'Nothing to copy')}
          >
            Copy last month
          </button>
          <button type="button" className={btnGhostClass} onClick={() => { seedMonthPots(); flash('Added A mano, Ahorros, Abuelo, Tobby') }}>
            Add leftover pots
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${pageCardClass} p-4`}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Possible income</p>
          <p className="mt-1 font-display text-xl font-bold">{formatCents(snapshot.possibleIncomeCents)}</p>
        </div>
        <div className={`${pageCardClass} p-4`}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Real income</p>
          <p className="mt-1 font-display text-xl font-bold">{formatCents(snapshot.realIncomeCents)}</p>
        </div>
        <div className={`${pageCardClass} p-4`}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Expenses (actual)</p>
          <p className="mt-1 font-display text-xl font-bold">{formatCents(snapshot.actualExpenseCents)}</p>
        </div>
        <div className={`${pageCardClass} p-4`}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Left after pots</p>
          <p className={`mt-1 font-display text-xl font-bold ${leftoverTone}`}>
            {formatCents(snapshot.leftoverCents)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className={pageCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="font-display font-semibold text-slate-900">Expenses</h2>
              <p className="text-xs text-slate-500">
                {snapshot.monthlyLines.filter((row) => row.month?.paid).length}/
                {snapshot.monthlyLines.length} paid · unpaid{' '}
                {formatCents(snapshot.unpaidExpenseCents)}
              </p>
            </div>
          </div>
          <LineTable rows={snapshot.monthlyLines} />
        </section>

        <div className="space-y-6">
          <section className={`${pageCardClass} p-4`}>
            <h2 className="font-display font-semibold text-slate-900">Income</h2>
            <p className="mt-1 text-xs text-slate-500">Possible vs what actually arrived.</p>
            <ul className="mt-3 space-y-3">
              {snapshot.incomeByPerson.map((row) => (
                <li key={row.person.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{row.person.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label>
                      <span className={formLabelClass}>Possible</span>
                      <MoneyInput
                        className={formControlClass}
                        cents={row.possibleCents}
                        onCommit={(cents) => upsertIncome(row.person.id, 'possibleCents', cents)}
                      />
                    </label>
                    <label>
                      <span className={formLabelClass}>Real</span>
                      <MoneyInput
                        className={formControlClass}
                        cents={row.realCents}
                        onCommit={(cents) => upsertIncome(row.person.id, 'realCents', cents)}
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addPerson(personName)
                setPersonName('')
              }}
            >
              <input
                className={formControlClass}
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Add person"
              />
              <button type="submit" className={btnGhostClass}>
                Add
              </button>
            </form>
          </section>

          <section className={`${pageCardClass} p-4`}>
            <h2 className="font-display font-semibold text-slate-900">Leftover pots</h2>
            <p className="mt-1 text-xs text-slate-500">A mano, Ahorros, Abuelo, Tobby…</p>
            <ul className="mt-3 space-y-2">
              {snapshot.distributions.map((row) => (
                <li key={row.id} className="flex items-center gap-2">
                  <input
                    className={formControlClass}
                    defaultValue={row.name}
                    onBlur={(e) => upsertDistribution(row.id, e.target.value, row.amountCents)}
                  />
                  <MoneyInput
                    className={`${formControlClass} w-28`}
                    cents={row.amountCents}
                    onCommit={(cents) => upsertDistribution(row.id, row.name, cents)}
                  />
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-rose-600"
                    onClick={() => deleteDistribution(row.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${btnGhostClass} mt-3`}
              onClick={() => upsertDistribution(null, 'New pot', 0)}
            >
              Add pot
            </button>
            <p className="mt-3 text-sm text-slate-500">
              Pots total {formatCents(snapshot.distributionCents)}
            </p>
          </section>
        </div>
      </div>

      <section className={pageCardClass}>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-display font-semibold text-slate-900">Annual expenses</h2>
          <p className="text-xs text-slate-500">Insurance, licences, trips — due month 1–12.</p>
        </div>
        <LineTable rows={snapshot.annualLines} showDueMonth />
      </section>

      <form
        className={formPanelClass}
        onSubmit={(e) => {
          e.preventDefault()
          const due = Number(draft.dueDay)
          addLine({
            name: draft.name,
            group: draft.group,
            method: draft.method,
            accountId: draft.accountId || null,
            plannedCents: 0,
            dueDay: Number.isInteger(due) && due >= 1 && due <= 31 ? due : null,
            dueMonth: null,
            cadence: draft.cadence,
          })
          setDraft({ ...draft, name: '', dueDay: '' })
        }}
      >
        <h2 className="font-display text-sm font-semibold text-slate-900">Add expense line</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className={formLabelClass}>Name</span>
            <input
              className={formControlClass}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Spotify"
            />
          </label>
          <label>
            <span className={formLabelClass}>Group</span>
            <select
              className={formSelectClass}
              value={draft.group}
              onChange={(e) => setDraft({ ...draft, group: e.target.value as LineGroup })}
            >
              {LINE_GROUPS.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={formLabelClass}>Method</span>
            <select
              className={formSelectClass}
              value={draft.method}
              onChange={(e) => setDraft({ ...draft, method: e.target.value as PayMethod })}
            >
              {PAY_METHODS.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={formLabelClass}>Card</span>
            <select
              className={formSelectClass}
              value={draft.accountId}
              onChange={(e) => setDraft({ ...draft, accountId: e.target.value })}
            >
              <option value="">—</option>
              {state.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={formLabelClass}>Cadence</span>
            <select
              className={formSelectClass}
              value={draft.cadence}
              onChange={(e) => setDraft({ ...draft, cadence: e.target.value as LineCadence })}
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </label>
        </div>
        <div>
          <button type="submit" className={btnPrimaryClass}>
            Add line
          </button>
        </div>
      </form>
    </div>
  )
}
