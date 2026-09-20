import { useState } from 'react'
import type { JobApplication, JobStatus } from '../types/job'
import { STATUS_CONFIG } from '../types/job'
import { filterJobsBySearch } from '../lib/jobSearch'
import { boardLook } from './BoardLook'
import { attachCardDragGhost, JobCard } from './JobCard'

function ColumnHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 isolate">
      <div className="bg-[#f7fbf9] px-1 pb-1 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-semibold tracking-tight text-brand-ink">{title}</h2>
          <span className="font-sans text-sm font-medium tabular-nums text-brand-muted">{count}</span>
        </div>
      </div>
      <div
        className="pointer-events-none h-4 bg-gradient-to-b from-[#f7fbf9] to-transparent"
        aria-hidden
      />
    </div>
  )
}

export type BoardColumn = JobStatus | 'trash'

interface KanbanBoardProps {
  jobs: JobApplication[]
  onMoveJob: (id: string, status: JobStatus) => void
  /** Filter cards across all columns (company, role, URL, external id). */
  searchQuery?: string
  /** Columns to show, in order. Rejected and trash replace offer instead of adding a new column. */
  columns?: BoardColumn[]
  trashedJobs?: JobApplication[]
  onRestoreJob?: (id: string) => void
  onPurgeJob?: (id: string) => void
  onEmptyTrash?: () => void
}

export function KanbanBoard({
  jobs,
  onMoveJob,
  searchQuery = '',
  columns = ['saved', 'applied', 'interview', 'offer'],
  trashedJobs = [],
  onRestoreJob,
  onPurgeJob,
  onEmptyTrash,
}: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<JobStatus | null>(null)
  const single = columns.length === 1
  const visibleJobs = filterJobsBySearch(jobs, searchQuery)
  const searching = searchQuery.trim().length > 0
  const visibleTrash = filterJobsBySearch(trashedJobs, searchQuery)
  const listTop = 'mt-1'
  const rowClass = single ? 'flex' : 'grid grid-cols-4 gap-3'
  const colClass = single ? 'w-full min-w-0' : 'min-w-0'

  const handleDrop = (status: JobStatus) => {
    if (draggedId) {
      onMoveJob(draggedId, status)
    }
    setDraggedId(null)
    setDropTarget(null)
  }

  return (
    <div className={boardLook.kanban}>
      <div className={rowClass}>
        {columns.map((column) => {
          if (column === 'trash') {
            return (
              <div key="trash" className={colClass}>
                <ColumnHead title="Trash" count={visibleTrash.length} />
                <div className={`${listTop} min-h-[7rem] space-y-2`}>
                  {trashedJobs.length > 0 && onEmptyTrash && (
                    <button
                      type="button"
                      onClick={() => {
                        const count = trashedJobs.length
                        const label = count === 1 ? '1 job' : `${count} jobs`
                        if (
                          confirm(
                            `Permanently delete ${label} in trash? This cannot be undone.`
                          )
                        ) {
                          onEmptyTrash()
                        }
                      }}
                      className="w-full rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-xs font-semibold text-brand-ink transition hover:border-red-200 hover:text-red-700"
                    >
                      Empty trash
                    </button>
                  )}
                  {visibleTrash.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-track-700">
                      {searching ? 'No matches in trash' : 'No deleted jobs'}
                    </p>
                  ) : (
                    visibleTrash.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        trashMode
                        onRestore={onRestoreJob}
                        onPurge={onPurgeJob}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          }

          const status = column
          const config = STATUS_CONFIG[status]
          const columnJobs = visibleJobs
            .filter((job) => job.status === status)
            .sort((a, b) => {
              if (status !== 'interview') return 0
              return Number(a.notSelected) - Number(b.notSelected)
            })
          const isTarget = dropTarget === status && draggedId != null

          return (
            <div
              key={status}
              className={colClass}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDropTarget(status)
              }}
              onDragLeave={() => {
                setDropTarget((current) => (current === status ? null : current))
              }}
              onDrop={() => handleDrop(status)}
            >
              <ColumnHead title={config.label} count={columnJobs.length} />
              <div
                className={`${listTop} min-h-[7rem] space-y-2 rounded-lg transition ${
                  isTarget ? 'bg-brand-primary/10 ring-2 ring-inset ring-brand-primary/40' : ''
                }`}
              >
                {columnJobs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-track-700">
                    {searching ? 'No matches in this column' : 'Drop jobs here'}
                  </p>
                ) : (
                  columnJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isDragging={draggedId === job.id}
                      onDragStart={(id, event) => {
                        setDraggedId(id)
                        attachCardDragGhost(event)
                      }}
                      onDragEnd={() => {
                        setDraggedId(null)
                        setDropTarget(null)
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
