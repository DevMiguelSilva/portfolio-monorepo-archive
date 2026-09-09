import { useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { attachCardDragGhost } from '../components/JobCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { usePortalFeeds } from '../hooks/usePortalFeeds'
import {
  formControlClass,
  formGridClass,
  formLabelClass,
  formPanelClass,
  formPrimaryBtnClass,
  formSelectClass,
} from '../lib/formUi'
import { countCompleteDaysInYear } from '../lib/huntStreak'
import {
  PORTAL_SOURCE_LABELS,
  PORTAL_SOURCE_OPTIONS,
  type PortalFeed,
  type PortalSource,
} from '../types/portal'

export function PortalsPage() {
  const {
    feeds,
    loading,
    activeFeeds,
    todayCheckedIds,
    todayComplete,
    checkedTodayCount,
    streak,
    daysByDate,
    addFeed,
    updateFeed,
    deleteFeed,
    reorderFeeds,
    toggleCheckedToday,
    openFeed,
    openAllActive,
  } = usePortalFeeds()

  const [draft, setDraft] = useState({ name: '', url: '', source: 'indeed' as PortalSource })
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({
    name: '',
    url: '',
    source: 'indeed' as PortalSource,
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const activeIds = useMemo(() => activeFeeds.map((f) => f.id), [activeFeeds])
  const yearComplete = useMemo(
    () => countCompleteDaysInYear(daysByDate, activeFeeds, new Date().getFullYear()),
    [daysByDate, activeFeeds]
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!draft.url.trim()) {
      setError('URL is required')
      return
    }
    try {
      await addFeed(draft)
      setDraft({ name: '', url: '', source: 'indeed' })
      setShowAddFeed(false)
      setMessage('Feed saved')
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feed')
    }
  }

  const startEdit = (feed: PortalFeed) => {
    setEditingId(feed.id)
    setEditDraft({
      name: feed.name,
      url: feed.url,
      source: feed.source === 'other' ? 'indeed' : feed.source,
    })
  }

  const saveEdit = async (id: string) => {
    await updateFeed(id, {
      name: editDraft.name.trim() || 'Untitled feed',
      url: editDraft.url.trim(),
      source: editDraft.source,
    })
    setEditingId(null)
  }

  const handleOpenAll = async () => {
    setError(null)
    setMessage(null)
    const { opened, blockedHint, remaining } = await openAllActive()
    if (opened === 0) {
      setMessage(
        'Browser blocked the tabs. Allow pop-ups for this site, then try again.'
      )
      return
    }
    if (blockedHint || remaining > 0) {
      setMessage(
        `Opened ${opened} and marked those checked.${
          remaining > 0
            ? ` ${remaining} still unchecked — click Open all again (or allow pop-ups to open more at once).`
            : ' Allow pop-ups if you want every tab in one click.'
        }`
      )
      return
    }
    setMessage(`Opened ${opened} portal(s) and marked them checked for today.`)
  }

  const handleFeedDragStart = (index: number, event: DragEvent<HTMLElement>) => {
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
    const card = event.currentTarget.closest('li')
    if (card instanceof HTMLElement) attachCardDragGhost(event, card)
  }

  const handleFeedDragOver = (index: number, event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropIndex !== index) setDropIndex(index)
  }

  const handleFeedDrop = async (index: number) => {
    if (dragIndex == null || dragIndex === index) {
      setDragIndex(null)
      setDropIndex(null)
      return
    }
    try {
      await reorderFeeds(dragIndex, index)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder feeds')
    } finally {
      setDragIndex(null)
      setDropIndex(null)
    }
  }

  const handleFeedDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  if (loading) return <LoadingSpinner label="Loading portals…" />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
            ← Back to board
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Portals</h1>
        </div>
        <button
          type="button"
          onClick={handleOpenAll}
          disabled={activeFeeds.length === 0}
          className="rounded-lg bg-track-accent px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          Open all active ({activeFeeds.length})
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div
          className={`rounded-xl border p-4 ${
            todayComplete
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
              : 'border-slate-200 bg-white dark:border-track-700 dark:bg-track-800'
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">Today</p>
          <p className="mt-1 text-2xl font-bold">
            {activeFeeds.length === 0
              ? 'Add feeds'
              : todayComplete
                ? 'All checked ✓'
                : `${checkedTodayCount}/${activeFeeds.length} checked`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-track-700 dark:bg-track-800">
          <p className="text-xs uppercase tracking-wide text-slate-400">Streak</p>
          <p className="mt-1 text-2xl font-bold text-track-accent">
            {streak} day{streak === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-track-700 dark:bg-track-800">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Complete days · {new Date().getFullYear()}
          </p>
          <p className="mt-1 text-2xl font-bold">{yearComplete}</p>
        </div>
      </section>

      {(message || error) && (
        <p
          className={`rounded-lg p-3 text-sm ${
            error
              ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
          }`}
        >
          {error || message}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold">Portal streak</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Streak</p>
              <p className="font-bold text-track-accent">
                {streak} day{streak === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{new Date().getFullYear()}</p>
              <p className="font-bold">{yearComplete} complete days</p>
            </div>
          </div>
        </div>
        {activeIds.length === 0 ? (
          <p className="text-sm text-slate-500">No active feeds.</p>
        ) : (
          <ActivityHeatmap
            variant="portal"
            daysByDate={daysByDate}
            activeFeeds={activeFeeds}
            mode="year"
          />
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
        <h2 className="font-semibold">Your feeds</h2>
        {feeds.length === 0 ? (
          <p className="text-sm text-slate-500">
            No feeds yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {feeds.map((feed, index) => {
              const checked = todayCheckedIds.has(feed.id)
              return (
                <li
                  key={feed.id}
                  onDragOver={(e) => handleFeedDragOver(index, e)}
                  onDrop={() => void handleFeedDrop(index)}
                  className={`rounded-lg border border-slate-200 p-3 dark:border-track-700 ${
                    dragIndex === index ? 'opacity-40' : ''
                  } ${
                    dropIndex === index && dragIndex != null && dragIndex !== index
                      ? 'ring-2 ring-track-accent/40'
                      : ''
                  }`}
                >
                  {editingId === feed.id ? (
                    <div className="space-y-2.5">
                      <FeedFields draft={editDraft} setDraft={setEditDraft} />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(feed.id)}
                          className="rounded-lg bg-track-accent px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Save
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => handleFeedDragStart(index, e)}
                          onDragEnd={handleFeedDragEnd}
                          className="flex h-8 w-6 shrink-0 cursor-grab select-none items-center justify-center leading-none text-slate-400 active:cursor-grabbing"
                          title="Drag to reorder"
                          aria-label={`Reorder ${feed.name}`}
                        >
                          ⋮⋮
                        </button>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!feed.active}
                          onChange={() => toggleCheckedToday(feed.id)}
                          className="h-4 w-4 shrink-0 accent-emerald-600"
                          title="Checked today"
                        />
                        <div className="min-w-0">
                          <p className="font-medium">
                            {feed.name}
                            {!feed.active && (
                              <span className="ml-2 text-xs text-slate-400">(paused)</span>
                            )}
                            {checked && (
                              <span className="ml-2 text-xs text-emerald-600">today ✓</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {PORTAL_SOURCE_LABELS[feed.source]} · {feed.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openFeed(feed)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(feed)}
                          className="text-xs text-track-accent hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFeed(feed.id, { active: !feed.active })}
                          className="text-xs text-track-accent hover:underline"
                        >
                          {feed.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFeed(feed.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-t border-slate-200 pt-4 dark:border-track-700">
          {!showAddFeed ? (
            <button
              type="button"
              onClick={() => setShowAddFeed(true)}
              className="text-sm font-medium text-track-accent hover:underline"
            >
              + Add portal URL
            </button>
          ) : (
            <form onSubmit={handleAdd} className={formPanelClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">New portal feed</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFeed(false)
                    setDraft({ name: '', url: '', source: 'indeed' })
                    setError(null)
                  }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
              <FeedFields draft={draft} setDraft={setDraft} />
              <div className="flex justify-end">
                <button type="submit" className={formPrimaryBtnClass}>
                  Save feed
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}

function FeedFields({
  draft,
  setDraft,
}: {
  draft: { name: string; url: string; source: PortalSource }
  setDraft: React.Dispatch<
    React.SetStateAction<{ name: string; url: string; source: PortalSource }>
  >
}) {
  return (
    <div className={formGridClass}>
      <label className="block">
        <span className={formLabelClass}>Name</span>
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          className={formControlClass}
        />
      </label>
      <label className="block">
        <span className={formLabelClass}>Source</span>
        <select
          value={PORTAL_SOURCE_OPTIONS.includes(
            draft.source as (typeof PORTAL_SOURCE_OPTIONS)[number]
          )
            ? draft.source
            : 'indeed'}
          onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value as PortalSource }))}
          className={formSelectClass}
        >
          {PORTAL_SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {PORTAL_SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className={formLabelClass}>
          URL <span className="text-red-500">*</span>
        </span>
        <input
          value={draft.url}
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
          required
          className={formControlClass}
        />
      </label>
    </div>
  )
}
