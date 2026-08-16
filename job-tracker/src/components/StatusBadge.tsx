import type { JobStatus } from '../types/job'
import { STATUS_CONFIG } from '../types/job'

interface StatusBadgeProps {
  status: JobStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.color} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {config.label}
    </span>
  )
}
