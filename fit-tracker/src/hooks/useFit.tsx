import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  exerciseToRow,
  routineToRow,
  rowToExercise,
  rowToRoutine,
  rowToSession,
  rowToWeekGoal,
  rowToWeight,
  sessionToRow,
  weekGoalToRow,
  weightToRow,
  type ExerciseRow,
  type RoutineRow,
  type SessionRow,
  type WeekGoalRow,
  type WeightRow,
} from '../lib/database'
import { isInWeek, localDateKey, mondayOf, nowIso } from '../lib/dates'
import { MIGRATED_KEY, readLocalFit, writeLocalFit } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { EMPTY_FIT_STATE, isExerciseComplete, isRoutineComplete, type Exercise, type FitState, type Routine, type WeekGoal } from '../types/fit'
import { useAuth } from './useAuth'

interface FitContextValue {
  state: FitState
  loading: boolean
  isCloudSync: boolean
  addRoutine: (name: string) => Promise<Routine>
  renameRoutine: (id: string, name: string) => Promise<void>
  deleteRoutine: (id: string) => Promise<void>
  addExercise: (input: {
    routineId: string
    name: string
    sets: number
    reps: number
    loadLb: number | null
  }) => Promise<void>
  updateExercise: (
    id: string,
    updates: Partial<Pick<Exercise, 'name' | 'sets' | 'reps' | 'loadLb'>>
  ) => Promise<void>
  deleteExercise: (id: string) => Promise<void>
  startSession: (date: string, routineId: string) => Promise<void>
  clearSession: (date: string) => Promise<void>
  toggleExercise: (date: string, exerciseId: string) => Promise<void>
  finishSession: (date: string) => Promise<void>
  setSessionLoad: (date: string, exerciseId: string, loadLb: number | null) => Promise<void>
  setWeight: (date: string, kg: number | null) => Promise<void>
}

const FitContext = createContext<FitContextValue | null>(null)

function newId(): string {
  return crypto.randomUUID()
}

