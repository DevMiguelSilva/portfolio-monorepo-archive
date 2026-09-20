import { useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { boardLook } from '../components/BoardLook'
import { attachCardDragGhost } from '../components/JobCard'
import { IconAction } from '../components/IconAction'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useInbox } from '../hooks/useInbox'
import { useSavedSearches } from '../hooks/useSavedSearches'
import { expandSearchLocations } from '../lib/searchLocations'
import { CV_TRACK_LABELS, CV_TRACKS, type CvTrack } from '../types/cv'
import { createEmptySavedSearch, type SavedSearch } from '../types/job'

const toolbarBtn =
  'm-action rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-[#f4faf8] disabled:opacity-60'
const refreshBtn =
  'm-action rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-primary hover:bg-brand-mist disabled:opacity-60'
const rowBtn =
  'rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-center text-sm font-semibold text-brand-ink transition hover:bg-[#f4faf8] disabled:opacity-60'
const rowRun =
  'rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-center text-sm font-semibold text-brand-ink transition hover:border-brand-primary hover:bg-brand-mist disabled:opacity-60'
const rowDanger =
  'rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-center text-sm font-semibold text-red-700 transition hover:border-red-200 hover:bg-red-50'
const fieldLabel = 'text-sm text-brand-muted'
const fieldControl =
  'mt-1 w-full rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-primary'

const emptyDraft = {
  label: '',
  query: '',
  location: '',
  maxDaysOld: 7,
  excludeTerms: '',
  track: 'powerPlatform' as CvTrack,
}

try {
  sessionStorage.removeItem('inbox-search-look')
} catch {
  /* ignore */
}

