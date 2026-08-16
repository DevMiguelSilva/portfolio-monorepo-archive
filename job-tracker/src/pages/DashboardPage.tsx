import { Link } from 'react-router-dom'
import { KanbanBoard } from '../components/KanbanBoard'
import { STATUS_ORDER } from '../types/job'
import { useJobs } from '../hooks/useJobs'

export function DashboardPage() {
  const { jobs, moveJob, loading } = useJobs()

  const stats = STATUS_ORDER.map((status) => ({
    status,
    count: jobs.filter((j) => j.status === status).length,
  }))

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-track-accent to-indigo-800 px-6 py-10 text-white sm:px-10">
        <p className="mb-1 text-sm uppercase tracking-widest text-indigo-200">Portfolio Project #2</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Job Application Tracker</h1>
        <p className="mt-2 max-w-xl text-indigo-100">
          Track your applications, drag jobs across stages, and use AI to parse postings and tailor your applications.
        </p>
        <Link
          to="/add"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-track-accent transition hover:bg-indigo-50"
        >
          + Add new application
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(({ status, count }) => (
          <div
            key={status}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-track-700 dark:bg-track-800"
          >
            <p className="text-2xl font-bold text-track-accent">{count}</p>
            <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{status}</p>
          </div>
        ))}
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
              Add your first job and paste a posting to try the AI tools.
            </p>
            <Link
              to="/add"
              className="mt-4 inline-block rounded-lg bg-track-accent px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Add your first job
            </Link>
          </div>
        ) : (
          <KanbanBoard jobs={jobs} onMoveJob={moveJob} />
        )}
      </section>
    </div>
  )
}
