import { useState } from 'react'
import type { JobApplication, JobStatus } from '../types/job'
import { STATUS_CONFIG, STATUS_ORDER } from '../types/job'
import { JobCard } from './JobCard'

interface KanbanBoardProps {
  jobs: JobApplication[]
  onMoveJob: (id: string, status: JobStatus) => void
}

export function KanbanBoard({ jobs, onMoveJob }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleDrop = (status: JobStatus) => {
    if (draggedId) {
      onMoveJob(draggedId, status)
      setDraggedId(null)
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status]
        const columnJobs = jobs.filter((job) => job.status === status)

        return (
          <div
            key={status}
            className="min-w-[260px] flex-1"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(status)}
          >
            <div className={`mb-3 flex items-center justify-between rounded-lg border px-3 py-2 ${config.bg} ${config.border}`}>
              <h2 className={`text-sm font-semibold ${config.color}`}>{config.label}</h2>
              <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold dark:bg-black/20">
                {columnJobs.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[120px]">
              {columnJobs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-track-700">
                  Drop jobs here
                </p>
              ) : (
                columnJobs.map((job) => (
                  <JobCard key={job.id} job={job} onDragStart={setDraggedId} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
