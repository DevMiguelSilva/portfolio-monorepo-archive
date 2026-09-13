import { useState } from 'react'
import { DayInput } from '../components/DayInput'
import { MoneyBar } from '../components/MoneyBar'
import { MoneyInput } from '../components/MoneyInput'
import { useBudget } from '../hooks/useBudget'
import {
  btnPrimaryClass,
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
import type { AccountView } from '../lib/snapshot'
import { ACCOUNT_KINDS, type AccountKind } from '../types/budget'

function CardTable({
  title,
  hint,
  rows,
}: {
  title: string
  hint: string
  rows: AccountView[]
}) {
  const { state, updateAccount, deleteAccount } = useBudget()

  const totalLimit = rows.reduce((sum, row) => sum + row.account.limitCents, 0)
  const totalDebt = rows.reduce((sum, row) => sum + row.account.debtCents, 0)
  const totalPending = rows.reduce((sum, row) => sum + row.account.pendingCents, 0)
  const totalAvailable = rows.reduce((sum, row) => sum + row.availableCents, 0)
  const totalSavings = rows.reduce((sum, row) => sum + row.account.savingsCents, 0)

  return (
    <section className={pageCardClass}>
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-display font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[56rem] w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Card</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Due day</th>
              <th className="px-3 py-2 font-medium text-right">Limit</th>
              <th className="px-3 py-2 font-medium text-right">Debt</th>
              <th className="px-3 py-2 font-medium text-right">Pending</th>
              <th className="px-3 py-2 font-medium text-right">Available</th>
              <th className="px-3 py-2 font-medium text-right">Set aside</th>
              <th className="px-3 py-2 font-medium">Used</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-slate-500">
                  No cards in this group.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.account.id} className="border-b border-slate-50">
                <td className="px-1 py-1">
                  <input
                    className={tableControlClass}
                    value={row.account.name}
                    onChange={(e) => updateAccount(row.account.id, { name: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    className={tableSelectClass}
                    value={row.account.ownerId ?? ''}
                    onChange={(e) =>
                      updateAccount(row.account.id, { ownerId: e.target.value || null })
                    }
                  >
                    <option value="">—</option>
                    {state.people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="w-16 px-1 py-1">
                  <DayInput
                    className={`${tableControlClass} text-center`}
                    day={row.account.dueDay}
                    onCommit={(day) => updateAccount(row.account.id, { dueDay: day })}
                  />
                </td>
                <td className="px-1 py-1">
                  <MoneyInput
                    className={`${tableControlClass} text-right`}
                    cents={row.account.limitCents}
                    onCommit={(cents) => updateAccount(row.account.id, { limitCents: cents })}
                  />
                </td>
                <td className="px-1 py-1">
                  <MoneyInput
                    className={`${tableControlClass} text-right`}
                    cents={row.account.debtCents}
                    onCommit={(cents) => updateAccount(row.account.id, { debtCents: cents })}
                  />
                </td>
                <td className="px-1 py-1">
                  <MoneyInput
                    className={`${tableControlClass} text-right`}
                    cents={row.account.pendingCents}
                    onCommit={(cents) => updateAccount(row.account.id, { pendingCents: cents })}
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium text-emerald-700">
                  {formatCents(row.availableCents)}
                </td>
                <td className="px-1 py-1">
                  <MoneyInput
                    className={`${tableControlClass} text-right`}
                    cents={row.account.savingsCents}
                    onCommit={(cents) => updateAccount(row.account.id, { savingsCents: cents })}
                  />
                </td>
                <td className="w-28 px-3 py-2">
                  <div className="space-y-1">
                    <MoneyBar percent={row.utilization} overspent={row.utilization >= 90} />
                    <p className="text-xs text-slate-500">{row.utilization}%</p>
                  </div>
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-rose-600"
                    onClick={() => {
                      if (window.confirm(`Remove ${row.account.name}?`)) {
                        deleteAccount(row.account.id)
                      }
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-50 text-sm font-semibold text-slate-800">
              <tr>
                <td className="px-3 py-2" colSpan={3}>
                  Total
                </td>
                <td className="px-3 py-2 text-right">{formatCents(totalLimit)}</td>
                <td className="px-3 py-2 text-right">{formatCents(totalDebt)}</td>
                <td className="px-3 py-2 text-right">{formatCents(totalPending)}</td>
                <td className="px-3 py-2 text-right text-emerald-700">{formatCents(totalAvailable)}</td>
                <td className="px-3 py-2 text-right">{formatCents(totalSavings)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}

export function CardsPage() {
  const { snapshot, state, addAccount } = useBudget()
  const [name, setName] = useState('')
  const [ownerId, setOwnerId] = useState(state.people[0]?.id ?? '')
  const [kind, setKind] = useState<AccountKind>('credit')

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageTitleClass}>Cards</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Limit, debt, and pending — available is calculated so you do not have to do the subtraction
          in a cell. Set aside is money parked to pay that card.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${pageCardClass} p-4`}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Total limit</p>
          <p className="mt-1 font-display text-xl font-bold">{formatCents(snapshot.totalLimitCents)}</p>
        </div>
        <div className={`${pageCardClass} p-4`}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Debt</p>
          <p className="mt-1 font-display text-xl font-bold">{formatCents(snapshot.totalDebtCents)}</p>
        </div>
        <div className={`${pageCardClass} p-4`}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Pending</p>
          <p className="mt-1 font-display text-xl font-bold">{formatCents(snapshot.totalPendingCents)}</p>
        </div>
        <div className={`${pageCardClass} p-4`}>
          <p className="text-xs uppercase tracking-wide text-slate-400">Available</p>
          <p className="mt-1 font-display text-xl font-bold text-emerald-700">
            {formatCents(snapshot.totalAvailableCents)}
          </p>
        </div>
      </section>

      <CardTable
        title="Bank cards"
        hint="CIBC, BMO, Rogers — due day, limit, debt, pending."
        rows={snapshot.cards}
      />
      <CardTable
        title="Store cards"
        hint="Walmart and other store credit."
        rows={snapshot.storeCards}
      />

      <form
        className={formPanelClass}
        onSubmit={(e) => {
          e.preventDefault()
          addAccount({ name, ownerId: ownerId || null, kind })
          setName('')
        }}
      >
        <h2 className="font-display text-sm font-semibold text-slate-900">Add card or account</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <label>
            <span className={formLabelClass}>Name</span>
            <input
              className={formControlClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="BMO Miguel"
            />
          </label>
          <label>
            <span className={formLabelClass}>Owner</span>
            <select
              className={formSelectClass}
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              <option value="">Shared</option>
              {state.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={formLabelClass}>Type</span>
            <select
              className={formSelectClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as AccountKind)}
            >
              {ACCOUNT_KINDS.filter((row) => row.id === 'credit' || row.id === 'store').map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <button type="submit" className={btnPrimaryClass}>
            Add card
          </button>
        </div>
      </form>
    </div>
  )
}
