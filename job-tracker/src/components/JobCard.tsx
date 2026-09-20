import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import type { JobApplication } from '../types/job'
import { jobSourceLabel, latestInterviewFollowUp } from '../types/job'
import { BOARD_TONE } from '../lib/boardTone'
import { boardLook } from './BoardLook'

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
  const followUp = job.status === 'interview' ? latestInterviewFollowUp(job.interviews) : null
  const company = job.company || 'Unknown company'
  const pay = job.salary.trim()
  const showPay =
    pay.length > 0 &&
    (job.status === 'interview' ||
      job.status === 'offer' ||
      (job.status === 'rejected' && job.interviews.length > 0))
  const location = job.location.trim()
  const tone = BOARD_TONE[trashMode ? 'trash' : job.status]

  return (
    <article
      draggable={!trashMode}
      onDragStart={(e) => {
        if (trashMode) return
        onDragStart?.(job.id, e)
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`${boardLook.jobCard} min-w-0 ${tone.edge} ${
        trashMode ? '' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <Link to={`/job/${job.id}`} draggable={false} className="block min-w-0 space-y-2">
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`${boardLook.jobTitle} min-w-0 break-words`}>{job.role || 'Untitled role'}</h3>
            <span className="shrink-0 pt-0.5 text-[11px] font-medium text-brand-muted">
              {jobSourceLabel(job.source)}
            </span>
          </div>
          <p className={boardLook.jobMeta}>{company}</p>
          {location && <p className={`${boardLook.jobMeta} truncate`}>{location}</p>}
          {showPay && <p className={boardLook.jobMeta}>{pay}</p>}
          {job.status === 'interview' && job.notSelected && (
            <p className="truncate pt-1 text-[11px] font-semibold text-brand-muted">Not selected</p>
          )}
          {job.status === 'interview' && !job.notSelected && followUp === 'waiting' && (
            <p className="truncate pt-1 text-[11px] font-semibold text-emerald-700">
              Waiting for an answer
            </p>
          )}
          {job.status === 'interview' && !job.notSelected && followUp === 'pending' && (
            <p className="truncate pt-1 text-[11px] font-semibold text-emerald-700">Interview booked</p>
          )}
          {!job.jdComplete && !job.needsRescore && (
            <p className="pt-1 text-[11px] font-semibold text-[#8a6230]">Description incomplete</p>
          )}
        </div>
      </Link>
      {trashMode && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onRestore?.(job.id)}
            className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${BOARD_TONE.saved.action}`}
          >
            Restore
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Permanently delete ${job.role} at ${job.company}? This cannot be undone.`)) {
                onPurge?.(job.id)
              }
            }}
            className="rounded-lg border border-[#e6eeeb] bg-white px-2 py-1.5 text-xs font-semibold text-brand-muted transition hover:border-red-200 hover:text-red-700"
          >
            Delete
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