export function InboxPage() {
  const {
    inbox,
    loading,
    refreshing,
    refreshError,
    newCount,
    refreshInbox,
    clearReviewList,
    approveJob,
    dismissJob,
  } = useInbox()
  const {
    searches,
    addSearch,
    updateSearch,
    deleteSearch,
    activateOnly,
    activateAll,
    reorderSearches,
  } = useSavedSearches()
  const [showSearches, setShowSearches] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [runningAloneId, setRunningAloneId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [showAddSearch, setShowAddSearch] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState(emptyDraft)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const newJobs = useMemo(
    () => inbox.filter((j) => j.status === 'new').sort((a, b) => b.matchScore - a.matchScore),
    [inbox]
  )

  const searchLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of searches) {
      map.set(s.id, s.label.trim() || s.query.trim() || 'Saved search')
    }
    return map
  }, [searches])

  const firstSeenCount = useMemo(
    () => newJobs.filter((j) => (j.seenCount ?? 1) <= 1).length,
    [newJobs]
  )
  const seenBeforeCount = useMemo(
    () => newJobs.filter((j) => (j.seenCount ?? 1) > 1).length,
    [newJobs]
  )

  const activeSearches = useMemo(() => searches.filter((s) => s.active), [searches])

  const handleRefresh = async () => {
    setError(null)
    try {
      let list = searches
      // Only auto-activate everything when every search is paused.
      if (list.length > 0 && !list.some((s) => s.active)) {
        list = await activateAll()
      }
      await refreshInbox({ searchesOverride: list })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    }
  }

  const handleSearchDragStart = (index: number, event: DragEvent<HTMLElement>) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
    const card = event.currentTarget.closest('li')
    if (card instanceof HTMLElement) attachCardDragGhost(event, card)
  }

  const handleSearchDragOver = (index: number, event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropIndex !== index) setDropIndex(index)
  }

  const handleSearchDrop = async (index: number) => {
    if (dragIndex == null || dragIndex === index) {
      setDragIndex(null)
      setDropIndex(null)
      return
    }
    try {
      await reorderSearches(dragIndex, index)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder searches')
    } finally {
      setDragIndex(null)
      setDropIndex(null)
    }
  }

  const handleSearchDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleClearReview = async () => {
    setError(null)
    try {
      await clearReviewList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear review list')
    }
  }

  /** Pause other searches, clear the review list, refresh only this query. */
  const handleRunAlone = async (searchId: string) => {
    setError(null)
    setRunningAloneId(searchId)
    try {
      await activateOnly(searchId)
      await refreshInbox({ onlySearchId: searchId, clearReviewFirst: true })
      setShowSearches(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run search')
    } finally {
      setRunningAloneId(null)
    }
  }

  const handleApprove = async (id: string) => {
    setActionId(id)
    setError(null)
    try {
      await approveJob(id)
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
      excludeTerms: draft.excludeTerms.trim(),
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
      excludeTerms: search.excludeTerms ?? '',
      track: search.track === 'frontend' ? 'frontend' : 'powerPlatform',
    })
  }

  const saveEdit = async (id: string) => {
    if (!editDraft.query.trim()) return
    await updateSearch(id, {
      label: editDraft.label.trim() || editDraft.query.trim(),
      query: editDraft.query.trim(),
      location: editDraft.location.trim(),
      maxDaysOld: editDraft.maxDaysOld,
      excludeTerms: editDraft.excludeTerms.trim(),
      track: editDraft.track,
    })
    setEditingId(null)
  }

  const dismissBtn =
    'm-action rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-red-200 hover:text-red-700 disabled:opacity-60'
  const approveBtn =
    'm-action rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-primary hover:bg-brand-mist disabled:opacity-60'

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Link to="/" className="text-sm font-medium text-brand-muted hover:text-brand-ink">
          ← Back to board
        </Link>
        <div className="m-action-row flex flex-wrap items-center justify-between gap-4">
          <h1 className={boardLook.headline}>Inbox</h1>
          <div className="m-actions flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowSearches((v) => !v)} className={toolbarBtn}>
              {showSearches ? 'Hide searches' : `Saved searches (${searches.length})`}
            </button>
            <button
              type="button"
              onClick={handleClearReview}
              disabled={refreshing || newCount === 0}
              className={toolbarBtn}
            >
              Clear review list
            </button>
            <button
              type="button"
              data-role="primary"
              onClick={handleRefresh}
              disabled={refreshing || Boolean(runningAloneId)}
              className={refreshBtn}
            >
              {refreshing && !runningAloneId ? 'Refreshing…' : 'Refresh active'}
            </button>
          </div>
        </div>
      </div>

      <div className={`${boardLook.card} px-5 py-4`}>
        <p className="text-sm text-brand-ink">
          <span className="font-semibold tabular-nums">{newCount}</span>
          <span className="text-brand-muted"> ready to review</span>
          {newCount > 0 && (
            <span className="text-brand-muted">
              {' '}
              · {firstSeenCount} new
              {seenBeforeCount > 0 && <> · {seenBeforeCount} seen before</>}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-brand-muted">
          {activeSearches.length === 0
            ? searches.length === 0
              ? 'No saved searches yet.'
              : 'All searches paused.'
            : activeSearches.length === 1
              ? `Active search: ${activeSearches[0].label.trim() || activeSearches[0].query}`
              : `${activeSearches.length} searches active.`}
        </p>
      </div>

      {(error || refreshError) && (
        <p className="text-sm text-red-700" role="alert">
          {error || refreshError}
        </p>
      )}

      {showSearches && (
        <section className={`${boardLook.card} space-y-4 p-4 sm:p-5`}>
          <h2 className="font-display text-base font-semibold text-brand-ink">Saved searches</h2>
          <ul className="space-y-3">
            {searches.map((search, index) => (
              <li
                key={search.id}
                onDragOver={(e) => handleSearchDragOver(index, e)}
                onDrop={() => handleSearchDrop(index)}
                className={`rounded-[1.25rem] border border-[#e6eeeb] bg-white p-4 text-sm ${
                  dragIndex === index ? 'opacity-40' : ''
                } ${
                  dropIndex === index && dragIndex != null && dragIndex !== index
                    ? 'ring-2 ring-brand-primary/40'
                    : ''
                }`}
              >
                <SavedSearchBody
                  search={search}
                  index={index}
                  editing={editingId === search.id}
                  running={runningAloneId === search.id}
                  busy={refreshing || Boolean(runningAloneId)}
                  editDraft={editDraft}
                  setEditDraft={setEditDraft}
                  onDragStart={handleSearchDragStart}
                  onDragEnd={handleSearchDragEnd}
                  onRun={() => void handleRunAlone(search.id)}
                  onEdit={() => startEdit(search)}
                  onToggleActive={() => void updateSearch(search.id, { active: !search.active })}
                  onDelete={() => void deleteSearch(search.id)}
                  onSave={() => void saveEdit(search.id)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ))}
          </ul>

          <div className="border-t border-[#e6eeeb] pt-4">
            {!showAddSearch ? (
              <button type="button" onClick={() => setShowAddSearch(true)} className={toolbarBtn}>
                Add search
              </button>
            ) : (
              <form onSubmit={handleAddSearch} className="space-y-3">
                <p className="font-display text-base font-semibold text-brand-ink">New saved search</p>
                <SearchFields draft={draft} setDraft={setDraft} />
                <div className="m-actions flex flex-wrap gap-2">
                  <button type="submit" data-role="primary" className={refreshBtn}>
                    Save search
                  </button>
                  <button
                    type="button"
                    data-role="quiet"
                    onClick={() => {
                      setShowAddSearch(false)
                      setDraft(emptyDraft)
                    }}
                    className={toolbarBtn}
                  >
                    Cancel
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
        <div className={boardLook.empty}>
          <h3 className={boardLook.emptyTitle}>Inbox is empty</h3>
          <p className={`mt-2 ${boardLook.body}`}>Refresh a saved search to review new roles.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {newJobs.map((job) => {
            const skills = job.matchReasons
              .filter((reason) => reason.startsWith('CV covers '))
              .map((reason) => reason.slice('CV covers '.length).trim())
              .filter(Boolean)
            const searchName = job.savedSearchId ? searchLabelById.get(job.savedSearchId) : undefined
            const seenBefore = (job.seenCount ?? 1) > 1
            return (
              <li key={job.id} className={`${boardLook.card} inbox-job p-4 sm:p-5`}>
                <div className="inbox-job-facts min-w-0">
                  <p className={`text-sm ${seenBefore ? 'text-[#8a6230]' : 'text-brand-muted'}`}>
                    {seenBefore ? 'Seen before' : 'New'}
                  </p>
                  <h3 className="mt-2 font-sans text-base font-semibold leading-snug text-brand-ink">
                    {job.role || 'Untitled role'}
                  </h3>
                  <p className="mt-1 truncate text-sm text-brand-muted">{job.company || 'Unknown company'}</p>
                  {job.location.trim() && (
                    <p className="truncate text-sm text-brand-muted">{job.location}</p>
                  )}
                  {job.salary.trim() && <p className="mt-2 text-sm text-brand-ink">{job.salary}</p>}
                  {searchName && (
                    <p className="mt-2 text-sm text-brand-muted">Found by {searchName}</p>
                  )}
                  {job.jobUrl && (
                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-brand-ink underline-offset-4 transition hover:text-brand-primaryDeep hover:underline"
                    >
                      Open original posting
                    </a>
                  )}
                </div>
                {skills.length > 0 && (
                  <div className="inbox-job-skills flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-[#f4faf8] px-2.5 py-1 text-sm text-brand-ink"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                <div className="inbox-job-actions m-actions flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-role="quiet"
                    disabled={actionId === job.id}
                    onClick={() => handleDismiss(job.id)}
                    className={dismissBtn}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    data-role="primary"
                    disabled={actionId === job.id}
                    onClick={() => handleApprove(job.id)}
                    className={approveBtn}
                  >
                    Approve
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SavedSearchBody({
  search,
  index,
  editing,
  running,
  busy,
  editDraft,
  setEditDraft,
  onDragStart,
  onDragEnd,
  onRun,
  onEdit,
  onToggleActive,
  onDelete,
  onSave,
  onCancel,
}: {
  search: SavedSearch
  index: number
  editing: boolean
  running: boolean
  busy: boolean
  editDraft: typeof emptyDraft
  setEditDraft: React.Dispatch<React.SetStateAction<typeof emptyDraft>>
  onDragStart: (index: number, event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onRun: () => void
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  onSave: () => void
  onCancel: () => void
}) {
  const name = search.label.trim() || search.query
  const meta = searchMeta(search)

  if (editing) {
    return (
      <div className="space-y-2.5">
        <SearchFields draft={editDraft} setDraft={setEditDraft} />
        <div className="m-actions flex flex-wrap gap-2">
          <button type="button" data-role="primary" onClick={onSave} className={refreshBtn}>
            Save changes
          </button>
          <button type="button" data-role="quiet" onClick={onCancel} className={toolbarBtn}>
            Cancel
          </button>
        </div>
        <div className="search-mobile-only border-t border-[#e6eeeb] pt-3">
          <button type="button" onClick={onToggleActive} className={rowBtn}>
            {search.active ? 'Pause' : 'Activate'}
          </button>
          <button type="button" onClick={onDelete} className={rowDanger}>
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="search-row">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          draggable
          onDragStart={(event) => onDragStart(index, event)}
          onDragEnd={onDragEnd}
          className="search-drag h-8 w-6 shrink-0 cursor-grab select-none items-center justify-center leading-none text-brand-muted active:cursor-grabbing"
          title="Drag to reorder"
          aria-label={`Reorder ${name}`}
        >
          ⋮⋮
        </button>
        <div className="min-w-0 text-left">
          <p className="font-medium text-brand-ink">
            {name}
            {search.active ? (
              <span className="ml-2 text-xs font-medium text-brand-primaryDeep">active</span>
            ) : (
              <span className="ml-2 text-xs text-brand-muted">paused</span>
            )}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-brand-muted">{meta}</p>
        </div>
      </div>
      <div className="search-icons">
        <IconAction label={running ? 'Running' : 'Run'} disabled={busy} onClick={onRun}>
          <PlayIcon />
        </IconAction>
        <IconAction label="Edit" onClick={onEdit}>
          <PencilIcon />
        </IconAction>
        <IconAction label={search.active ? 'Pause' : 'Activate'} onClick={onToggleActive}>
          {search.active ? <PauseIcon /> : <PlayIcon />}
        </IconAction>
        <IconAction label="Delete" danger onClick={onDelete}>
          <TrashIcon />
        </IconAction>
      </div>
      <div className="search-pair">
        <button type="button" disabled={busy} onClick={onRun} className={rowRun}>
          {running ? 'Running…' : 'Run alone'}
        </button>
        <button type="button" onClick={onEdit} className={rowBtn}>
          Edit
        </button>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3.5v9l8-4.5-8-4.5Z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 3h2.2v10H4.5V3Zm4.8 0h2.2v10H9.3V3Z" fill="currentColor" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9.2 3.3 12.7 6.8 5.5 14H2v-3.5l7.2-7.2Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function searchMeta(search: SavedSearch) {
  return [
    search.label.trim() && search.label.trim() !== search.query ? search.query : '',
    expandSearchLocations(search.location)
      .map((leg) => leg.label)
      .join(' · '),
    `last ${search.maxDaysOld}d`,
    search.country.toUpperCase(),
    `CV: ${search.track === 'auto' ? 'Auto (best match)' : CV_TRACK_LABELS[search.track]}`,
    search.excludeTerms?.trim() ? `exclude: ${search.excludeTerms.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

function SearchFields({
  draft,
  setDraft,
}: {
  draft: typeof emptyDraft
  setDraft: React.Dispatch<React.SetStateAction<typeof emptyDraft>>
}) {
  return (
    <div className="search-fields">
      <label className="block">
        <span className={fieldLabel}>Label</span>
        <input
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          className={fieldControl}
        />
      </label>
      <label className="block">
        <span className={fieldLabel}>Locations</span>
        <input
          value={draft.location}
          onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          className={fieldControl}
        />
      </label>
      <label className="search-field-wide block">
        <span className={fieldLabel}>
          Phrase <span className="text-red-700">*</span>
        </span>
        <input
          value={draft.query}
          onChange={(e) => setDraft((d) => ({ ...d, query: e.target.value }))}
          required
          className={fieldControl}
        />
      </label>
      <label className="search-field-wide block">
        <span className={fieldLabel}>Exclude</span>
        <input
          value={draft.excludeTerms}
          onChange={(e) => setDraft((d) => ({ ...d, excludeTerms: e.target.value }))}
          className={fieldControl}
        />
      </label>
      <label className="block">
        <span className={fieldLabel}>Max days old</span>
        <input
          type="number"
          min={1}
          max={30}
          value={draft.maxDaysOld}
          onChange={(e) => setDraft((d) => ({ ...d, maxDaysOld: Number(e.target.value) || 7 }))}
          className={fieldControl}
        />
      </label>
      <label className="block">
        <span className={fieldLabel}>CV track</span>
        <select
          value={draft.track}
          onChange={(e) => setDraft((d) => ({ ...d, track: e.target.value as CvTrack }))}
          className={`${fieldControl} form-select`}
        >
          {CV_TRACKS.map((track) => (
            <option key={track} value={track}>
              {CV_TRACK_LABELS[track]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
