import { useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { boardLook } from '../components/BoardLook'
import { IconAction } from '../components/IconAction'
import { attachCardDragGhost } from '../components/JobCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { usePortalFeeds } from '../hooks/usePortalFeeds'
import {
  PORTAL_SOURCE_LABELS,
  PORTAL_SOURCE_OPTIONS,
  type PortalFeed,
  type PortalSource,
} from '../types/portal'

const toolbarBtn =
  'm-action rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-[#f4faf8] disabled:opacity-60'
const refreshBtn =
  'm-action rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-primary hover:bg-brand-mist disabled:opacity-60'
const rowBtn =
  'rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-center text-sm font-semibold text-brand-ink transition hover:bg-[#f4faf8] disabled:opacity-60'
const rowRun =
  'rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-center text-sm font-semibold text-brand-ink transition hover:border-brand-primary hover:bg-brand-mist disabled:opacity-60'
const rowDanger =
  'rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-center text-sm font-semibold text-red-700 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-60'
const fieldLabel = 'text-sm text-brand-muted'
const fieldControl =
  'mt-1 w-full rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-primary'

type FeedDraft = { name: string; url: string; source: PortalSource }

const emptyDraft: FeedDraft = { name: '', url: '', source: 'indeed' }

export function PortalsPage() {
  const {
    feeds,
    loading,
    activeFeeds,
    todayCheckedIds,
    addFeed,
    updateFeed,
    deleteFeed,
    reorderFeeds,
    toggleCheckedToday,
    openFeed,
    openAllActive,
  } = usePortalFeeds()

  const [draft, setDraft] = useState<FeedDraft>(emptyDraft)
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<FeedDraft>(emptyDraft)
  const [busyFeedId, setBusyFeedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (!draft.url.trim()) {
      setError('URL is required')
      return
    }
    try {
      await addFeed({ ...draft, name: draft.name.trim(), url: draft.url.trim() })
      setDraft(emptyDraft)
      setShowAddFeed(false)
      setMessage('Feed saved')
      window.setTimeout(() => setMessage(null), 2000)
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
    setError(null)
  }

  const saveEdit = async (event: React.FormEvent, id: string) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setBusyFeedId(id)
    try {
      await updateFeed(id, {
        name: editDraft.name.trim() || 'Untitled feed',
        url: editDraft.url.trim(),
        source: editDraft.source,
      })
      setEditingId(null)
      setMessage('Feed updated')
      window.setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feed')
    } finally {
      setBusyFeedId(null)
    }
  }

  const handleOpenAll = async () => {
    setError(null)
    setMessage(null)
    try {
      const { opened, blockedHint, remaining } = await openAllActive()
      if (opened === 0) {
        setMessage('Browser blocked the tabs. Allow pop-ups for this site, then try again.')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open active feeds')
    }
  }

  const handleOpenFeed = async (feed: PortalFeed) => {
    setError(null)
    setMessage(null)
    try {
      await openFeed(feed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open feed')
    }
  }

  const handleToggleActive = async (feed: PortalFeed) => {
    setError(null)
    setMessage(null)
    setBusyFeedId(feed.id)
    try {
      await updateFeed(feed.id, { active: !feed.active })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feed')
    } finally {
      setBusyFeedId(null)
    }
  }

  const handleDelete = async (feed: PortalFeed) => {
    setError(null)
    setMessage(null)
    setBusyFeedId(feed.id)
    try {
      await deleteFeed(feed.id)
      if (editingId === feed.id) setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feed')
    } finally {
      setBusyFeedId(null)
    }
  }

  const handleToggleChecked = async (feed: PortalFeed) => {
    setError(null)
    setMessage(null)
    try {
      await toggleCheckedToday(feed.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update today’s checklist')
    }
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

  const checkedActiveCount = activeFeeds.filter((feed) => todayCheckedIds.has(feed.id)).length

  return (
    <div className="space-y-4 font-sans text-brand-ink">
      <div className="space-y-3">
        <Link to="/" className="text-sm font-medium text-brand-muted hover:text-brand-ink">
          ← Back to board
        </Link>
        <div className="m-action-row flex flex-wrap items-center justify-between gap-4">
          <h1 className={boardLook.headline}>Portals</h1>
          <div className="m-actions flex flex-wrap gap-2">
            <button
              type="button"
              data-role="primary"
              onClick={() => void handleOpenAll()}
              disabled={activeFeeds.length === 0 || Boolean(busyFeedId)}
              className={refreshBtn}
            >
              Open all active ({activeFeeds.length})
            </button>
          </div>
        </div>
      </div>

      {(message || error) && (
        <p
          className={`text-sm ${error ? 'text-red-700' : 'text-brand-primaryDeep'}`}
          role={error ? 'alert' : 'status'}
        >
          {error || message}
        </p>
      )}

      <section className={`${boardLook.card} space-y-4 p-4 sm:p-5`}>
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-brand-ink">Your feeds</h2>
          <p className="text-xs text-brand-muted">
            {checkedActiveCount} of {activeFeeds.length} active feeds checked today.
          </p>
        </div>

        {feeds.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[#e6eeeb] bg-white p-8 text-center">
            <h3 className="font-display text-lg font-semibold text-brand-ink">No portal feeds yet</h3>
            <p className="mt-2 text-sm text-brand-muted">Add a job-search URL to keep it ready for your next search session.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {feeds.map((feed, index) => {
              const checked = todayCheckedIds.has(feed.id)
              const busy = busyFeedId === feed.id

              return (
                <li
                  key={feed.id}
                  onDragOver={(event) => handleFeedDragOver(index, event)}
                  onDrop={() => void handleFeedDrop(index)}
                  className={`rounded-[1.25rem] border border-[#e6eeeb] bg-white p-4 text-sm ${
                    dragIndex === index ? 'opacity-40' : ''
                  } ${
                    dropIndex === index && dragIndex != null && dragIndex !== index
                      ? 'ring-2 ring-brand-primary/40'
                      : ''
                  }`}
                >
                  {editingId === feed.id ? (
                    <form onSubmit={(event) => void saveEdit(event, feed.id)} className="space-y-2.5">
                      <FeedFields draft={editDraft} setDraft={setEditDraft} />
                      <div className="m-actions flex flex-wrap gap-2">
                        <button
                          type="submit"
                          data-role="primary"
                          disabled={busy}
                          className={refreshBtn}
                        >
                          {busy ? 'Saving…' : 'Save changes'}
                        </button>
                        <button
                          type="button"
                          data-role="quiet"
                          onClick={() => {
                            setEditingId(null)
                            setError(null)
                          }}
                          className={toolbarBtn}
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="search-mobile-only border-t border-[#e6eeeb] pt-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleToggleActive(feed)}
                          className={rowBtn}
                        >
                          {feed.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDelete(feed)}
                          className={rowDanger}
                        >
                          Delete
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="search-row">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => handleFeedDragStart(index, event)}
                          onDragEnd={handleFeedDragEnd}
                          className="search-drag h-8 w-6 shrink-0 cursor-grab select-none items-center justify-center leading-none text-brand-muted active:cursor-grabbing"
                          title="Drag to reorder"
                          aria-label={`Reorder ${feed.name || 'portal feed'}`}
                        >
                          ⋮⋮
                        </button>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!feed.active || busy}
                          onChange={() => void handleToggleChecked(feed)}
                          className="h-4 w-4 shrink-0 accent-emerald-600"
                          title="Checked today"
                          aria-label={`Mark ${feed.name || 'portal feed'} checked today`}
                        />
                        <div className="min-w-0 text-left">
                          <p className="font-medium text-brand-ink">
                            {feed.name || 'Untitled feed'}
                            {feed.active ? (
                              <span className="ml-2 text-xs font-medium text-brand-primaryDeep">active</span>
                            ) : (
                              <span className="ml-2 text-xs text-brand-muted">paused</span>
                            )}
                            {checked && (
                              <span className="ml-2 text-xs text-brand-primaryDeep">checked today ✓</span>
                            )}
                          </p>
                          <p className="mt-1 truncate text-xs leading-relaxed text-brand-muted">
                            {PORTAL_SOURCE_LABELS[feed.source]} · {feed.url}
                          </p>
                        </div>
                      </div>

                      <div className="search-icons">
                        <IconAction label="Open" disabled={busy} onClick={() => void handleOpenFeed(feed)}>
                          <ExternalLinkIcon />
                        </IconAction>
                        <IconAction label="Edit" onClick={() => startEdit(feed)}>
                          <PencilIcon />
                        </IconAction>
                        <IconAction
                          label={feed.active ? 'Pause' : 'Activate'}
                          disabled={busy}
                          onClick={() => void handleToggleActive(feed)}
                        >
                          {feed.active ? <PauseIcon /> : <PlayIcon />}
                        </IconAction>
                        <IconAction label="Delete" danger disabled={busy} onClick={() => void handleDelete(feed)}>
                          <TrashIcon />
                        </IconAction>
                      </div>

                      <div className="search-pair">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleOpenFeed(feed)}
                          className={rowRun}
                        >
                          Open
                        </button>
                        <button type="button" onClick={() => startEdit(feed)} className={rowBtn}>
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-t border-[#e6eeeb] pt-4">
          {!showAddFeed ? (
            <button type="button" onClick={() => setShowAddFeed(true)} className={toolbarBtn}>
              Add portal feed
            </button>
          ) : (
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-base font-semibold text-brand-ink">New portal feed</p>
                <button
                  type="button"
                  data-role="quiet"
                  onClick={() => {
                    setShowAddFeed(false)
                    setDraft(emptyDraft)
                    setError(null)
                  }}
                  className={toolbarBtn}
                >
                  Cancel
                </button>
              </div>
              <FeedFields draft={draft} setDraft={setDraft} />
              <div className="m-actions flex flex-wrap gap-2">
                <button type="submit" data-role="primary" className={refreshBtn}>
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
  draft: FeedDraft
  setDraft: React.Dispatch<React.SetStateAction<FeedDraft>>
}) {
  return (
    <div className="search-fields">
      <label className="block">
        <span className={fieldLabel}>Name</span>
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          className={fieldControl}
        />
      </label>
      <label className="block">
        <span className={fieldLabel}>Source</span>
        <select
          value={PORTAL_SOURCE_OPTIONS.includes(draft.source as (typeof PORTAL_SOURCE_OPTIONS)[number])
            ? draft.source
            : 'indeed'}
          onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value as PortalSource }))}
          className={`${fieldControl} form-select`}
        >
          {PORTAL_SOURCE_OPTIONS.map((source) => (
            <option key={source} value={source}>
              {PORTAL_SOURCE_LABELS[source]}
            </option>
          ))}
        </select>
      </label>
      <label className="search-field-wide block">
        <span className={fieldLabel}>
          URL <span className="text-red-700">*</span>
        </span>
        <input
          type="url"
          value={draft.url}
          onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
          required
          className={fieldControl}
        />
      </label>
    </div>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9 3h4v4M13 3 7.5 8.5M11 8.5v4h-8v-8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
