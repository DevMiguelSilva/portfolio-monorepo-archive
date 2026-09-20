import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardLook } from '../components/BoardLook'
import { PageHero } from '../components/PageHero'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { KanbanBoard, type BoardColumn } from '../components/KanbanBoard'
import {
  applicationsToday,
  buildApplyCountsByDate,
  computeApplyStreak,
  countApplyDaysInYear,
} from '../lib/applyStreak'
import { collectSearchHits } from '../lib/jobSearch'
import { BOARD_TONE } from '../lib/boardTone'
import {
  INTERVIEW_FOLLOW_UP_LABEL,
  interviewBoardLine,
  latestInterviewFollowUp,
  STATUS_CONFIG,
  STATUS_ORDER,
  type JobApplication,
} from '../types/job'
import { useJobs } from '../hooks/useJobs'
import { useTailoredDocs } from '../hooks/useTailoredDocs'

type EndColumn = 'offer' | 'rejected' | 'trash'

function useNarrowBoard() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 639px)').matches)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const onChange = () => setNarrow(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return narrow
}

function hitColumnLabel(trashed: boolean, job: JobApplication): string {
  if (trashed) return 'Trash'
  const label = STATUS_CONFIG[job.status]?.label ?? job.status
  if (job.status === 'interview') {
    if (job.notSelected) return `${label} · Not selected`
    const line = interviewBoardLine(job.interviews)
    const followUp = latestInterviewFollowUp(job.interviews)
    const followLabel = followUp ? INTERVIEW_FOLLOW_UP_LABEL[followUp] : null
    return [label, line, followLabel].filter(Boolean).join(' · ')
  }
  return label
}

