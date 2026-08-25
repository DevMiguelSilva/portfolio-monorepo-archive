import { useState } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useFit } from '../hooks/useFit'
import {
  btnGhostClass,
  btnPrimaryClass,
  formControlClass,
  formLabelClass,
  pageCardClass,
  pageTitleClass,
  sectionLabelClass,
} from '../lib/appUi'
import { parsePositiveNumber } from '../lib/weeks'
import { DEFAULT_REPS, DEFAULT_SETS } from '../types/fit'

export function RoutinesPage() {
  const {
    state,
    loading,
    addRoutine,
    renameRoutine,
    deleteRoutine,
    addExercise,
    updateExercise,
    deleteExercise,
  } = useFit()
  const [newName, setNewName] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  if (loading) return <LoadingSpinner label="Loading routines…" />

  return (
    <div className="space-y-6">
      <section>
        <p className={sectionLabelClass}>Build your week</p>
        <h1 className={`mt-1 ${pageTitleClass}`}>Routines</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Create the workouts you’ll choose from each training day.
        </p>
      </section>

      <form
        className={`${pageCardClass} flex flex-wrap items-end gap-2 p-4`}
        onSubmit={(e) => {
          e.preventDefault()
          if (!newName.trim()) return
          void addRoutine(newName).then((routine) => {
            setNewName('')
            setOpenId(routine.id)
          })
        }}
      >
        <label className="min-w-[12rem] flex-1">
          <span className={formLabelClass}>New routine name</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Push, legs, full body…"
            className={formControlClass}
          />
        </label>
        <button type="submit" className={btnPrimaryClass} disabled={!newName.trim()}>
          Add routine
        </button>
      </form>

      {state.routines.length === 0 && (
        <p className="text-sm text-slate-500">No routines yet. Add one above.</p>
      )}

      <div className="space-y-4">
        {state.routines.map((routine) => {
          const exercises = state.exercises
            .filter((e) => e.routineId === routine.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
          const open = openId === routine.id
          return (
            <section key={routine.id} className={pageCardClass}>
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <button
                  type="button"
                  className="text-left font-display text-lg font-semibold text-slate-900"
                  onClick={() => setOpenId(open ? null : routine.id)}
                >
                  {routine.name}
                  <span className="ml-2 text-sm font-medium text-slate-400">
                    {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
                  </span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnGhostClass}
                    onClick={() => setOpenId(open ? null : routine.id)}
                  >
                    {open ? 'Hide' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Delete “${routine.name}”? Exercises go with it. Past days stay on Progress.`)) {
                        void deleteRoutine(routine.id)
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {open && (
                <div className="space-y-4 border-t border-slate-100 p-4">
                  <label className="block max-w-md">
                    <span className={formLabelClass}>Routine name</span>
                    <input
                      defaultValue={routine.name}
                      className={formControlClass}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value.trim() !== routine.name) {
                          void renameRoutine(routine.id, e.target.value)
                        }
                      }}
                    />
                  </label>

                  <ul className="space-y-3">
                    {exercises.map((exercise) => (
                      <li
                        key={exercise.id}
                        className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[1fr_4.5rem_4.5rem_5.5rem_auto]"
                      >
                        <label>
                          <span className={formLabelClass}>Exercise</span>
                          <input
                            defaultValue={exercise.name}
                            className={formControlClass}
                            onBlur={(e) => {
                              if (e.target.value.trim() !== exercise.name) {
                                void updateExercise(exercise.id, { name: e.target.value })
                              }
                            }}
                          />
                        </label>
                        <label>
                          <span className={formLabelClass}>Sets</span>
                          <input
                            type="number"
                            min={1}
                            defaultValue={exercise.sets}
                            className={formControlClass}
                            onBlur={(e) => {
                              const n = Math.max(1, Math.round(Number(e.target.value) || 1))
                              if (n !== exercise.sets) void updateExercise(exercise.id, { sets: n })
                            }}
                          />
                        </label>
                        <label>
                          <span className={formLabelClass}>Reps</span>
                          <input
                            type="number"
                            min={1}
                            defaultValue={exercise.reps}
                            className={formControlClass}
                            onBlur={(e) => {
                              const n = Math.max(1, Math.round(Number(e.target.value) || 1))
                              if (n !== exercise.reps) void updateExercise(exercise.id, { reps: n })
                            }}
                          />
                        </label>
                        <label>
                          <span className={formLabelClass}>Load (lb)</span>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            defaultValue={exercise.loadLb ?? ''}
                            placeholder="—"
                            className={formControlClass}
                            onBlur={(e) => {
                              const parsed = parsePositiveNumber(e.target.value)
                              const next = parsed
                              if (next !== exercise.loadLb) {
                                void updateExercise(exercise.id, { loadLb: next })
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="self-end rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => void deleteExercise(exercise.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>

                  <AddExerciseForm
                    onAdd={(input) => void addExercise({ routineId: routine.id, ...input })}
                  />
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function AddExerciseForm({
  onAdd,
}: {
  onAdd: (input: { name: string; sets: number; reps: number; loadLb: number | null }) => void
}) {
  const [name, setName] = useState('')
  const [sets, setSets] = useState(String(DEFAULT_SETS))
  const [reps, setReps] = useState(String(DEFAULT_REPS))
  const [load, setLoad] = useState('')

  return (
    <form
      className="grid gap-2 rounded-xl border border-dashed border-slate-200 p-3 sm:grid-cols-[1fr_4.5rem_4.5rem_5.5rem_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onAdd({
          name,
          sets: Math.max(1, Math.round(Number(sets) || DEFAULT_SETS)),
          reps: Math.max(1, Math.round(Number(reps) || DEFAULT_REPS)),
          loadLb: parsePositiveNumber(load),
        })
        setName('')
        setSets(String(DEFAULT_SETS))
        setReps(String(DEFAULT_REPS))
        setLoad('')
      }}
    >
      <label>
        <span className={formLabelClass}>New exercise</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Goblet squat"
          className={formControlClass}
        />
      </label>
      <label>
        <span className={formLabelClass}>Sets</span>
        <input
          type="number"
          min={1}
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          className={formControlClass}
        />
      </label>
      <label>
        <span className={formLabelClass}>Reps</span>
        <input
          type="number"
          min={1}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className={formControlClass}
        />
      </label>
      <label>
        <span className={formLabelClass}>Load (lb)</span>
        <input
          type="number"
          min={0}
          step="0.5"
          value={load}
          onChange={(e) => setLoad(e.target.value)}
          placeholder="optional"
          className={formControlClass}
        />
      </label>
      <button type="submit" className={`${btnPrimaryClass} self-end`} disabled={!name.trim()}>
        Add
      </button>
    </form>
  )
}
