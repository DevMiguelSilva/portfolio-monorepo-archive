import { daysInMonth, isCurrentMonth, referenceDay } from './dates'
import {
  creditAvailableCents,
  creditUsedCents,
  lineAmountCents,
  type Account,
  type BudgetLine,
  type BudgetState,
  type Distribution,
  type IncomeMonth,
  type LineMonth,
  type Person,
} from '../types/budget'

export interface PersonIncome {
  person: Person
  possibleCents: number
  realCents: number
}

export interface LineView {
  line: BudgetLine
  month: LineMonth | undefined
  amountCents: number
  account: Account | undefined
}

export interface AccountView {
  account: Account
  owner: Person | undefined
  availableCents: number
  usedCents: number
  utilization: number
}

export interface MonthSnapshot {
  monthKey: string
  possibleIncomeCents: number
  realIncomeCents: number
  incomeByPerson: PersonIncome[]
  monthlyLines: LineView[]
  annualLines: LineView[]
  plannedExpenseCents: number
  actualExpenseCents: number
  paidExpenseCents: number
  unpaidExpenseCents: number
  distributionCents: number
  distributions: Distribution[]
  leftoverCents: number
  gapVsPossibleCents: number
  upcoming: LineView[]
  overdue: LineView[]
  cards: AccountView[]
  storeCards: AccountView[]
  debitAccounts: AccountView[]
  totalLimitCents: number
  totalDebtCents: number
  totalPendingCents: number
  totalAvailableCents: number
  totalCardSavingsCents: number
}

function incomeFor(state: BudgetState, personId: string, monthKey: string): IncomeMonth | undefined {
  return state.income.find((row) => row.personId === personId && row.monthKey === monthKey)
}

function monthFor(state: BudgetState, lineId: string, monthKey: string): LineMonth | undefined {
  return state.lineMonths.find((row) => row.lineId === lineId && row.monthKey === monthKey)
}

function toLineView(state: BudgetState, line: BudgetLine, monthKey: string): LineView {
  const month = monthFor(state, line.id, monthKey)
  return {
    line,
    month,
    amountCents: lineAmountCents(line, month),
    account: state.accounts.find((row) => row.id === line.accountId),
  }
}

function toAccountView(state: BudgetState, account: Account): AccountView {
  const usedCents = creditUsedCents(account)
  return {
    account,
    owner: state.people.find((row) => row.id === account.ownerId),
    availableCents: creditAvailableCents(account),
    usedCents,
    utilization: account.limitCents > 0 ? Math.round((usedCents / account.limitCents) * 100) : 0,
  }
}

export function buildMonthSnapshot(state: BudgetState, monthKey: string): MonthSnapshot {
  const incomeByPerson: PersonIncome[] = state.people.map((person) => {
    const row = incomeFor(state, person.id, monthKey)
    return {
      person,
      possibleCents: row?.possibleCents ?? 0,
      realCents: row?.realCents ?? 0,
    }
  })

  const possibleIncomeCents = incomeByPerson.reduce((sum, row) => sum + row.possibleCents, 0)
  const realIncomeCents = incomeByPerson.reduce((sum, row) => sum + row.realCents, 0)

  const monthNumber = Number(monthKey.slice(5, 7))
  const monthlyLines = state.lines
    .filter((line) => line.cadence === 'monthly')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((line) => toLineView(state, line, monthKey))

  const annualLines = state.lines
    .filter((line) => line.cadence === 'annual')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((line) => toLineView(state, line, monthKey))

  const dueThisMonth = annualLines.filter(
    (row) => row.line.dueMonth == null || row.line.dueMonth === monthNumber
  )

  const expenseLines = [...monthlyLines, ...dueThisMonth]
  const plannedExpenseCents = expenseLines.reduce((sum, row) => sum + row.line.plannedCents, 0)
  const actualExpenseCents = expenseLines.reduce((sum, row) => sum + row.amountCents, 0)
  const paidExpenseCents = expenseLines
    .filter((row) => row.month?.paid)
    .reduce((sum, row) => sum + row.amountCents, 0)
  const unpaidExpenseCents = actualExpenseCents - paidExpenseCents

  const distributions = state.distributions
    .filter((row) => row.monthKey === monthKey)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
  const distributionCents = distributions.reduce((sum, row) => sum + row.amountCents, 0)

  const today = isCurrentMonth(monthKey) ? referenceDay(monthKey) : 0
  const lastDay = daysInMonth(monthKey)

  const unpaid = monthlyLines.filter((row) => !row.month?.paid && row.amountCents > 0)
  const upcoming = unpaid.filter((row) => {
    if (row.line.dueDay == null) return false
    const due = Math.min(row.line.dueDay, lastDay)
    return due >= today && due <= today + 7
  })
  const overdue = unpaid.filter((row) => {
    if (row.line.dueDay == null || !isCurrentMonth(monthKey)) return false
    return Math.min(row.line.dueDay, lastDay) < today
  })

  const cards = state.accounts.filter((row) => row.kind === 'credit').map((row) => toAccountView(state, row))
  const storeCards = state.accounts.filter((row) => row.kind === 'store').map((row) => toAccountView(state, row))
  const debitAccounts = state.accounts
    .filter((row) => row.kind === 'debit' || row.kind === 'cash')
    .map((row) => toAccountView(state, row))

  const creditViews = [...cards, ...storeCards]

  return {
    monthKey,
    possibleIncomeCents,
    realIncomeCents,
    incomeByPerson,
    monthlyLines,
    annualLines,
    plannedExpenseCents,
    actualExpenseCents,
    paidExpenseCents,
    unpaidExpenseCents,
    distributionCents,
    distributions,
    leftoverCents: realIncomeCents - actualExpenseCents - distributionCents,
    gapVsPossibleCents: possibleIncomeCents - actualExpenseCents,
    upcoming,
    overdue,
    cards,
    storeCards,
    debitAccounts,
    totalLimitCents: creditViews.reduce((sum, row) => sum + row.account.limitCents, 0),
    totalDebtCents: creditViews.reduce((sum, row) => sum + row.account.debtCents, 0),
    totalPendingCents: creditViews.reduce((sum, row) => sum + row.account.pendingCents, 0),
    totalAvailableCents: creditViews.reduce((sum, row) => sum + row.availableCents, 0),
    totalCardSavingsCents: creditViews.reduce((sum, row) => sum + row.account.savingsCents, 0),
  }
}

