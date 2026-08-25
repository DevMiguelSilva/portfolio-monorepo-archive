import { useState, type ReactNode } from 'react'
import type { JobApplication, JobStatus } from '../types/job'
import { BOARD_STATUS_ORDER, STATUS_CONFIG, STATUS_ORDER } from '../types/job'
import { filterJobsBySearch } from '../lib/jobSearch'
import { attachCardDragGhost, JobCard } from './JobCard'

const COLUMN_HEADER_BG: Record<JobStatus, string> = {
  saved: 'bg-slate-200',
  applied: 'bg-sky-100',
  interview: 'bg-amber-100',
  offer: 'bg-emerald-100',
  rejected: 'bg-red-100',
}

function ColumnHead({
  title,
  titleClass,
  pillClass,
  borderClass,
  count,
  extra,
}: {
  title: string
  titleClass: string
  pillClass: string
  borderClass: string
  count: number
  extra?: ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 isolate">
      <div className="bg-slate-50 pt-3">
        <div
          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${pillClass} ${borderClass}`}
        >
          <h2 className={`text-sm font-semibold ${titleClass}`}>{title}</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold">{count}</span>
            {extra}
          </div>
        </div>
      </div>
      <div
        className="pointer-events-none h-5 bg-gradient-to-b from-slate-50 to-transparent"
        aria-hidden
      />
    </div>
  )
}

interface KanbanBoardProps {
  jobs: JobApplication[]
  onMoveJob: (id: string, status: JobStatus) => void
  /** Filter cards across all columns (company, role, URL, external id). */
  searchQuery?: string
  /** When false, Rejected column is hidden (jobs still tracked). */
  showRejected?: boolean
  onHideRejected?: () => void
  showTrash?: boolean
  trashedJobs?: JobApplication[]
  onHideTrash?: () => void
  onRestoreJob?: (id: string) => void
  onPurgeJob?: (id: string) => void
}

export function KanbanBoard({
  jobs,
  onMoveJob,
  searchQuery = '',
  showRejected = false,
  onHideRejected,
  showTrash = false,
  trashedJobs = [],
  onHideTrash,
  onRestoreJob,
  onPurgeJob,
}: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<JobStatus | null>(null)
  const columns = showRejected ? STATUS_ORDER : BOARD_STATUS_ORDER
  const visibleJobs = filterJobsBySearch(jobs, searchQuery)
  const searching = searchQuery.trim().length > 0
  const visibleTrash = filterJobsBySearch(trashedJobs, searchQuery)

  const handleDrop = (status: JobStatus) => {
    if (draggedId) {
      onMoveJob(draggedId, status)
    }
    setDraggedId(null)
    setDropTarget(null)
  }

  return (
    <div className="app-scroll max-h-[40rem] overflow-auto rounded-2xl border border-slate-200/80 bg-slate-50 px-3 pb-3 shadow-sm">
      <div className="flex min-w-min gap-4">
        {columns.map((status) => {
          const config = STATUS_CONFIG[status]
          const columnJobs = visibleJobs.filter((job) => job.status === status)
          const isTarget = dropTarget === status && draggedId != null

          return (
            <div
              key={status}
              className="min-w-[260px] flex-1"
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
              <ColumnHead
                title={config.label}
                titleClass={config.color}
                pillClass={COLUMN_HEADER_BG[status]}
                borderClass={config.border}
                count={columnJobs.length}
                extra={
                  status === 'rejected' && onHideRejected ? (
                    <button
                      type="button"
                      onClick={onHideRejected}
                      className="text-xs font-medium text-red-600/80 hover:underline"
                    >
                      Hide
                    </button>
                  ) : null
                }
              />
              <div
                className={`-mt-2 min-h-[7rem] space-y-2 rounded-lg transition ${
                  isTarget ? 'bg-track-accent/5 ring-2 ring-inset ring-track-accent/30' : ''
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

        {showTrash && (
          <div className="min-w-[260px] flex-1">
            <ColumnHead
              title="Trash"
              titleClass="text-slate-600"
              pillClass="bg-slate-200"
              borderClass="border-slate-300"
              count={visibleTrash.length}
              extra={
                onHideTrash ? (
                  <button
                    type="button"
                    onClick={onHideTrash}
                    className="text-xs font-medium text-slate-500 hover:underline"
                  >
                    Hide
                  </button>
                ) : null
              }
            />
            <div className="-mt-2 min-h-[7rem] space-y-2">
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
        )}
      </div>
    </div>
  )
}
