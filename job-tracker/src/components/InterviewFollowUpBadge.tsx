import {
  INTERVIEW_FOLLOW_UP_LABEL,
  type InterviewFollowUp,
} from '../types/job'

interface InterviewFollowUpBadgeProps {
  outcome: InterviewFollowUp
  size?: 'sm' | 'md'
}

const FOLLOW_UP_STYLES: Record<InterviewFollowUp, string> = {
  pending: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
  waiting: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
}

/** Sits beside the source badge, same shape as the JD incomplete chip. */
export function InterviewFollowUpBadge({ outcome, size = 'sm' }: InterviewFollowUpBadgeProps) {
  const shape =
    size === 'sm' ? 'rounded-full px-2 py-0.5 text-[10px]' : 'rounded-md px-2 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center font-medium ${FOLLOW_UP_STYLES[outcome]} ${shape}`}>
      {INTERVIEW_FOLLOW_UP_LABEL[outcome]}
    </span>
  )
}
