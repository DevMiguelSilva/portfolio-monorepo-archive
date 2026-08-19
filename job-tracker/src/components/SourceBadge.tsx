import { jobSourceLabel } from '../types/job'

interface SourceBadgeProps {
  source: string | null | undefined
  size?: 'sm' | 'md'
}

const SOURCE_STYLES: Record<string, string> = {
  manual:
    'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
  adzuna:
    'bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300/80 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-700',
  indeed:
    'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-300/80 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-700',
  ziprecruiter:
    'bg-green-100 text-green-800 ring-1 ring-inset ring-green-300/80 dark:bg-green-950/60 dark:text-green-300 dark:ring-green-700',
  linkedin:
    'bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-300/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-700',
  other:
    'bg-teal-100 text-teal-800 ring-1 ring-inset ring-teal-300/80 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-700',
}

const DEFAULT_STYLE =
  'bg-teal-100 text-teal-800 ring-1 ring-inset ring-teal-300/80 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-700'

export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const key = (source || 'manual').trim().toLowerCase() || 'manual'
  const style = SOURCE_STYLES[key] ?? DEFAULT_STYLE

  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold tracking-wide ${style} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px] uppercase' : 'px-2.5 py-1 text-xs uppercase'
      }`}
      title={`Source: ${jobSourceLabel(key)}`}
    >
      {jobSourceLabel(key)}
    </span>
  )
}