export function DashboardPage() {
  const { jobs, activeJobs, trashedJobs, moveJob, restoreJob, purgeJob, emptyTrash, loading } =
    useJobs()
  const { getForJob } = useTailoredDocs()
  const narrow = useNarrowBoard()
  const [endColumn, setEndColumn] = useState<EndColumn>('offer')
  const [mobileColumn, setMobileColumn] = useState<BoardColumn>('saved')
  const [boardSearch, setBoardSearch] = useState('')

  const searchHits = useMemo(
    () => collectSearchHits(activeJobs, trashedJobs, boardSearch),
    [activeJobs, trashedJobs, boardSearch]
  )
  const searching = boardSearch.trim().length > 0

  const stats = STATUS_ORDER.map((status) => ({
    status,
    count: activeJobs.filter((j) => j.status === status).length,
  }))

  // Include trashed applies so history on the yearly streak stays intact
  const applyCounts = useMemo(() => buildApplyCountsByDate(jobs), [jobs])
  const applyStreak = useMemo(() => computeApplyStreak(applyCounts), [applyCounts])
  const appliedToday = useMemo(() => applicationsToday(applyCounts), [applyCounts])
  const applyDaysYear = useMemo(
    () => countApplyDaysInYear(applyCounts, new Date().getFullYear()),
    [applyCounts]
  )
  const boardColumns: BoardColumn[] = narrow
    ? [mobileColumn]
    : ['saved', 'applied', 'interview', endColumn]

  return (
    <div className={boardLook.page}>
      <PageHero
        label="ApplyTrack"
        title={
          <>
            Find · Tailor · <span className="text-brand-primary">Track</span>
          </>
        }
        description="Your job-search command center — inbox matches, Kanban pipeline, and AI tailoring in one place."
      />

      <section className={`${boardLook.card} ${boardLook.cardPad}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={boardLook.streakTitle}>Application streak</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className={boardLook.caption}>Streak</p>
              <p className={boardLook.streakValue}>
                {applyStreak} day{applyStreak === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className={boardLook.caption}>Today</p>
              <p className={boardLook.streakQuiet}>
                {appliedToday} {appliedToday === 1 ? 'apply' : 'applies'}
              </p>
            </div>
            <div>
              <p className={boardLook.caption}>{new Date().getFullYear()}</p>
              <p className={boardLook.streakQuiet}>{applyDaysYear} active days</p>
            </div>
          </div>
        </div>
        <ActivityHeatmap variant="apply" countsByDate={applyCounts} mode="year" />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ status, count }) => (
          <CountCard
            key={status}
            slot={status}
            label={STATUS_CONFIG[status].label}
            count={count}
            narrow={narrow}
            endColumn={endColumn}
            mobileColumn={mobileColumn}
            onDesktop={(slot) => {
              if (slot === 'offer') setEndColumn('offer')
              else if (slot === 'rejected' || slot === 'trash') {
                setEndColumn((current) => (current === slot ? 'offer' : slot))
              }
            }}
            onMobile={setMobileColumn}
          />
        ))}
        <CountCard
          slot="trash"
          label="Trash"
          count={trashedJobs.length}
          narrow={narrow}
          endColumn={endColumn}
          mobileColumn={mobileColumn}
          onDesktop={(slot) => {
            if (slot === 'trash') setEndColumn((current) => (current === 'trash' ? 'offer' : 'trash'))
          }}
          onMobile={setMobileColumn}
        />
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor="board-search" className="sr-only">
              Search applications
            </label>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
              />
            </svg>
            <input
              id="board-search"
              type="search"
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              placeholder="Company, role, URL…"
              className={boardLook.search}
              autoComplete="off"
            />
            {boardSearch && (
              <button
                type="button"
                onClick={() => setBoardSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-brand-muted hover:bg-brand-mist hover:text-brand-ink"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {searching && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                searchHits.length >= 2
                  ? 'bg-amber-100 text-amber-900'
                  : searchHits.length === 1
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {searchHits.length === 0
                ? 'No matches'
                : searchHits.length === 1
                  ? '1 match'
                  : `${searchHits.length} matches`}
            </span>
            {searchHits.map(({ job, trashed }) => (
              <Link
                key={job.id}
                to={`/job/${job.id}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-brand-line bg-white px-2.5 py-1 text-xs text-brand-ink transition hover:border-brand-primary/50 hover:bg-brand-mist"
              >
                <span className="truncate font-medium">
                  {job.company || 'Unknown'} · {job.role || 'Untitled'}
                </span>
                <span className="shrink-0 text-brand-muted">
                  {hitColumnLabel(trashed, job)}
                </span>
              </Link>
            ))}
          </div>
        )}

        {loading ? (
          <p className={boardLook.body}>Loading applications…</p>
        ) : activeJobs.length === 0 && trashedJobs.length === 0 ? (
          <div className={boardLook.empty}>
            <p className="text-4xl">📋</p>
            <h3 className={boardLook.emptyTitle}>No applications yet</h3>
            <Link to="/add" className={`mt-4 ${boardLook.button}`}>
              Add your first job
            </Link>
          </div>
        ) : (
          <KanbanBoard
            jobs={activeJobs}
            searchQuery={boardSearch}
            onMoveJob={(id, status) => {
              if (status === 'applied') {
                const job = jobs.find((item) => item.id === id)
                if (job?.status === 'saved' && !getForJob(id)?.tailoredCv) return
              }
              moveJob(id, status)
            }}
            columns={boardColumns}
            trashedJobs={trashedJobs}
            onRestoreJob={restoreJob}
            onPurgeJob={purgeJob}
            onEmptyTrash={emptyTrash}
          />
        )}
      </section>
    </div>
  )
}

function CountCard({
  slot,
  label,
  count,
  narrow,
  endColumn,
  mobileColumn,
  onDesktop,
  onMobile,
}: {
  slot: BoardColumn
  label: string
  count: number
  narrow: boolean
  endColumn: EndColumn
  mobileColumn: BoardColumn
  onDesktop: (slot: BoardColumn) => void
  onMobile: (slot: BoardColumn) => void
}) {
  const selectable = narrow || slot === 'offer' || slot === 'rejected' || slot === 'trash'
  const selected = narrow ? mobileColumn === slot : endColumn === slot && selectable
  const className = `border p-4 text-center ${boardLook.cardHover} ${boardLook.card} ${
    selected ? 'ring-2 ring-brand-primary/40' : ''
  }`
  const body = (
    <>
      <p className={`${boardLook.figure} ${BOARD_TONE[slot].figure}`}>{count}</p>
      <p className={`mt-1 capitalize ${boardLook.caption}`}>{label}</p>
    </>
  )

  if (!selectable) {
    return <div className={className}>{body}</div>
  }

  const title =
    slot === 'rejected' || slot === 'trash' || slot === 'offer'
      ? selected
        ? `Showing ${label}`
        : `Show ${label} in the last column`
      : `Show ${label}`

  return (
    <button type="button" onClick={() => (narrow ? onMobile(slot) : onDesktop(slot))} className={className} aria-pressed={selected} title={title}>
      {body}
    </button>
  )
}
