import { useState } from 'react'
import { formControlClass, formLabelClass } from '../lib/formUi'
import {
  formatInterviewDate,
  isUpcomingInterview,
  type InterviewRound,
} from '../types/job'

interface InterviewListProps {
  interviews: InterviewRound[]
  readOnly?: boolean
  onSave: (next: InterviewRound[]) => Promise<void>
}

export function InterviewList({ interviews, readOnly = false, onSave }: InterviewListProps) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [dateDraft, setDateDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetDraft = () => {
    setAdding(false)
    setEditingId(null)
    setLabelDraft('')
    setDateDraft('')
    setError(null)
  }

  const persist = async (next: InterviewRound[]) => {
    const wasAdding = adding
    const wasEditing = editingId
    setSaving(true)
    setError(null)
    setAdding(false)
    setEditingId(null)
    try {
      await onSave(next)
      setLabelDraft('')
      setDateDraft('')
    } catch (err) {
      setAdding(wasAdding)
      setEditingId(wasEditing)
      setError(err instanceof Error ? err.message : 'Could not save interviews')
    } finally {
      setSaving(false)
    }
  }

  const startAdd = () => {
    setEditingId(null)
    setLabelDraft('')
    setDateDraft('')
    setError(null)
    setAdding(true)
  }

  const startEdit = (round: InterviewRound) => {
    setAdding(false)
    setEditingId(round.id)
    setLabelDraft(round.label)
    setDateDraft(round.date)
    setError(null)
  }

  const commitDraft = () => {
    const date = dateDraft.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const label = labelDraft.trim()
    if (editingId) {
      void persist(
        interviews.map((round) => (round.id === editingId ? { ...round, date, label } : round))
      )
      return
    }
    void persist([...interviews, { id: crypto.randomUUID(), date, label, done: false }])
  }

  const dateReady = /^\d{4}-\d{2}-\d{2}$/.test(dateDraft.trim())

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Interviews</h2>
        {!readOnly && !adding && !editingId && (
          <button
            type="button"
            onClick={startAdd}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-track-600 dark:bg-track-900 dark:text-slate-200"
          >
            Add interview
          </button>
        )}
      </div>

      {interviews.length === 0 && !adding && (
        <p className="text-sm text-slate-500">No interviews yet.</p>
      )}

      {interviews.length > 0 && (
        <ul className="space-y-2">
          {interviews.map((round) => {
            const upcoming = isUpcomingInterview(round)
            const rowTone = round.done
              ? 'border-teal-200 bg-teal-50/80 dark:border-teal-900 dark:bg-teal-950/25'
              : upcoming
                ? 'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30'
                : 'border-slate-200 bg-slate-50/60 dark:border-track-700 dark:bg-track-900/40'
            if (editingId === round.id) {
              return (
                <li key={round.id}>
                  <DraftFields
                    labelDraft={labelDraft}
                    dateDraft={dateDraft}
                    dateReady={dateReady}
                    saving={saving}
                    submitLabel="Save"
                    onLabel={setLabelDraft}
                    onDate={setDateDraft}
                    onSubmit={commitDraft}
                    onCancel={resetDraft}
                  />
                </li>
              )
            }
            return (
              <li
                key={round.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${rowTone}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {formatInterviewDate(round.date)}
                  </p>
                  {round.label && (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{round.label}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {readOnly ? (
                    round.done && (
                      <span className="text-xs font-medium text-teal-700 dark:text-teal-300">Done</span>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-pressed={round.done}
                        onClick={() =>
                          void persist(
                            interviews.map((item) =>
                              item.id === round.id ? { ...item, done: !item.done } : item
                            )
                          )
                        }
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          round.done
                            ? 'bg-teal-600 text-white hover:bg-teal-700'
                            : 'border border-slate-300 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-track-600 dark:bg-track-900 dark:text-slate-300'
                        }`}
                      >
                        {round.done ? 'Done' : 'Mark done'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(round)}
                        className="text-xs font-medium text-track-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void persist(interviews.filter((item) => item.id !== round.id))}
                        className="text-xs font-medium text-slate-500 hover:text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {adding && (
        <DraftFields
          labelDraft={labelDraft}
          dateDraft={dateDraft}
          dateReady={dateReady}
          saving={saving}
          submitLabel="Add"
          onLabel={setLabelDraft}
          onDate={setDateDraft}
          onSubmit={commitDraft}
          onCancel={resetDraft}
        />
      )}

      {error && (
        <p className="text-sm text-amber-700 dark:text-amber-300" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

function DraftFields({
  labelDraft,
  dateDraft,
  dateReady,
  saving,
  submitLabel,
  onLabel,
  onDate,
  onSubmit,
  onCancel,
}: {
  labelDraft: string
  dateDraft: string
  dateReady: boolean
  saving: boolean
  submitLabel: string
  onLabel: (value: string) => void
  onDate: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_11rem_auto] sm:items-end dark:border-track-700">
      <label className="block">
        <span className={formLabelClass}>Round</span>
        <input
          value={labelDraft}
          onChange={(e) => onLabel(e.target.value)}
          placeholder="Screen, technical, final…"
          className={formControlClass}
        />
      </label>
      <label className="block">
        <span className={formLabelClass}>Date</span>
        <input
          type="date"
          value={dateDraft}
          onChange={(e) => onDate(e.target.value)}
          className={formControlClass}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!dateReady || saving}
          onClick={onSubmit}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
