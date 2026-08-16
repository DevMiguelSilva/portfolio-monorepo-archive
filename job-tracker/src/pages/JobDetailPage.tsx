import { Link, useNavigate, useParams } from 'react-router-dom'
import { AiToolsPanel } from '../components/AiToolsPanel'
import { StatusBadge } from '../components/StatusBadge'
import { STATUS_ORDER, type JobStatus } from '../types/job'
import { useJobs } from '../hooks/useJobs'

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getJob, deleteJob, moveJob } = useJobs()
  const job = id ? getJob(id) : undefined

  if (!job) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Job not found.</p>
        <Link to="/" className="mt-2 inline-block text-track-accent hover:underline">
          ← Back to board
        </Link>
      </div>
    )
  }

  const handleDelete = async () => {
    if (confirm(`Delete ${job.role} at ${job.company}?`)) {
      await deleteJob(job.id)
      navigate('/')
    }
  }

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
        ← Back to board
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <StatusBadge status={job.status} size="md" />
          <h1 className="mt-2 text-3xl font-bold">{job.role}</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">{job.company}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
            {job.location && <span>📍 {job.location}</span>}
            {job.salary && <span>💰 {job.salary}</span>}
            {job.appliedDate && <span>📅 Applied {job.appliedDate}</span>}
          </div>
          {job.jobUrl && (
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-track-accent hover:underline"
            >
              View posting →
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={job.status}
            onChange={(e) => moveJob(job.id, e.target.value as JobStatus)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>
      </div>

      {job.extractedSkills.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Skills required</h2>
          <div className="flex flex-wrap gap-2">
            {job.extractedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {job.extractedRequirements.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Requirements</h2>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {job.extractedRequirements.map((req) => (
              <li key={req} className="flex gap-2">
                <span className="text-track-accent">•</span>
                {req}
              </li>
            ))}
          </ul>
        </section>
      )}

      {job.notes && (
        <section>
          <h2 className="mb-2 font-semibold">Notes</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{job.notes}</p>
        </section>
      )}

      <AiToolsPanel job={job} />
    </div>
  )
}
