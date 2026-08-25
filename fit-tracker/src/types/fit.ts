export interface Routine {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Exercise {
  id: string
  routineId: string
  name: string
  sets: number
  reps: number
  /** Lift load in pounds. Null when bodyweight / no load. */
  loadLb: number | null
  sortOrder: number
}

export interface Session {
  id: string
  /** Local calendar date YYYY-MM-DD */
  date: string
  routineId: string
  /** Exercise ids marked done (legacy keys `${id}:${setIndex}` still count). */
  completedSets: string[]
  /** Load used this session in lb. Missing key = use the routine default. */
  actualLoads: Record<string, number>
  /** True after the user finishes the workout and closes it. */
  finished: boolean
  updatedAt: string
}

export interface WeightEntry {
  id: string
  /** Local calendar date YYYY-MM-DD */
  date: string
  kg: number
  updatedAt: string
}

export interface FitState {
  routines: Routine[]
  exercises: Exercise[]
  sessions: Session[]
  weights: WeightEntry[]
  weekGoals: WeekGoal[]
}

export interface WeekGoal {
  id: string
  /** Monday YYYY-MM-DD */
  monday: string
  goal: number
}

export const EMPTY_FIT_STATE: FitState = {
  routines: [],
  exercises: [],
  sessions: [],
  weights: [],
  weekGoals: [],
}

export const DEFAULT_SETS = 4
export const DEFAULT_REPS = 8

export function setKey(exerciseId: string, setIndex: number): string {
  return `${exerciseId}:${setIndex}`
}

export function parseSetKey(key: string): { exerciseId: string; setIndex: number } | null {
  const idx = key.lastIndexOf(':')
  if (idx <= 0) return null
  const exerciseId = key.slice(0, idx)
  const setIndex = Number(key.slice(idx + 1))
  if (!exerciseId || !Number.isInteger(setIndex) || setIndex < 0) return null
  return { exerciseId, setIndex }
}

export function isExerciseComplete(session: Session, exerciseId: string): boolean {
  if (session.completedSets.includes(exerciseId)) return true
  return session.completedSets.some((key) => key.startsWith(`${exerciseId}:`))
}

export function isRoutineComplete(session: Session, exercises: Exercise[]): boolean {
  const list = exercises.filter((ex) => ex.routineId === session.routineId)
  return list.length > 0 && list.every((ex) => isExerciseComplete(session, ex.id))
}

export function sessionLoadLb(session: Session | undefined, exercise: Exercise): number | null {
  const loads = session?.actualLoads
  if (loads && Object.prototype.hasOwnProperty.call(loads, exercise.id)) {
    return loads[exercise.id]
  }
  return exercise.loadLb
}
