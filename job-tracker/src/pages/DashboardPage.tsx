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
import { STATUS_CONFIG, STATUS_ORDER } from '../types/job'
import { useJobs } from '../hooks/useJobs'

export function DashboardPage() {
  const { jobs, moveJob, loading } = useJobs()
  const [showRejected, setShowRejected] = useState(false)

  const stats = STATUS_ORDER.map((status) => ({
    status,
    count: jobs.filter((j) => j.status === status).length,
  }))

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
        <p className="mb-1 text-sm uppercase tracking-widest text-indigo-200">ApplyTrack v2</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Find · Tailor · Track</h1>
        <p className="mt-2 max-w-xl text-indigo-100">
          Your application board and apply streak. Use Portals for daily URL check-ins, Inbox for
          Adzuna triage, and CVs to tailor resumes.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Apply streak</h2>
            <p className="text-xs text-slate-500">
              Days you sent applications (from Applied date on each job). Separate from Portals
              check-ins.
            </p>
          </div>
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
        <ActivityHeatmap variant="apply" countsByDate={applyCounts} weeks={26} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Application Board</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading applications…</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-track-700">
            <p className="text-4xl">📋</p>
            <h3 className="mt-3 font-semibold">No applications yet</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Approve from Inbox or add a job, then mark it Applied to grow your streak.
            </p>
            <Link
              to="/add"
              className="mt-4 inline-block rounded-lg bg-track-accent px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Add your first job
            </Link>
          </div>
        ) : (
          <KanbanBoard
            jobs={jobs}
            onMoveJob={moveJob}
            showRejected={showRejected}
            onHideRejected={() => setShowRejected(false)}
          />
        )}
      </section>
    </div>
  )
}
