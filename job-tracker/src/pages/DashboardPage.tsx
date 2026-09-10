import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { KanbanBoard } from '../components/KanbanBoard'
import {
  applicationsToday,
  buildApplyCountsByDate,
  computeApplyStreak,
  countApplyDaysInYear,
} from '../lib/applyStreak'
import { collectSearchHits } from '../lib/jobSearch'
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
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-track-accent to-indigo-800 px-6 py-10 text-white sm:px-10">
        <p className="mb-1 text-sm uppercase tracking-widest text-indigo-200">ApplyTrack</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Find · Tailor · Track</h1>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold">Application streak</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Streak</p>
              <p className="font-bold text-track-accent">
                {applyStreak} day{applyStreak === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Today</p>
              <p className="font-bold">
                {appliedToday} apply{appliedToday === 1 ? '' : 's'}
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
          const className = `rounded-xl border p-4 text-center transition ${
            isRejected
              ? `w-full ${
                  active
                    ? 'border-red-300 bg-red-50 ring-2 ring-red-200 dark:border-red-800 dark:bg-red-950/30 dark:ring-red-900'
                    : 'border-slate-200 bg-white hover:border-red-300 dark:border-track-700 dark:bg-track-800 dark:hover:border-red-800'
                }`
              : 'border-slate-200 bg-white dark:border-track-700 dark:bg-track-800'
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
                <p className="text-2xl font-bold text-track-accent">{count}</p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
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
              <p className="text-2xl font-bold text-track-accent">{count}</p>
              <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{status}</p>
            </div>
          )
        })}

        <button
          type="button"
          onClick={() => setShowTrash((v) => !v)}
          className={`rounded-xl border p-4 text-center transition ${
            showTrash
              ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-300 dark:border-track-500 dark:bg-track-900 dark:ring-track-600'
              : 'border-slate-200 bg-white hover:border-slate-400 dark:border-track-700 dark:bg-track-800 dark:hover:border-track-500'
          }`}
          aria-pressed={showTrash}
          title={showTrash ? 'Hide Trash column' : 'Show Trash column on the board'}
        >
          <p className="text-2xl font-bold text-track-accent">{trashedJobs.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Trash
            <span className="mt-0.5 block text-[10px] font-normal normal-case text-slate-400">
              {showTrash ? 'Click to hide column' : 'Click to show on board'}
            </span>
          </p>
        </button>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold">Application Board</h2>
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
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none ring-track-accent/20 transition placeholder:text-slate-400 focus:border-track-accent focus:ring-2 dark:border-track-700 dark:bg-track-900"
              autoComplete="off"
            />
            {boardSearch && (
              <button
                type="button"
                onClick={() => setBoardSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-track-800 dark:hover:text-slate-200"
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
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                  : searchHits.length === 1
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-track-800 dark:text-slate-300'
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
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:border-track-accent/40 hover:bg-slate-50 dark:border-track-700 dark:bg-track-800 dark:text-slate-200 dark:hover:bg-track-700/80"
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
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-track-700">
            <p className="text-4xl">📋</p>
            <h3 className="mt-3 font-semibold">No applications yet</h3>
            <Link
              to="/add"
              className="mt-4 inline-block rounded-lg bg-track-accent px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
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
