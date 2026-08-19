import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import type { JobApplication } from '../types/job'
import { SourceBadge } from './SourceBadge'
import { StatusBadge } from './StatusBadge'

interface JobCardProps {
  job: JobApplication
  isDragging?: boolean
  onDragStart?: (id: string, event: DragEvent<HTMLElement>) => void
  onDragEnd?: () => void
}

export function JobCard({ job, isDragging, onDragStart, onDragEnd }: JobCardProps) {
  return (
    <article
      draggable
      onDragStart={(e) => onDragStart?.(job.id, e)}
      onDragEnd={() => onDragEnd?.()}
      className={`cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing dark:border-track-700 dark:bg-track-800 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <Link to={`/job/${job.id}`} draggable={false} className="block space-y-2">
        <div>
          <h3 className="font-semibold leading-snug">{job.role || 'Untitled role'}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {job.company || 'Unknown company'}
          </p>
        </div>
        {job.location && <p className="text-xs text-slate-400">📍 {job.location}</p>}
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
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={job.status} />
          <SourceBadge source={job.source} />
          {!job.jdComplete && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              JD incomplete
            </span>
          )}
        </div>
      </Link>
    </article>
  )
}

/** Off-screen clone of the card so the browser doesn’t show a URL chip. */
export function attachCardDragGhost(event: DragEvent<HTMLElement>): void {
  const source = event.currentTarget
  const rect = source.getBoundingClientRect()
  const ghost = source.cloneNode(true) as HTMLElement
  ghost.style.width = `${rect.width}px`
  ghost.style.position = 'fixed'
  ghost.style.top = '-1000px'
  ghost.style.left = '-1000px'
  ghost.style.zIndex = '9999'
  ghost.style.pointerEvents = 'none'
  ghost.style.opacity = '1'
  ghost.style.margin = '0'
  ghost.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.28)'
  ghost.removeAttribute('draggable')
  document.body.appendChild(ghost)

  const offsetX = Math.min(Math.max(event.clientX - rect.left, 12), rect.width - 12)
  const offsetY = Math.min(Math.max(event.clientY - rect.top, 12), rect.height - 12)
  event.dataTransfer.setDragImage(ghost, offsetX, offsetY)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', 'job-card')

  requestAnimationFrame(() => {
    requestAnimationFrame(() => ghost.remove())
  })
}
