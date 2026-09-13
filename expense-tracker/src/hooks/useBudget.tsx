import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { monthKeyFromDate, shiftMonth } from '../lib/dates'
import { STARTER_DISTRIBUTIONS, createStarterState } from '../lib/defaults'
import { buildMonthSnapshot } from '../lib/snapshot'
import type {
  Account,
  AccountKind,
  BudgetLine,
  BudgetState,
  LineCadence,
  LineGroup,
  PayMethod,
} from '../types/budget'

const STORAGE_KEY = 'splitplan-household-v2'

interface BudgetContextValue {
  monthKey: string
  setMonthKey: (key: string) => void
  state: BudgetState
  snapshot: ReturnType<typeof buildMonthSnapshot>
  upsertIncome: (personId: string, field: 'possibleCents' | 'realCents', amountCents: number) => void
  addPerson: (name: string) => void
  updatePerson: (id: string, name: string) => void
  addLine: (input: {
    name: string
    group: LineGroup
    method: PayMethod
    accountId: string | null
    plannedCents: number
    dueDay: number | null
    dueMonth: number | null
    cadence: LineCadence
  }) => void
  updateLine: (id: string, updates: Partial<BudgetLine>) => void
  deleteLine: (id: string) => void
  setLineActual: (lineId: string, actualCents: number | null) => void
  setLinePaid: (lineId: string, paid: boolean) => void
  addAccount: (input: { name: string; ownerId: string | null; kind: AccountKind }) => void
  updateAccount: (id: string, updates: Partial<Account>) => void
  deleteAccount: (id: string) => void
  upsertDistribution: (id: string | null, name: string, amountCents: number) => void
  deleteDistribution: (id: string) => void
  seedMonthPots: () => void
  copyPreviousMonth: () => boolean
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

function readState(): BudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createStarterState()
    const parsed = JSON.parse(raw) as Partial<BudgetState>
    const starter = createStarterState()
    return {
      people: Array.isArray(parsed.people) && parsed.people.length > 0 ? parsed.people : starter.people,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : starter.accounts,
      lines: Array.isArray(parsed.lines) ? parsed.lines : starter.lines,
      lineMonths: Array.isArray(parsed.lineMonths) ? parsed.lineMonths : [],
      income: Array.isArray(parsed.income) ? parsed.income : [],
      distributions: Array.isArray(parsed.distributions) ? parsed.distributions : [],
    }
  } catch {
    return createStarterState()
  }
}

