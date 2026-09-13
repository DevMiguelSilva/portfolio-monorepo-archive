import { formatMonthLabel, isCurrentMonth } from './dates'
import { formatCents } from './money'
import type { MonthSnapshot } from './snapshot'

export type InsightTone = 'good' | 'info' | 'warn' | 'alert'

export interface BudgetInsight {
  id: string
  tone: InsightTone
  title: string
  detail: string
}

const TONE_STYLES: Record<InsightTone, string> = {
  good: 'border-emerald-100 bg-emerald-50/80 text-emerald-900',
  info: 'border-sky-100 bg-sky-50/80 text-sky-900',
  warn: 'border-amber-100 bg-amber-50/80 text-amber-950',
  alert: 'border-rose-100 bg-rose-50/80 text-rose-950',
}

export function insightToneClass(tone: InsightTone): string {
  return TONE_STYLES[tone]
}

export function buildInsights(snapshot: MonthSnapshot): BudgetInsight[] {
  const insights: BudgetInsight[] = []
  const month = formatMonthLabel(snapshot.monthKey)

  if (snapshot.realIncomeCents === 0 && snapshot.possibleIncomeCents === 0) {
    insights.push({
      id: 'no-income',
      tone: 'info',
      title: 'Add possible and real income',
      detail: `On the Budget page, enter what ${month} could pay (possible) and what actually landed (real) for each person.`,
    })
  }

  if (snapshot.possibleIncomeCents > 0 && snapshot.realIncomeCents === 0) {
    insights.push({
      id: 'waiting-pay',
      tone: 'warn',
      title: 'Possible income is set, real is still $0',
      detail: 'Update real amounts when paycheques clear so leftover is honest.',
    })
  }

  if (snapshot.realIncomeCents > 0 && snapshot.realIncomeCents < snapshot.possibleIncomeCents) {
    insights.push({
      id: 'income-gap',
      tone: 'warn',
      title: `${formatCents(snapshot.possibleIncomeCents - snapshot.realIncomeCents)} less than possible`,
      detail: 'Real income is under the plan. Trim variable lines (Mercado, gas) or wait for the next deposit.',
    })
  }

  if (snapshot.actualExpenseCents === 0) {
    insights.push({
      id: 'no-expenses',
      tone: 'info',
      title: 'Fill planned amounts on each bill',
      detail: 'Same list as your spreadsheet: method, card, day, and amount. Actual can differ for Mercado or gas.',
    })
  } else if (snapshot.leftoverCents < 0) {
    insights.push({
      id: 'short',
      tone: 'alert',
      title: `Short ${formatCents(Math.abs(snapshot.leftoverCents))} this month`,
      detail: 'Real income does not cover expenses plus pots (A mano, Ahorros…). Cut a line or move a distribution.',
    })
  } else if (snapshot.realIncomeCents > 0) {
    insights.push({
      id: 'ok',
      tone: 'good',
      title: `${formatCents(snapshot.leftoverCents)} left after bills and pots`,
      detail: 'That leftover is unassigned — park it in A mano or Ahorros so it does not disappear.',
    })
  }

  if (snapshot.overdue.length > 0 && isCurrentMonth(snapshot.monthKey)) {
    insights.push({
      id: 'overdue',
      tone: 'alert',
      title: `${snapshot.overdue.length} unpaid bill${snapshot.overdue.length === 1 ? '' : 's'} past due day`,
      detail: snapshot.overdue.map((row) => row.line.name).join(', '),
    })
  } else if (snapshot.upcoming.length > 0) {
    insights.push({
      id: 'upcoming',
      tone: 'info',
      title: `${snapshot.upcoming.length} due in the next 7 days`,
      detail: snapshot.upcoming
        .map((row) => `${row.line.name} (day ${row.line.dueDay})`)
        .join(', '),
    })
  }

  const hotCards = [...snapshot.cards, ...snapshot.storeCards].filter((row) => row.utilization >= 70)
  if (hotCards.length > 0) {
    insights.push({
      id: 'cards',
      tone: 'warn',
      title: 'High card utilization',
      detail: hotCards
        .map((row) => `${row.account.name} ${row.utilization}%`)
        .join(' · '),
    })
  }

  if (snapshot.totalDebtCents > 0) {
    insights.push({
      id: 'debt',
      tone: 'info',
      title: `${formatCents(snapshot.totalDebtCents)} card debt`,
      detail: `${formatCents(snapshot.totalAvailableCents)} available across cards. Pending ${formatCents(snapshot.totalPendingCents)} is already counted against the limit.`,
    })
  }

  return insights.slice(0, 6)
}
