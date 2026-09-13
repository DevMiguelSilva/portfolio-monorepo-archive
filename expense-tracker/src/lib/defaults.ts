import type { Account, BudgetLine, BudgetState, Person } from '../types/budget'

function id(): string {
  return crypto.randomUUID()
}

export function createStarterState(): BudgetState {
  const miguel: Person = { id: id(), name: 'Miguel' }
  const sandra: Person = { id: id(), name: 'Sandra' }

  const accounts: Account[] = [
    { id: id(), name: 'CIBC Miguel', ownerId: miguel.id, kind: 'credit', dueDay: 22, limitCents: 0, debtCents: 0, pendingCents: 0, savingsCents: 0 },
    { id: id(), name: 'BMO Miguel', ownerId: miguel.id, kind: 'credit', dueDay: 17, limitCents: 0, debtCents: 0, pendingCents: 0, savingsCents: 0 },
    { id: id(), name: 'Rogers Miguel', ownerId: miguel.id, kind: 'credit', dueDay: null, limitCents: 0, debtCents: 0, pendingCents: 0, savingsCents: 0 },
    { id: id(), name: 'CIBC Sandra', ownerId: sandra.id, kind: 'credit', dueDay: null, limitCents: 0, debtCents: 0, pendingCents: 0, savingsCents: 0 },
    { id: id(), name: 'BMO Sandra', ownerId: sandra.id, kind: 'credit', dueDay: null, limitCents: 0, debtCents: 0, pendingCents: 0, savingsCents: 0 },
    { id: id(), name: 'Walmart Miguel', ownerId: miguel.id, kind: 'store', dueDay: null, limitCents: 0, debtCents: 0, pendingCents: 0, savingsCents: 0 },
    { id: id(), name: 'Walmart Sandra', ownerId: sandra.id, kind: 'store', dueDay: null, limitCents: 0, debtCents: 0, pendingCents: 0, savingsCents: 0 },
    { id: id(), name: 'Cash', ownerId: null, kind: 'cash', dueDay: null, limitCents: 0, debtCents: 0, pendingCents: 0, savingsCents: 0 },
  ]

  const byName = Object.fromEntries(accounts.map((row) => [row.name, row.id]))

  const lines: Array<Omit<BudgetLine, 'id' | 'sortOrder' | 'notes' | 'dueMonth'>> = [
    { name: 'Arriendo', group: 'housing', method: 'debit', accountId: byName['BMO Miguel'] ?? null, plannedCents: 0, dueDay: 1, cadence: 'monthly' },
    { name: 'Servicios', group: 'housing', method: 'debit', accountId: byName['BMO Miguel'] ?? null, plannedCents: 0, dueDay: 15, cadence: 'monthly' },
    { name: 'Internet', group: 'housing', method: 'debit', accountId: byName['BMO Miguel'] ?? null, plannedCents: 0, dueDay: 23, cadence: 'monthly' },
    { name: 'Mercado', group: 'daily', method: 'debit', accountId: byName['BMO Sandra'] ?? null, plannedCents: 0, dueDay: null, cadence: 'monthly' },
    { name: 'Gasolina', group: 'transport', method: 'debit', accountId: byName['BMO Miguel'] ?? null, plannedCents: 0, dueDay: null, cadence: 'monthly' },
    { name: 'Lavado', group: 'transport', method: 'cash', accountId: byName['Cash'] ?? null, plannedCents: 0, dueDay: null, cadence: 'monthly' },
    { name: 'Cuota Sofa', group: 'installments', method: 'credit', accountId: byName['Walmart Miguel'] ?? null, plannedCents: 0, dueDay: 4, cadence: 'monthly' },
    { name: 'Cuota iPhone', group: 'installments', method: 'credit', accountId: byName['Rogers Miguel'] ?? null, plannedCents: 0, dueDay: 15, cadence: 'monthly' },
    { name: 'Cuota Samsung', group: 'installments', method: 'credit', accountId: byName['Rogers Miguel'] ?? null, plannedCents: 0, dueDay: 15, cadence: 'monthly' },
    { name: 'Cuota Carro', group: 'installments', method: 'debit', accountId: byName['BMO Miguel'] ?? null, plannedCents: 0, dueDay: 1, cadence: 'monthly' },
    { name: 'Seguro', group: 'installments', method: 'debit', accountId: byName['BMO Miguel'] ?? null, plannedCents: 0, dueDay: 1, cadence: 'monthly' },
    { name: 'Tratamiento Tobby', group: 'pets', method: 'debit', accountId: byName['BMO Sandra'] ?? null, plannedCents: 0, dueDay: null, cadence: 'monthly' },
    { name: 'Transferencia Colombia', group: 'transfers', method: 'debit', accountId: byName['BMO Miguel'] ?? null, plannedCents: 0, dueDay: null, cadence: 'monthly' },
    { name: 'YT Premium', group: 'subscriptions', method: 'credit', accountId: byName['CIBC Miguel'] ?? null, plannedCents: 0, dueDay: 15, cadence: 'monthly' },
    { name: 'Netflix', group: 'subscriptions', method: 'credit', accountId: byName['CIBC Miguel'] ?? null, plannedCents: 0, dueDay: 15, cadence: 'monthly' },
    { name: 'Crunchyroll', group: 'subscriptions', method: 'credit', accountId: byName['CIBC Miguel'] ?? null, plannedCents: 0, dueDay: 15, cadence: 'monthly' },
    { name: 'ChatGPT', group: 'subscriptions', method: 'credit', accountId: byName['CIBC Miguel'] ?? null, plannedCents: 0, dueDay: 15, cadence: 'monthly' },
    { name: 'Cursor', group: 'subscriptions', method: 'credit', accountId: byName['CIBC Miguel'] ?? null, plannedCents: 0, dueDay: 15, cadence: 'monthly' },
  ]

  return {
    people: [miguel, sandra],
    accounts,
    lines: lines.map((line, index) => ({
      ...line,
      id: id(),
      sortOrder: index,
      notes: '',
      dueMonth: null,
    })),
    lineMonths: [],
    income: [],
    distributions: [],
  }
}

export const STARTER_DISTRIBUTIONS = ['A mano', 'Ahorros', 'Abuelo', 'Tobby']
