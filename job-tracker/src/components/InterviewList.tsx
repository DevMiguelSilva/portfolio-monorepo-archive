import { useState } from 'react'
import { formControlClass } from '../lib/formUi'
import {
  formatInterviewDate,
  isUpcomingInterview,
  type InterviewRound,
} from '../types/job'

const quietBtn =
  'rounded-lg border border-[#e6eeeb] bg-white font-semibold text-brand-ink transition hover:bg-[#f4faf8]'
const interviewBtn =
  'rounded-lg border border-[#e6eeeb] bg-white font-semibold text-brand-ink transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
const removeBtn =
  'rounded-lg border border-[#e6eeeb] bg-white font-semibold text-brand-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700'

interface InterviewListProps {
  interviews: InterviewRound[]
  readOnly?: boolean
  onSave: (next: InterviewRound[]) => Promise<void>
  embedded?: boolean
}

export function InterviewList({ interviews, readOnly = false, onSave, embedded = false }: InterviewListProps) {
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
    const label = labelDraft.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !label) {
      setError('Add a name and a date for this interview.')
      return
    }
    setError(null)
    if (editingId) {
      void persist(
        interviews.map((round) => (round.id === editingId ? { ...round, date, label } : round))
      )
      return
    }
    void persist([...interviews, { id: crypto.randomUUID(), date, label, done: false }])
  }

  const draftReady = /^\d{4}-\d{2}-\d{2}$/.test(dateDraft.trim()) && labelDraft.trim().length > 0

  return (
    <section
      className={
        embedded
          ? 'space-y-3 border-t border-[#e6eeeb] pt-6'
          : 'space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Interviews</h2>
        {!readOnly && !adding && !editingId && (
          <button
            type="button"
            onClick={startAdd}
            className={`${interviewBtn} px-3 py-1.5 text-sm`}
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
                    draftReady={draftReady}
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
                        className={`px-2.5 py-1 text-xs ${
                          round.done
                            ? 'rounded-lg border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700'
                            : interviewBtn
                        }`}
                      >
                        {round.done ? 'Done' : 'Mark done'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(round)}
                        className={`${quietBtn} px-2.5 py-1 text-xs`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void persist(interviews.filter((item) => item.id !== round.id))}
                        className={`${removeBtn} px-2.5 py-1 text-xs`}
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
          draftReady={draftReady}
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
  draftReady,
  saving,
  submitLabel,
  onLabel,
  onDate,
  onSubmit,
  onCancel,
}: {
  labelDraft: string
  dateDraft: string
  draftReady: boolean
  saving: boolean
  submitLabel: string
  onLabel: (value: string) => void
  onDate: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-[#e6eeeb] p-3 sm:grid-cols-[1fr_11rem_auto] sm:items-end">
      <label className="block">
        <span className="text-xs text-brand-muted">Name</span>
        <input
          value={labelDraft}
          onChange={(e) => onLabel(e.target.value)}
          placeholder="Screen, technical, final…"
          className={formControlClass}
        />
      </label>
      <label className="block">
        <span className="text-xs text-brand-muted">Date</span>
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
          disabled={!draftReady || saving}
          onClick={onSubmit}
          className={`${interviewBtn} px-3 py-2 text-sm disabled:opacity-50`}
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className={`${quietBtn} px-3 py-2 text-sm disabled:opacity-50`}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
