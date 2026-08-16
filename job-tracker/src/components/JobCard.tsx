import { Link } from 'react-router-dom'
import type { JobApplication } from '../types/job'
import { StatusBadge } from './StatusBadge'

interface JobCardProps {
  job: JobApplication
  onDragStart?: (id: string) => void
}

export function JobCard({ job, onDragStart }: JobCardProps) {
  return (
    <article
      draggable
      onDragStart={() => onDragStart?.(job.id)}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing dark:border-track-700 dark:bg-track-800"
    >
      <Link to={`/job/${job.id}`} className="block space-y-2">
        <div>
          <h3 className="font-semibold leading-snug">{job.role || 'Untitled role'}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{job.company || 'Unknown company'}</p>
        </div>
        {job.location && (
          <p className="text-xs text-slate-400">📍 {job.location}</p>
        )}
        {job.extractedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.extractedSkills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
              >
                {skill}
              </span>
            ))}
            {job.extractedSkills.length > 3 && (
              <span className="text-[10px] text-slate-400">+{job.extractedSkills.length - 3}</span>
            )}
          </div>
        )}
        <StatusBadge status={job.status} />
      </Link>
    </article>
  )
}
