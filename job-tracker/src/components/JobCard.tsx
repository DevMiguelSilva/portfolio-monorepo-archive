import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import type { JobApplication } from '../types/job'
import { SourceBadge } from './SourceBadge'

interface JobCardProps {
  job: JobApplication
  isDragging?: boolean
  onDragStart?: (id: string, event: DragEvent<HTMLElement>) => void
  onDragEnd?: () => void
  trashMode?: boolean
  onRestore?: (id: string) => void
  onPurge?: (id: string) => void
}

export function JobCard({
  job,
  isDragging,
  onDragStart,
  onDragEnd,
  trashMode,
  onRestore,
  onPurge,
}: JobCardProps) {
  return (
    <article
      draggable={!trashMode}
      onDragStart={(e) => {
        if (trashMode) return
        onDragStart?.(job.id, e)
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/40 transition hover:border-sky-200 hover:shadow-md hover:shadow-sky-100/40 ${
        trashMode ? '' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <Link to={`/job/${job.id}`} draggable={false} className="block space-y-2">
        <div>
          <h3 className="font-semibold leading-snug text-slate-900">{job.role || 'Untitled role'}</h3>
          <p className="text-sm text-slate-500">{job.company || 'Unknown company'}</p>
        </div>
        {job.location && <p className="text-xs text-slate-400">📍 {job.location}</p>}
        {job.extractedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.extractedSkills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700"
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
          <SourceBadge source={job.source} />
          {!job.jdComplete && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              JD incomplete
            </span>
          )}
        </div>
      </Link>
      {trashMode && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => onRestore?.(job.id)}
            className="text-xs font-medium text-sky-600 hover:underline"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Permanently delete ${job.role} at ${job.company}?`)) {
                onPurge?.(job.id)
              }
            }}
            className="text-xs font-medium text-red-500 hover:underline"
          >
            Delete forever
          </button>
        </div>
      )}
    </article>
  )
}

export function attachCardDragGhost(
  event: DragEvent<HTMLElement>,
  source: HTMLElement = event.currentTarget
): void {
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
  if (![...event.dataTransfer.types].includes('text/plain')) {
    event.dataTransfer.setData('text/plain', 'drag-card')
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => ghost.remove())
  })
}