export function FitProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [state, setState] = useState<FitState>(EMPTY_FIT_STATE)
  const stateRef = useRef(state)
  const [loading, setLoading] = useState(true)
  const isCloudSync = isCloudEnabled && Boolean(user)

  const commit = useCallback((next: FitState) => {
    stateRef.current = next
    writeLocalFit(next)
    setState(next)
  }, [])

  const loadState = useCallback(async () => {
    setLoading(true)
    try {
      if (!isCloudSync || !supabase || !user) {
        const localOnly = readLocalFit()
        stateRef.current = localOnly
        setState(localOnly)
        return
      }

      const [routinesRes, exercisesRes, sessionsRes, weightsRes, goalsRes] = await Promise.all([
        supabase.from('routines').select('*').eq('user_id', user.id),
        supabase.from('exercises').select('*').eq('user_id', user.id).order('sort_order'),
        supabase.from('sessions').select('*').eq('user_id', user.id),
        supabase.from('weight_entries').select('*').eq('user_id', user.id),
        supabase.from('week_goals').select('*').eq('user_id', user.id),
      ])

      if (routinesRes.error) throw routinesRes.error
      if (exercisesRes.error) throw exercisesRes.error
      if (sessionsRes.error) throw sessionsRes.error
      if (weightsRes.error) throw weightsRes.error

      let cloud: FitState = {
        routines: (routinesRes.data as RoutineRow[]).map(rowToRoutine),
        exercises: (exercisesRes.data as ExerciseRow[]).map(rowToExercise),
        sessions: (sessionsRes.data as SessionRow[]).map(rowToSession),
        weights: (weightsRes.data as WeightRow[]).map(rowToWeight),
        weekGoals: goalsRes.error ? [] : (goalsRes.data as WeekGoalRow[]).map(rowToWeekGoal),
      }

      const local = readLocalFit()
      const alreadyMigrated = localStorage.getItem(MIGRATED_KEY) === user.id
      const localHasData =
        local.routines.length +
          local.exercises.length +
          local.sessions.length +
          local.weights.length +
          local.weekGoals.length >
        0
      const cloudEmpty =
        cloud.routines.length +
          cloud.exercises.length +
          cloud.sessions.length +
          cloud.weights.length +
          cloud.weekGoals.length ===
        0

      if (!alreadyMigrated && localHasData && cloudEmpty) {
        await Promise.all([
          local.routines.length
            ? supabase.from('routines').upsert(local.routines.map((r) => routineToRow(r, user.id)))
            : Promise.resolve(),
          local.exercises.length
            ? supabase.from('exercises').upsert(local.exercises.map((e) => exerciseToRow(e, user.id)))
            : Promise.resolve(),
          local.sessions.length
            ? supabase.from('sessions').upsert(local.sessions.map((s) => sessionToRow(s, user.id)))
            : Promise.resolve(),
          local.weights.length
            ? supabase.from('weight_entries').upsert(local.weights.map((w) => weightToRow(w, user.id)))
            : Promise.resolve(),
          local.weekGoals.length
            ? supabase.from('week_goals').upsert(local.weekGoals.map((g) => weekGoalToRow(g, user.id)))
            : Promise.resolve(),
        ])
        localStorage.setItem(MIGRATED_KEY, user.id)
        cloud = local
      } else if (alreadyMigrated === false) {
        localStorage.setItem(MIGRATED_KEY, user.id)
      }

      writeLocalFit(cloud)
      stateRef.current = cloud
      setState(cloud)
    } catch (err) {
      console.error('FitTrack cloud load failed; using local data.', err)
      const localFallback = readLocalFit()
      stateRef.current = localFallback
      setState(localFallback)
    } finally {
      setLoading(false)
    }
  }, [isCloudSync, user])

  useEffect(() => {
    void loadState()
  }, [loadState])

  useEffect(() => {
    if (loading) return
    const current = stateRef.current
    const monday = mondayOf(localDateKey())
    if (current.weekGoals.some((g) => g.monday === monday)) return
    if (current.routines.length === 0) return
    const goal: WeekGoal = { id: newId(), monday, goal: current.routines.length }
    commit({ ...current, weekGoals: [...current.weekGoals, goal] })
    if (isCloudSync && supabase && user) {
      void supabase.from('week_goals').upsert(weekGoalToRow(goal, user.id))
    }
  }, [commit, isCloudSync, loading, state.routines.length, state.weekGoals, user])

  const addRoutine = useCallback(
    async (name: string) => {
      const current = stateRef.current
      const trimmed = name.trim()
      const routine: Routine = {
        id: newId(),
        name: trimmed || 'Untitled routine',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      commit({ ...current, routines: [...current.routines, routine] })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('routines').insert(routineToRow(routine, user.id))
        if (error) throw error
      }
      return routine
    },
    [commit, isCloudSync, user]
  )

  const renameRoutine = useCallback(
    async (id: string, name: string) => {
      const current = stateRef.current
      const trimmed = name.trim()
      const updatedAt = nowIso()
      commit({
        ...current,
        routines: current.routines.map((r) =>
          r.id === id ? { ...r, name: trimmed || r.name, updatedAt } : r
        ),
      })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase
          .from('routines')
          .update({ name: trimmed || name, updated_at: updatedAt })
          .eq('id', id)
          .eq('user_id', user.id)
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const deleteRoutine = useCallback(
    async (id: string) => {
      const current = stateRef.current
      commit({
        ...current,
        routines: current.routines.filter((r) => r.id !== id),
        exercises: current.exercises.filter((e) => e.routineId !== id),
      })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('routines').delete().eq('id', id).eq('user_id', user.id)
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const addExercise = useCallback(
    async (input: {
      routineId: string
      name: string
      sets: number
      reps: number
      loadLb: number | null
    }) => {
      const current = stateRef.current
      const siblings = current.exercises.filter((e) => e.routineId === input.routineId)
      const exercise: Exercise = {
        id: newId(),
        routineId: input.routineId,
        name: input.name.trim() || 'Exercise',
        sets: Math.max(1, Math.round(input.sets)),
        reps: Math.max(1, Math.round(input.reps)),
        loadLb: input.loadLb,
        sortOrder: siblings.length,
      }
      commit({ ...current, exercises: [...current.exercises, exercise] })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('exercises').insert(exerciseToRow(exercise, user.id))
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const updateExercise = useCallback(
    async (id: string, updates: Partial<Pick<Exercise, 'name' | 'sets' | 'reps' | 'loadLb'>>) => {
      const current = stateRef.current
      const nextExercises = current.exercises.map((e) => {
        if (e.id !== id) return e
        return {
          ...e,
          name: updates.name != null ? updates.name.trim() || e.name : e.name,
          sets: updates.sets != null ? Math.max(1, Math.round(updates.sets)) : e.sets,
          reps: updates.reps != null ? Math.max(1, Math.round(updates.reps)) : e.reps,
          loadLb: updates.loadLb !== undefined ? updates.loadLb : e.loadLb,
        }
      })
      commit({ ...current, exercises: nextExercises })
      if (isCloudSync && supabase && user) {
        const exercise = nextExercises.find((e) => e.id === id)
        if (!exercise) return
        const { error } = await supabase
          .from('exercises')
          .update({
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            load_lb: exercise.loadLb,
            updated_at: nowIso(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const deleteExercise = useCallback(
    async (id: string) => {
      const current = stateRef.current
      commit({ ...current, exercises: current.exercises.filter((e) => e.id !== id) })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('exercises').delete().eq('id', id).eq('user_id', user.id)
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const startSession = useCallback(
    async (date: string, routineId: string) => {
      const current = stateRef.current
      const monday = mondayOf(date)
      const usedOtherDay = current.sessions.find(
        (s) => s.routineId === routineId && isInWeek(s.date, monday) && s.date !== date
      )
      if (usedOtherDay) return
      const existing = current.sessions.find((s) => s.date === date)
      const session = {
        id: existing?.id ?? newId(),
        date,
        routineId,
        completedSets: [],
        actualLoads: {},
        finished: false,
        updatedAt: nowIso(),
      }
      const sessions = existing
        ? current.sessions.map((s) => (s.date === date ? session : s))
        : [...current.sessions, session]
      commit({ ...current, sessions })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('sessions').upsert(sessionToRow(session, user.id))
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const clearSession = useCallback(
    async (date: string) => {
      const current = stateRef.current
      const existing = current.sessions.find((s) => s.date === date)
      commit({ ...current, sessions: current.sessions.filter((s) => s.date !== date) })
      if (existing && isCloudSync && supabase && user) {
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', existing.id)
          .eq('user_id', user.id)
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const toggleExercise = useCallback(
    async (date: string, exerciseId: string) => {
      const current = stateRef.current
      const existing = current.sessions.find((s) => s.date === date)
      if (!existing) return
      const done = isExerciseComplete(existing, exerciseId)
      const without = existing.completedSets.filter(
        (key) => key !== exerciseId && !key.startsWith(`${exerciseId}:`)
      )
      const completedSets = done ? without : [...without, exerciseId]
      const next = {
        ...existing,
        actualLoads: existing.actualLoads ?? {},
        completedSets,
        finished: existing.finished && isRoutineComplete({ ...existing, completedSets }, current.exercises),
        updatedAt: nowIso(),
      }
      commit({
        ...current,
        sessions: current.sessions.map((s) => (s.id === next.id ? next : s)),
      })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('sessions').upsert(sessionToRow(next, user.id))
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const finishSession = useCallback(
    async (date: string) => {
      const current = stateRef.current
      const existing = current.sessions.find((s) => s.date === date)
      if (!existing || !isRoutineComplete(existing, current.exercises)) return
      const session = { ...existing, finished: true, updatedAt: nowIso() }
      commit({
        ...current,
        sessions: current.sessions.map((s) => (s.id === session.id ? session : s)),
      })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('sessions').upsert(sessionToRow(session, user.id))
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const setSessionLoad = useCallback(
    async (date: string, exerciseId: string, loadLb: number | null) => {
      const current = stateRef.current
      const existing = current.sessions.find((s) => s.date === date)
      if (!existing) return
      const actualLoads = { ...(existing.actualLoads ?? {}) }
      if (loadLb == null) delete actualLoads[exerciseId]
      else actualLoads[exerciseId] = loadLb
      const session = { ...existing, actualLoads, updatedAt: nowIso() }
      commit({
        ...current,
        sessions: current.sessions.map((s) => (s.id === session.id ? session : s)),
      })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('sessions').upsert(sessionToRow(session, user.id))
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const setWeight = useCallback(
    async (date: string, kg: number | null) => {
      const current = stateRef.current
      const existing = current.weights.find((w) => w.date === date)
      if (kg == null) {
        commit({ ...current, weights: current.weights.filter((w) => w.date !== date) })
        if (existing && isCloudSync && supabase && user) {
          const { error } = await supabase
            .from('weight_entries')
            .delete()
            .eq('id', existing.id)
            .eq('user_id', user.id)
          if (error) throw error
        }
        return
      }
      const entry = {
        id: existing?.id ?? newId(),
        date,
        kg,
        updatedAt: nowIso(),
      }
      const weights = existing
        ? current.weights.map((w) => (w.date === date ? entry : w))
        : [...current.weights, entry]
      commit({ ...current, weights })
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('weight_entries').upsert(weightToRow(entry, user.id))
        if (error) throw error
      }
    },
    [commit, isCloudSync, user]
  )

  const value = useMemo(
    () => ({
      state,
      loading,
      isCloudSync,
      addRoutine,
      renameRoutine,
      deleteRoutine,
      addExercise,
      updateExercise,
      deleteExercise,
      startSession,
      clearSession,
      toggleExercise,
      finishSession,
      setSessionLoad,
      setWeight,
    }),
    [
      state,
      loading,
      isCloudSync,
      addRoutine,
      renameRoutine,
      deleteRoutine,
      addExercise,
      updateExercise,
      deleteExercise,
      startSession,
      clearSession,
      toggleExercise,
      finishSession,
      setSessionLoad,
      setWeight,
    ]
  )

  return <FitContext.Provider value={value}>{children}</FitContext.Provider>
}

export function useFit() {
  const context = useContext(FitContext)
  if (!context) throw new Error('useFit must be used within FitProvider')
  return context
}
