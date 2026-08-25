import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useFit } from '../hooks/useFit'
import {
  btnGhostClass,
  btnPrimaryClass,
  btnSecondaryClass,
  formControlClass,
  formLabelClass,
  pageCardClass,
  pageTitleClass,
  sectionLabelClass,
} from '../lib/appUi'
import {
  formatLongDate,
  formatShortWeekday,
  isInWeek,
  localDateKey,
  mondayOf,
  shiftDateKey,
} from '../lib/dates'
import { formatLb, parsePositiveNumber, routineUsedOn, weekGoalFor } from '../lib/weeks'
import { isExerciseComplete, isRoutineComplete, sessionLoadLb, type Exercise, type Session } from '../types/fit'

function weekGoalMessage(trained: number, goal: number): string {
  if (goal <= 0) return 'Add routines to set this week’s training goal.'
  if (trained >= goal) return `You hit this week’s goal — ${trained} of ${goal}.`
  if (trained === 0) return `Let’s go — 0 of ${goal} training days.`
  return `${trained} of ${goal} — keep going.`
}

export function TodayPage() {
  const { state, loading, startSession, clearSession, toggleExercise, finishSession, setSessionLoad, setWeight } = useFit()
  const [date, setDate] = useState(localDateKey)
  const [weightDraft, setWeightDraft] = useState<string | null>(null)
  const [editingWeight, setEditingWeight] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [reviewDate, setReviewDate] = useState<string | null>(null)
  const today = localDateKey()
  const isToday = date === today
  const monday = mondayOf(date)

  const daySession = state.sessions.find((s) => s.date === date)
  const dayFinished = Boolean(daySession?.finished)
  const reviewSession = reviewDate ? state.sessions.find((s) => s.date === reviewDate) : undefined
  const viewingReview = Boolean(reviewSession && (reviewSession.date !== date || dayFinished))
  const session = viewingReview ? reviewSession : dayFinished ? undefined : daySession
  const routine = session ? state.routines.find((r) => r.id === session.routineId) : undefined
  const preview = previewId ? state.routines.find((r) => r.id === previewId) : undefined
  const exercises = useMemo(() => {
    const routineId = session?.routineId ?? previewId
    if (!routineId) return []
    return state.exercises
      .filter((e) => e.routineId === routineId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [previewId, session, state.exercises])
  const dayExercises = useMemo(() => {
    if (!daySession) return []
    return state.exercises.filter((e) => e.routineId === daySession.routineId)
  }, [daySession, state.exercises])
  const weight = state.weights.find((w) => w.date === date)
  const weightValue = weightDraft ?? (weight ? String(weight.kg) : '')
  const missingWeight = !weight
  const goal = weekGoalFor(state, monday)
  const trainedThisWeek = new Set(state.sessions.filter((s) => isInWeek(s.date, monday)).map((s) => s.date)).size
  const goalPct = goal && goal > 0 ? Math.min(100, Math.round((trainedThisWeek / goal) * 100)) : 0
  const doneThisWeek = state.sessions
    .filter((s) => isInWeek(s.date, monday) && (s.date !== date || dayFinished))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const openRoutines = state.routines.filter((item) => !routineUsedOn(state, monday, item.id))
  const anyExerciseDone = Boolean(daySession && dayExercises.some((ex) => isExerciseComplete(daySession, ex.id)))
  const allExercisesDone = Boolean(session && isRoutineComplete(session, exercises))
  const showDayOverview = !viewingReview && !preview
  const planned = exercises.length
  const done = exercises.filter((ex) => (session ? isExerciseComplete(session, ex.id) : false)).length

  if (loading) return <LoadingSpinner label="Loading today…" />

  const saveWeight = async () => {
    const parsed = parsePositiveNumber(weightValue)
    await setWeight(date, parsed)
    setWeightDraft(null)
    setEditingWeight(false)
  }

  const changeDay = (next: string) => {
    setDate(next)
    setWeightDraft(null)
    setEditingWeight(false)
    setPreviewId(null)
    setReviewDate(null)
  }

  const openReview = (sessionDate: string) => {
    setPreviewId(null)
    setReviewDate(sessionDate)
  }

  return (
    <div className="space-y-6">
      <section className={`relative overflow-hidden ${pageCardClass} p-6 sm:p-8`}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/40" />
        <div className="relative">
          <p className={sectionLabelClass}>{isToday ? 'Today' : 'Earlier'}</p>
          <h1 className={`mt-1 ${pageTitleClass}`}>{formatLongDate(date)}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Workout and body weight for this day.
          </p>
          {goal != null && (
            <div className="mt-4 max-w-md">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-orange-900">{weekGoalMessage(trainedThisWeek, goal)}</p>
                <p className="shrink-0 text-xs font-medium text-orange-700">
                  {trainedThisWeek}/{goal}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100">
                <div
                  className="h-full rounded-full bg-orange-500 transition-[width]"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className={btnGhostClass} onClick={() => changeDay(shiftDateKey(date, -1))}>
              Previous day
            </button>
            {!isToday && (
              <button type="button" className={btnGhostClass} onClick={() => changeDay(today)}>
                Back to today
              </button>
            )}
            <button
              type="button"
              className={btnGhostClass}
              disabled={date >= today}
              onClick={() => changeDay(shiftDateKey(date, 1))}
            >
              Next day
            </button>
          </div>
        </div>
      </section>

      {isToday && missingWeight && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Reminder: log today’s body weight in kg before you forget.
        </div>
      )}

      <section className={`${pageCardClass} p-5 sm:p-6 ${isToday && missingWeight ? 'ring-2 ring-amber-200' : ''}`}>
        <h2 className="font-display font-semibold text-slate-900">Body weight</h2>
        <p className={formLabelClass}>Daily weigh-in in kilograms.</p>
        {weight && !editingWeight ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="font-display text-2xl font-bold text-slate-900">{weight.kg.toFixed(1)} kg</p>
            <button
              type="button"
              className={btnGhostClass}
              onClick={() => {
                setWeightDraft(String(weight.kg))
                setEditingWeight(true)
              }}
            >
              Update
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-[10rem] flex-1">
              <span className="sr-only">Body weight in kilograms</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="e.g. 82.4"
                value={weightValue}
                onChange={(e) => setWeightDraft(e.target.value)}
                className={formControlClass}
              />
            </label>
            <button type="button" className={btnPrimaryClass} onClick={() => void saveWeight()}>
              Save kg
            </button>
            {weight && (
              <button
                type="button"
                className={btnGhostClass}
                onClick={() => {
                  setWeightDraft(null)
                  setEditingWeight(false)
                }}
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </section>

      <section className={`${pageCardClass} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-slate-900">Workout</h2>
            <p className={formLabelClass}>The session for this day. Lifts are in pounds.</p>
          </div>
          {session && (
            <p className="text-sm font-medium text-slate-500">
              {done}/{planned} exercise{planned === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {viewingReview && reviewDate && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-950">
            <p>
              Viewing {formatShortWeekday(reviewDate)}
              {routine ? ` · ${routine.name}` : ''}
            </p>
            <button type="button" className={btnGhostClass} onClick={() => setReviewDate(null)}>
              Back
            </button>
          </div>
        )}

        {showDayOverview && doneThisWeek.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-500">Already done this week</p>
            {doneThisWeek.map((item) => {
              const name = state.routines.find((r) => r.id === item.routineId)?.name ?? 'Deleted routine'
              const count = state.exercises.filter((e) => e.routineId === item.routineId).length
              const isThisDay = item.date === date
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">
                      {count} exercise{count === 1 ? '' : 's'} · done{' '}
                      {isThisDay ? 'this day' : formatShortWeekday(item.date)}
                    </p>
                  </div>
                  <button type="button" className={btnSecondaryClass} onClick={() => openReview(item.date)}>
                    View
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {showDayOverview && dayFinished && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-500">Left this week</p>
            {openRoutines.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing left — this week’s routines are done.</p>
            ) : (
              openRoutines.map((item) => {
                const count = state.exercises.filter((e) => e.routineId === item.id).length
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {count} exercise{count === 1 ? '' : 's'} · for another day
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}

        {!daySession && showDayOverview && state.routines.length === 0 && (
          <p className="mt-4 text-sm text-slate-600">
            No routines yet.{' '}
            <Link to="/routines" className="font-semibold text-orange-700 hover:underline">
              Create one
            </Link>
            .
          </p>
        )}

        {!daySession && !viewingReview && preview && (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-semibold text-slate-800">Preview · {preview.name}</p>
            {exercises.length === 0 ? (
              <p className="text-sm text-slate-500">This routine has no exercises yet.</p>
            ) : (
              <ul className="space-y-2">
                {exercises.map((exercise) => (
                  <li
                    key={exercise.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm text-slate-700"
                  >
                    <span className="font-semibold text-slate-900">{exercise.name}</span>
                    <span className="text-slate-500">
                      {' '}
                      · {exercise.sets} × {exercise.reps}
                      {exercise.loadLb != null ? ` · ${formatLb(exercise.loadLb)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhostClass} onClick={() => setPreviewId(null)}>
                Back to list
              </button>
              <button
                type="button"
                className={btnPrimaryClass}
                onClick={() => {
                  void startSession(date, preview.id)
                  setPreviewId(null)
                }}
              >
                Start this workout
              </button>
            </div>
          </div>
        )}

        {!daySession && showDayOverview && openRoutines.length > 0 && (
          <div className="mt-4 grid gap-2">
            <p className="text-sm text-slate-600">Pick a routine to train.</p>
            {openRoutines.map((item) => {
              const count = state.exercises.filter((e) => e.routineId === item.id).length
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {count} exercise{count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnGhostClass} onClick={() => setPreviewId(item.id)}>
                      Look
                    </button>
                    <button
                      type="button"
                      className={btnPrimaryClass}
                      onClick={() => void startSession(date, item.id)}
                    >
                      Start
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {session && (viewingReview || (daySession && !dayFinished)) && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{routine?.name ?? 'Deleted routine'}</p>
              {!viewingReview && !anyExerciseDone && (
                <button
                  type="button"
                  className={btnGhostClass}
                  onClick={() => {
                    void clearSession(date)
                    setPreviewId(null)
                  }}
                >
                  Change routine
                </button>
              )}
            </div>

            {exercises.length === 0 && (
              <p className="text-sm text-slate-500">This routine has no exercises yet.</p>
            )}

            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                session={session}
                readOnly={viewingReview && session.date !== date}
                onToggle={() => void toggleExercise(session.date, exercise.id)}
                onLoadChange={(loadLb) => void setSessionLoad(session.date, exercise.id, loadLb)}
              />
            ))}

            {!viewingReview && allExercisesDone && (
              <button
                type="button"
                className={btnPrimaryClass}
                onClick={() => {
                  void finishSession(date)
                  setReviewDate(null)
                }}
              >
                Finish workout
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function ExerciseCard({
  exercise,
  session,
  readOnly = false,
  onToggle,
  onLoadChange,
}: {
  exercise: Exercise
  session: Session
  readOnly?: boolean
  onToggle: () => void
  onLoadChange: (loadLb: number | null) => void
}) {
  const [editingLoad, setEditingLoad] = useState(false)
  const [loadDraft, setLoadDraft] = useState('')
  const checked = isExerciseComplete(session, exercise.id)
  const usedLb = sessionLoadLb(session, exercise)

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <label className={`flex items-start gap-3 ${readOnly ? '' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={readOnly}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-400 disabled:opacity-70"
        />
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold ${checked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            {exercise.name}
          </h3>
          <p className="text-xs text-slate-500">
            {exercise.sets} × {exercise.reps}
          </p>
        </div>
      </label>
      <div className="mt-2 pl-7">
        {readOnly ? (
          <p className="text-sm font-medium text-slate-800">{usedLb != null ? formatLb(usedLb) : 'No load'}</p>
        ) : editingLoad ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="w-28">
              <span className={formLabelClass}>lb</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={loadDraft}
                onChange={(e) => setLoadDraft(e.target.value)}
                className={formControlClass}
              />
            </label>
            <button
              type="button"
              className={btnPrimaryClass}
              onClick={() => {
                onLoadChange(parsePositiveNumber(loadDraft))
                setEditingLoad(false)
              }}
            >
              Save
            </button>
            <button type="button" className={btnGhostClass} onClick={() => setEditingLoad(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-800">{usedLb != null ? formatLb(usedLb) : 'No load'}</p>
            <button
              type="button"
              className={btnGhostClass}
              onClick={() => {
                setLoadDraft(usedLb != null ? String(usedLb) : '')
                setEditingLoad(true)
              }}
            >
              Update
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
