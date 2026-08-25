import { EMPTY_FIT_STATE, type FitState } from '../types/fit'

export const STORAGE_KEY = 'fittrack-v1'
export const MIGRATED_KEY = 'fittrack-migrated'

export function readLocalFit(): FitState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...EMPTY_FIT_STATE }
    const parsed = JSON.parse(stored) as Partial<FitState>
    return {
      routines: parsed.routines ?? [],
      exercises: parsed.exercises ?? [],
      sessions: (parsed.sessions ?? []).map((session) => ({
        ...session,
        completedSets: session.completedSets ?? [],
        actualLoads: session.actualLoads ?? {},
        finished: session.finished ?? false,
      })),
      weights: parsed.weights ?? [],
      weekGoals: parsed.weekGoals ?? [],
    }
  } catch {
    return { ...EMPTY_FIT_STATE }
  }
}

export function writeLocalFit(state: FitState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
