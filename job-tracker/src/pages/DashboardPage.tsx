import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { KanbanBoard } from '../components/KanbanBoard'
import {
  applicationsToday,
  buildApplyCountsByDate,
  computeApplyStreak,
  countApplyDaysInYear,
} from '../lib/applyStreak'
import { collectSearchHits } from '../lib/jobSearch'
import { pageCardClass, pageCardHoverClass, btnPrimaryClass } from '../lib/appUi'
import { STATUS_CONFIG, STATUS_ORDER } from '../types/job'
import { useJobs } from '../hooks/useJobs'

function hitColumnLabel(trashed: boolean, status: string): string {
  if (trashed) return 'Trash'
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label ?? status
}

export function DashboardPage() {
  const { jobs, activeJobs, trashedJobs, moveJob, restoreJob, purgeJob, loading } = useJobs()
  const [showRejected, setShowRejected] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [boardSearch, setBoardSearch] = useState('')

  const searchHits = useMemo(
    () => collectSearchHits(activeJobs, trashedJobs, boardSearch),
    [activeJobs, trashedJobs, boardSearch]
  )
  const searching = boardSearch.trim().length > 0

  const stats = STATUS_ORDER.map((status) => ({
    status,
    count: activeJobs.filter((j) => j.status === status).length,
  }))

  // Include trashed applies so history on the yearly streak stays intact
  const applyCounts = useMemo(() => buildApplyCountsByDate(jobs), [jobs])
  const applyStreak = useMemo(() => computeApplyStreak(applyCounts), [applyCounts])
  const appliedToday = useMemo(() => applicationsToday(applyCounts), [applyCounts])
  const applyDaysYear = useMemo(
    () => countApplyDaysInYear(applyCounts, new Date().getFullYear()),
    [applyCounts]
  )

  return (
    <div className="space-y-6">
      <PageHero
        label="ApplyTrack"
        title={
          <>
            Find · Tailor · <span className="gradient-text">Track</span>
          </>
        }
        description="Your job-search command center — inbox matches, Kanban pipeline, and AI tailoring in one place."
      />

      <section className={`${pageCardClass} p-5 sm:p-6`}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display font-semibold text-slate-900">Application streak</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Streak</p>
              <p className="font-bold text-sky-600">
                {applyStreak} day{applyStreak === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Today</p>
              <p className="font-bold">
                {appliedToday} {appliedToday === 1 ? 'apply' : 'applies'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{new Date().getFullYear()}</p>
              <p className="font-bold">{applyDaysYear} active days</p>
            </div>
          </div>
        </div>
        <ActivityHeatmap variant="apply" countsByDate={applyCounts} mode="year" />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ status, count }) => {
          const isRejected = status === 'rejected'
          const active = isRejected && showRejected
          const className = `rounded-2xl border p-4 text-center transition ${pageCardHoverClass} ${
            isRejected
              ? `w-full ${
                  active
                    ? 'border-red-200 bg-red-50 ring-2 ring-red-100'
                    : 'border-slate-200 bg-white hover:border-red-200'
                }`
              : `${pageCardClass} border-slate-200/80`
          }`

          if (isRejected) {
            return (
              <button
                key={status}
                type="button"
                onClick={() => setShowRejected((v) => !v)}
                className={className}
                aria-pressed={showRejected}
                title={showRejected ? 'Hide Rejected column' : 'Show Rejected column on the board'}
              >
                <p className="text-2xl font-bold text-sky-600">{count}</p>
                <p className="text-xs capitalize text-slate-500">
                  {STATUS_CONFIG[status].label}
                  <span className="mt-0.5 block text-[10px] font-normal normal-case text-slate-400">
                    {showRejected ? 'Click to hide column' : 'Click to show on board'}
                  </span>
                </p>
              </button>
            )
          }

          return (
            <div key={status} className={className}>
              <p className="text-2xl font-bold text-sky-600">{count}</p>
              <p className="text-xs capitalize text-slate-500">{status}</p>
            </div>
          )
        })}

        <button
          type="button"
          onClick={() => setShowTrash((v) => !v)}
          className={`rounded-2xl border p-4 text-center transition ${pageCardHoverClass} ${
            showTrash
              ? 'border-slate-300 bg-slate-50 ring-2 ring-slate-200'
              : `${pageCardClass} border-slate-200/80 hover:border-slate-300`
          }`}
          aria-pressed={showTrash}
          title={showTrash ? 'Hide Trash column' : 'Show Trash column on the board'}
        >
          <p className="text-2xl font-bold text-sky-600">{trashedJobs.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Trash
            <span className="mt-0.5 block text-[10px] font-normal normal-case text-slate-400">
              {showTrash ? 'Click to hide column' : 'Click to show on board'}
            </span>
          </p>
        </button>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor="board-search" className="sr-only">
              Search applications
            </label>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
              />
            </svg>
            <input
              id="board-search"
              type="search"
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              placeholder="Company, role, URL…"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none ring-sky-100 transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2"
              autoComplete="off"
            />
            {boardSearch && (
              <button
                type="button"
                onClick={() => setBoardSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {searching && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                searchHits.length >= 2
                  ? 'bg-amber-100 text-amber-900'
                  : searchHits.length === 1
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {searchHits.length === 0
                ? 'No matches'
                : searchHits.length === 1
                  ? '1 match'
                  : `${searchHits.length} matches`}
            </span>
            {searchHits.map(({ job, trashed }) => (
              <Link
                key={job.id}
                to={`/job/${job.id}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/50"
              >
                <span className="truncate font-medium">
                  {job.company || 'Unknown'} · {job.role || 'Untitled'}
                </span>
                <span className="shrink-0 text-slate-400">
                  {hitColumnLabel(trashed, job.status)}
                </span>
              </Link>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading applications…</p>
        ) : activeJobs.length === 0 && trashedJobs.length === 0 ? (
          <div className={`rounded-2xl border border-dashed border-slate-300 ${pageCardClass} p-12 text-center`}>
            <p className="text-4xl">📋</p>
            <h3 className="mt-3 font-display font-semibold text-slate-900">No applications yet</h3>
            <Link to="/add" className={`mt-4 inline-block ${btnPrimaryClass}`}>
              Add your first job
            </Link>
          </div>
        ) : (
          <KanbanBoard
            jobs={activeJobs}
            searchQuery={boardSearch}
            onMoveJob={moveJob}
            showRejected={showRejected}
            onHideRejected={() => setShowRejected(false)}
            showTrash={showTrash}
            trashedJobs={trashedJobs}
            onHideTrash={() => setShowTrash(false)}
            onRestoreJob={restoreJob}
            onPurgeJob={purgeJob}
          />
        )}
      </section>
    </div>
  )
}
