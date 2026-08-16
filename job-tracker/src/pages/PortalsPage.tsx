import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { usePortalFeeds } from '../hooks/usePortalFeeds'
import {
  formControlClass,
  formGridClass,
  formLabelClass,
  formPanelClass,
  formPrimaryBtnClass,
} from '../lib/formUi'
import { countCompleteDaysInYear } from '../lib/huntStreak'
import {
  PORTAL_SOURCE_LABELS,
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

  const activeIds = useMemo(() => activeFeeds.map((f) => f.id), [activeFeeds])
  const yearComplete = useMemo(
    () => countCompleteDaysInYear(daysByDate, activeIds, new Date().getFullYear()),
    [daysByDate, activeIds]
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
    setEditDraft({ name: feed.name, url: feed.url, source: feed.source })
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
    const { opened, blockedHint } = await openAllActive()
    if (blockedHint) {
      setMessage(
        `Opened ${opened} tab(s). Allow pop-ups for this site to open the rest, or open them one by one.`
      )
    } else {
      setMessage(`Opened ${opened} portal(s) and marked them checked for today.`)
    }
  }

  if (loading) return <LoadingSpinner label="Loading portals…" />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
            ← Back to board
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Portal feeds</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Save your usual Indeed / ZipRecruiter filtered links. Open them daily, check them off,
            and keep a streak — like a job-hunt habit tracker.
          </p>
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
        <h2 className="mb-1 font-semibold">Activity</h2>
        <p className="mb-4 text-xs text-slate-500">
          Green cubes = days you checked your portals (GitHub / Duolingo style). Bright = all active
          feeds done that day.
        </p>
        {activeIds.length === 0 ? (
          <p className="text-sm text-slate-500">Add at least one active feed to start a streak.</p>
        ) : (
          <ActivityHeatmap
            variant="portal"
            daysByDate={daysByDate}
            activeFeedIds={activeIds}
            weeks={26}
          />
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
        <h2 className="font-semibold">Your feeds</h2>
        {feeds.length === 0 ? (
          <p className="text-sm text-slate-500">
            No feeds yet. Use “+ Add portal URL” to paste a filtered Indeed or ZipRecruiter link.
          </p>
        ) : (
          <ul className="space-y-3">
            {feeds.map((feed) => {
              const checked = todayCheckedIds.has(feed.id)
              return (
                <li
                  key={feed.id}
                  className="rounded-lg border border-slate-200 p-3 dark:border-track-700"
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
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!feed.active}
                          onChange={() => toggleCheckedToday(feed.id)}
                          className="mt-1 h-4 w-4 accent-emerald-600"
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
                      <div className="flex flex-wrap gap-2">
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
          placeholder="e.g. Indeed FE Toronto"
          className={formControlClass}
        />
      </label>
      <label className="block">
        <span className={formLabelClass}>Source</span>
        <select
          value={draft.source}
          onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value as PortalSource }))}
          className={formControlClass}
        >
          {(Object.keys(PORTAL_SOURCE_LABELS) as PortalSource[]).map((s) => (
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
          placeholder="https://ca.indeed.com/jobs?q=..."
          required
          className={formControlClass}
        />
      </label>
    </div>
  )
}
