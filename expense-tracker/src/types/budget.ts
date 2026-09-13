export type PayMethod = 'debit' | 'credit' | 'cash'
export type AccountKind = 'credit' | 'store' | 'debit' | 'cash'
export type LineCadence = 'monthly' | 'annual'
export type LineGroup =
  | 'housing'
  | 'daily'
  | 'installments'
  | 'transport'
  | 'pets'
  | 'transfers'
  | 'subscriptions'
  | 'other'

export interface Person {
  id: string
  name: string
}

export interface Account {
  id: string
  name: string
  ownerId: string | null
  kind: AccountKind
  dueDay: number | null
  limitCents: number
  debtCents: number
  pendingCents: number
  savingsCents: number
}

export interface BudgetLine {
  id: string
  name: string
  group: LineGroup
  method: PayMethod
  accountId: string | null
  plannedCents: number
  dueDay: number | null
  dueMonth: number | null
  cadence: LineCadence
  sortOrder: number
  notes: string
}

export interface LineMonth {
  lineId: string
  monthKey: string
  actualCents: number | null
  paid: boolean
}

export interface IncomeMonth {
  personId: string
  monthKey: string
  possibleCents: number
  realCents: number
}

export interface Distribution {
  id: string
  name: string
  monthKey: string
  amountCents: number
}

export interface BudgetState {
  people: Person[]
  accounts: Account[]
  lines: BudgetLine[]
  lineMonths: LineMonth[]
  income: IncomeMonth[]
  distributions: Distribution[]
}

export const PAY_METHODS: { id: PayMethod; label: string }[] = [
  { id: 'debit', label: 'Debit' },
  { id: 'credit', label: 'Credit' },
  { id: 'cash', label: 'Cash' },
]

export const ACCOUNT_KINDS: { id: AccountKind; label: string }[] = [
  { id: 'credit', label: 'Credit card' },
  { id: 'store', label: 'Store card' },
  { id: 'debit', label: 'Debit' },
  { id: 'cash', label: 'Cash' },
]

export const LINE_GROUPS: { id: LineGroup; label: string }[] = [
  { id: 'housing', label: 'Housing' },
  { id: 'daily', label: 'Daily / groceries' },
  { id: 'installments', label: 'Installments' },
  { id: 'transport', label: 'Transport' },
  { id: 'pets', label: 'Pets' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'other', label: 'Other' },
]

export function groupLabel(group: LineGroup): string {
  return LINE_GROUPS.find((row) => row.id === group)?.label ?? group
}

export function methodLabel(method: PayMethod): string {
  return PAY_METHODS.find((row) => row.id === method)?.label ?? method
}

export function lineAmountCents(line: BudgetLine, month: LineMonth | undefined): number {
  if (month?.actualCents != null) return month.actualCents
  return line.plannedCents
}

export function creditAvailableCents(account: Account): number {
  return Math.max(0, account.limitCents - account.debtCents - account.pendingCents)
}

export function creditUsedCents(account: Account): number {
  return account.debtCents + account.pendingCents
}

export function isCreditLike(kind: AccountKind): boolean {
  return kind === 'credit' || kind === 'store'
}