function writeState(state: BudgetState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function upsertLineMonth(
  prev: BudgetState,
  lineId: string,
  monthKey: string,
  patch: { actualCents?: number | null; paid?: boolean }
): BudgetState {
  const existing = prev.lineMonths.find((row) => row.lineId === lineId && row.monthKey === monthKey)
  if (existing) {
    return {
      ...prev,
      lineMonths: prev.lineMonths.map((row) =>
        row === existing
          ? {
              ...row,
              actualCents: patch.actualCents !== undefined ? patch.actualCents : row.actualCents,
              paid: patch.paid !== undefined ? patch.paid : row.paid,
            }
          : row
      ),
    }
  }
  return {
    ...prev,
    lineMonths: [
      ...prev.lineMonths,
      {
        lineId,
        monthKey,
        actualCents: patch.actualCents ?? null,
        paid: patch.paid ?? false,
      },
    ],
  }
}

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDate())
  const [state, setState] = useState<BudgetState>(() => readState())

  useEffect(() => {
    writeState(state)
  }, [state])

  const snapshot = useMemo(() => buildMonthSnapshot(state, monthKey), [state, monthKey])

  const upsertIncome = useCallback(
    (personId: string, field: 'possibleCents' | 'realCents', amountCents: number) => {
      const next = Math.max(0, amountCents)
      setState((prev) => {
        const existing = prev.income.find((row) => row.personId === personId && row.monthKey === monthKey)
        if (existing) {
          return {
            ...prev,
            income: prev.income.map((row) =>
              row === existing ? { ...row, [field]: next } : row
            ),
          }
        }
        return {
          ...prev,
          income: [
            ...prev.income,
            {
              personId,
              monthKey,
              possibleCents: field === 'possibleCents' ? next : 0,
              realCents: field === 'realCents' ? next : 0,
            },
          ],
        }
      })
    },
    [monthKey]
  )

  const addPerson = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      people: [...prev.people, { id: crypto.randomUUID(), name: trimmed }],
    }))
  }, [])

  const updatePerson = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      people: prev.people.map((row) => (row.id === id ? { ...row, name: trimmed } : row)),
    }))
  }, [])

  const addLine = useCallback(
    (input: {
      name: string
      group: LineGroup
      method: PayMethod
      accountId: string | null
      plannedCents: number
      dueDay: number | null
      dueMonth: number | null
      cadence: LineCadence
    }) => {
      const name = input.name.trim()
      if (!name) return
      setState((prev) => {
        const sortOrder = prev.lines.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1
        const line: BudgetLine = {
          id: crypto.randomUUID(),
          name,
          group: input.group,
          method: input.method,
          accountId: input.accountId,
          plannedCents: Math.max(0, input.plannedCents),
          dueDay: input.dueDay,
          dueMonth: input.dueMonth,
          cadence: input.cadence,
          sortOrder,
          notes: '',
        }
        return { ...prev, lines: [...prev.lines, line] }
      })
    },
    []
  )

  const updateLine = useCallback((id: string, updates: Partial<BudgetLine>) => {
    setState((prev) => ({
      ...prev,
      lines: prev.lines.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    }))
  }, [])

  const deleteLine = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      lines: prev.lines.filter((row) => row.id !== id),
      lineMonths: prev.lineMonths.filter((row) => row.lineId !== id),
    }))
  }, [])

  const setLineActual = useCallback(
    (lineId: string, actualCents: number | null) => {
      setState((prev) => upsertLineMonth(prev, lineId, monthKey, { actualCents }))
    },
    [monthKey]
  )

  const setLinePaid = useCallback(
    (lineId: string, paid: boolean) => {
      setState((prev) => upsertLineMonth(prev, lineId, monthKey, { paid }))
    },
    [monthKey]
  )

  const addAccount = useCallback((input: { name: string; ownerId: string | null; kind: AccountKind }) => {
    const name = input.name.trim()
    if (!name) return
    setState((prev) => ({
      ...prev,
      accounts: [
        ...prev.accounts,
        {
          id: crypto.randomUUID(),
          name,
          ownerId: input.ownerId,
          kind: input.kind,
          dueDay: null,
          limitCents: 0,
          debtCents: 0,
          pendingCents: 0,
          savingsCents: 0,
        },
      ],
    }))
  }, [])

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    }))
  }, [])

  const deleteAccount = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((row) => row.id !== id),
      lines: prev.lines.map((row) =>
        row.accountId === id ? { ...row, accountId: null } : row
      ),
    }))
  }, [])

  const upsertDistribution = useCallback(
    (id: string | null, name: string, amountCents: number) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const amount = Math.max(0, amountCents)
      setState((prev) => {
        if (id) {
          return {
            ...prev,
            distributions: prev.distributions.map((row) =>
              row.id === id ? { ...row, name: trimmed, amountCents: amount } : row
            ),
          }
        }
        return {
          ...prev,
          distributions: [
            ...prev.distributions,
            { id: crypto.randomUUID(), name: trimmed, monthKey, amountCents: amount },
          ],
        }
      })
    },
    [monthKey]
  )

  const deleteDistribution = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      distributions: prev.distributions.filter((row) => row.id !== id),
    }))
  }, [])

  const seedMonthPots = useCallback(() => {
    setState((prev) => {
      const existing = new Set(
        prev.distributions.filter((row) => row.monthKey === monthKey).map((row) => row.name)
      )
      const extra = STARTER_DISTRIBUTIONS.filter((name) => !existing.has(name)).map((name) => ({
        id: crypto.randomUUID(),
        name,
        monthKey,
        amountCents: 0,
      }))
      if (extra.length === 0) return prev
      return { ...prev, distributions: [...prev.distributions, ...extra] }
    })
  }, [monthKey])

  const copyPreviousMonth = useCallback(() => {
    const prevKey = shiftMonth(monthKey, -1)
    const prevIncome = state.income.filter((row) => row.monthKey === prevKey)
    const prevPots = state.distributions.filter((row) => row.monthKey === prevKey)
    if (prevIncome.length === 0 && prevPots.length === 0) return false
    setState((prev) => {
      const income = [
        ...prev.income.filter((row) => row.monthKey !== monthKey),
        ...prevIncome.map((row) => ({ ...row, monthKey })),
      ]
      const distributions = [
        ...prev.distributions.filter((row) => row.monthKey !== monthKey),
        ...prevPots.map((row) => ({ ...row, id: crypto.randomUUID(), monthKey })),
      ]
      return { ...prev, income, distributions }
    })
    return true
  }, [monthKey, state.distributions, state.income])

  const value = useMemo(
    () => ({
      monthKey,
      setMonthKey,
      state,
      snapshot,
      upsertIncome,
      addPerson,
      updatePerson,
      addLine,
      updateLine,
      deleteLine,
      setLineActual,
      setLinePaid,
      addAccount,
      updateAccount,
      deleteAccount,
      upsertDistribution,
      deleteDistribution,
      seedMonthPots,
      copyPreviousMonth,
    }),
    [
      monthKey,
      state,
      snapshot,
      upsertIncome,
      addPerson,
      updatePerson,
      addLine,
      updateLine,
      deleteLine,
      setLineActual,
      setLinePaid,
      addAccount,
      updateAccount,
      deleteAccount,
      upsertDistribution,
      deleteDistribution,
      seedMonthPots,
      copyPreviousMonth,
    ]
  )

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget() {
  const ctx = useContext(BudgetContext)
  if (!ctx) throw new Error('useBudget must be used inside BudgetProvider')
  return ctx
}
