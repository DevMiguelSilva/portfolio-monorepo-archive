import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SourceBadge } from '../components/SourceBadge'
import { useInbox } from '../hooks/useInbox'
import { useSavedSearches } from '../hooks/useSavedSearches'
import { parseDualTrackReason } from '../lib/matchScore'
import { expandSearchLocations } from '../lib/searchLocations'
import { CV_TRACK_LABELS } from '../types/cv'
import {
  formControlClass,
  formGridClass,
  formLabelClass,
  formPanelClass,
  formPrimaryBtnClass,
} from '../lib/formUi'
import { createEmptySavedSearch, type SavedSearch, type SearchTrack } from '../types/job'

const emptyDraft = {
  label: '',
  query: '',
  location: '',
  maxDaysOld: 7,
  track: 'auto' as SearchTrack,
}

export function InboxPage() {
  const navigate = useNavigate()
  const { inbox, loading, refreshing, refreshError, newCount, refreshInbox, approveJob, dismissJob } =
    useInbox()
  const { searches, addSearch, updateSearch, deleteSearch } = useSavedSearches()
  const [showSearches, setShowSearches] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [showAddSearch, setShowAddSearch] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState(emptyDraft)

  const newJobs = useMemo(
    () => inbox.filter((j) => j.status === 'new').sort((a, b) => b.matchScore - a.matchScore),
    [inbox]
  )

  const handleRefresh = async () => {
    setError(null)
    try {
      await refreshInbox()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    }
  }

  const handleApprove = async (id: string) => {
    setActionId(id)
    setError(null)
    try {
      const jobId = await approveJob(id)
      navigate(`/job/${jobId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setActionId(null)
    }
  }

  const handleDismiss = async (id: string) => {
    setActionId(id)
    try {
      await dismissJob(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dismiss failed')
    } finally {
      setActionId(null)
    }
  }

  const handleAddSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.query.trim()) return
    const search = createEmptySavedSearch({
      label: draft.label.trim() || draft.query.trim(),
      query: draft.query.trim(),
      location: draft.location.trim(),
      maxDaysOld: draft.maxDaysOld,
      excludeTerms: '',
      track: draft.track,
      active: true,
    })
    await addSearch(search)
    setDraft(emptyDraft)
    setShowAddSearch(false)
  }

  const startEdit = (search: SavedSearch) => {
    setEditingId(search.id)
    setEditDraft({
      label: search.label,
      query: search.query,
      location: search.location,
      maxDaysOld: search.maxDaysOld,
      track: search.track,
    })
  }

  const saveEdit = async (id: string) => {
    if (!editDraft.query.trim()) return
    await updateSearch(id, {
      label: editDraft.label.trim() || editDraft.query.trim(),
      query: editDraft.query.trim(),
      location: editDraft.location.trim(),
      maxDaysOld: editDraft.maxDaysOld,
      track: editDraft.track,
    })
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
            ← Back to board
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Job Inbox</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Refresh saved Canada searches (Adzuna), rank by the matching Master CV track, then
            approve into your tracker or dismiss.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowSearches((v) => !v)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-track-700"
          >
            {showSearches ? 'Hide searches' : `Saved searches (${searches.length})`}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg bg-track-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh inbox'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-track-700 dark:bg-track-800">
        <span className="font-semibold text-track-accent">{newCount}</span> new roles ready to review
      </div>

      {(error || refreshError) && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error || refreshError}
        </p>
      )}

      {showSearches && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
          <h2 className="font-semibold">Saved searches</h2>
          <ul className="space-y-3">
            {searches.map((search) => (
              <li
                key={search.id}
                className="rounded-lg border border-slate-200 p-3 text-sm dark:border-track-700"
              >
                {editingId === search.id ? (
                  <div className="space-y-2.5">
                    <SearchFields draft={editDraft} setDraft={setEditDraft} />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(search.id)}
                        className="rounded-lg bg-track-accent px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-track-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {search.label.trim() || search.query}
                        {!search.active && (
                          <span className="ml-2 text-xs text-slate-400">(paused)</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {search.label.trim() && search.label.trim() !== search.query
                          ? `${search.query} · `
                          : ''}
                        {expandSearchLocations(search.location)
                          .map((leg) => leg.label)
                          .join(' · ')}{' '}
                        · last {search.maxDaysOld}d · {search.country.toUpperCase()} · CV:{' '}
                        {search.track === 'auto'
                          ? 'Auto (best match)'
                          : CV_TRACK_LABELS[search.track]}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(search)}
                        className="text-xs text-track-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSearch(search.id, { active: !search.active })}
                        className="text-xs text-track-accent hover:underline"
                      >
                        {search.active ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSearch(search.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-200 pt-4 dark:border-track-700">
            {!showAddSearch ? (
              <button
                type="button"
                onClick={() => setShowAddSearch(true)}
                className="text-sm font-medium text-track-accent hover:underline"
              >
                + Add search
              </button>
            ) : (
              <form onSubmit={handleAddSearch} className={formPanelClass}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">New saved search</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSearch(false)
                      setDraft(emptyDraft)
                    }}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
                <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Locations: split with <span className="font-medium">/</span> ·{' '}
                  <span className="font-medium">Remote</span> = Canada-wide
                </p>
                <SearchFields draft={draft} setDraft={setDraft} />
                <div className="flex justify-end">
                  <button type="submit" className={formPrimaryBtnClass}>
                    Save search
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      {loading ? (
        <LoadingSpinner label="Loading inbox…" />
      ) : newJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-track-700">
          <h3 className="font-semibold">Inbox is empty</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Click Refresh inbox to pull roles from your saved searches.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {newJobs.map((job) => (
            <li
              key={job.id}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        job.matchScore >= 70
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : job.matchScore >= 45
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-track-900 dark:text-slate-300'
                      }`}
                    >
                      {job.matchScore}%
                      {job.matchedTrack ? ` · ${CV_TRACK_LABELS[job.matchedTrack]}` : ' match'}
                    </span>
                    <SourceBadge source={job.source} />
                  </div>
                  {(() => {
                    const dual = parseDualTrackReason(job.matchReasons)
                    return dual ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {CV_TRACK_LABELS.frontend} {dual.frontend}% ·{' '}
                        {CV_TRACK_LABELS.powerPlatform} {dual.powerPlatform}%
                      </p>
                    ) : null
                  })()}
                  <h3 className="mt-1 text-lg font-semibold">{job.role}</h3>
                  <p className="text-slate-500 dark:text-slate-400">{job.company}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                    {job.location && <span>{job.location}</span>}
                    {job.salary && <span>{job.salary}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.jobUrl && (
                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-track-700"
                    >
                      Open
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={actionId === job.id}
                    onClick={() => handleDismiss(job.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-track-700"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    disabled={actionId === job.id}
                    onClick={() => handleApprove(job.id)}
                    className="rounded-lg bg-track-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
              {job.matchReasons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.matchReasons
                    .filter((r) => !r.startsWith('Scores:') && !r.startsWith('Best for apply:'))
                    .slice(0, 8)
                    .map((reason) => (
                      <span
                        key={reason}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-track-900 dark:text-slate-300"
                      >
                        {reason}
                      </span>
                    ))}
                </div>
              )}
              {job.description && (
                <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                  {job.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SearchFields({
  draft,
  setDraft,
}: {
  draft: typeof emptyDraft
  setDraft: React.Dispatch<React.SetStateAction<typeof emptyDraft>>
}) {
  return (
    <div className={formGridClass}>
      <label className="block">
        <span className={formLabelClass}>Label</span>
        <input
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          placeholder="e.g. React Toronto"
          className={formControlClass}
        />
      </label>
      <label className="block">
        <span className={formLabelClass}>Locations</span>
        <input
          value={draft.location}
          onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          placeholder="Toronto / Mississauga / Remote"
          className={formControlClass}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className={formLabelClass}>
          Query <span className="text-red-500">*</span>
        </span>
        <input
          value={draft.query}
          onChange={(e) => setDraft((d) => ({ ...d, query: e.target.value }))}
          placeholder="e.g. React TypeScript"
          required
          className={formControlClass}
        />
      </label>
      <label className="block">
        <span className={formLabelClass}>Max days old</span>
        <input
          type="number"
          min={1}
          max={30}
          value={draft.maxDaysOld}
          onChange={(e) => setDraft((d) => ({ ...d, maxDaysOld: Number(e.target.value) || 7 }))}
          className={formControlClass}
        />
      </label>
      <label className="block">
        <span className={formLabelClass}>CV track</span>
        <select
          value={draft.track}
          onChange={(e) => setDraft((d) => ({ ...d, track: e.target.value as SearchTrack }))}
          className={formControlClass}
        >
          <option value="auto">Auto (best match)</option>
          <option value="frontend">React</option>
          <option value="powerPlatform">Power Platform</option>
        </select>
      </label>
    </div>
  )
}
