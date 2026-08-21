import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { jobToRow, rowToJob } from '../lib/database'
import { supabase } from '../lib/supabase'
import type { JobApplication, JobStatus } from '../types/job'
import { createEmptyJob, resolveJdComplete } from '../types/job'
import { useAuth } from './useAuth'

const LOCAL_STORAGE_KEY = 'job-tracker-applications'
const MIGRATED_KEY = 'job-tracker-migrated'

interface JobsContextValue {
  /** All jobs including trash (for streaks / inbox external-id blocking). */
  jobs: JobApplication[]
  /** Active board jobs (not in trash). */
  activeJobs: JobApplication[]
  /** Soft-deleted jobs. */
  trashedJobs: JobApplication[]
  loading: boolean
  addJob: (job: JobApplication) => Promise<void>
  updateJob: (id: string, updates: Partial<JobApplication>) => Promise<void>
  /** Soft-delete → Trash (recoverable). */
  deleteJob: (id: string) => Promise<void>
  restoreJob: (id: string) => Promise<void>
  /** Permanently remove from trash. */
  purgeJob: (id: string) => Promise<void>
  moveJob: (id: string, status: JobStatus) => Promise<void>
  getJob: (id: string) => JobApplication | undefined
  isCloudSync: boolean
}

const JobsContext = createContext<JobsContextValue | null>(null)

function normalizeJob(job: JobApplication): JobApplication {
  const status = job.status ?? 'saved'
  return {
    ...createEmptyJob(),
    ...job,
    status,
    // Saved jobs are not applications — drop stale applied dates from undo moves
    appliedDate: status === 'saved' ? '' : (job.appliedDate ?? ''),
    source: job.source ?? 'manual',
    externalId: job.externalId ?? '',
    matchScore: job.matchScore ?? null,
    cvTrack: job.cvTrack ?? null,
    jdSummary: job.jdSummary ?? '',
    extractedSkills: job.extractedSkills ?? [],
    extractedRequirements: job.extractedRequirements ?? [],
    jdComplete: resolveJdComplete({
      jdComplete: job.jdComplete,
      source: job.source ?? 'manual',
    }),
    deletedAt: job.deletedAt ?? null,
  }
}

function readLocalJobs(): JobApplication[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!stored) return []
    return (JSON.parse(stored) as JobApplication[]).map(normalizeJob)
  } catch {
    return []
  }
}

function writeLocalJobs(jobs: JobApplication[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(jobs))
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [jobs, setJobs] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const isCloudSync = isCloudEnabled && Boolean(user)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      if (!isCloudSync || !supabase || !user) {
        setJobs(readLocalJobs())
        return
      }

      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      let cloudJobs = (data ?? []).map(rowToJob)

      const localJobs = readLocalJobs()
      const alreadyMigrated = localStorage.getItem(MIGRATED_KEY) === user.id

      if (!alreadyMigrated && localJobs.length > 0) {
        const rows = localJobs.map((job) => jobToRow(job, user.id))
        const { error: insertError } = await supabase.from('job_applications').upsert(rows)
        if (!insertError) {
          localStorage.setItem(MIGRATED_KEY, user.id)
          cloudJobs = [...localJobs, ...cloudJobs.filter((j) => !localJobs.some((l) => l.id === j.id))]
        }
      }

      setJobs(cloudJobs.map(normalizeJob))
    } catch (err) {
      console.error('Failed to load jobs:', err)
      setJobs(readLocalJobs())
    } finally {
      setLoading(false)
    }
  }, [isCloudSync, user])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const persistLocal = useCallback((next: JobApplication[]) => {
    setJobs(next)
    writeLocalJobs(next)
  }, [])

  const addJob = useCallback(
    async (job: JobApplication) => {
      const normalized = normalizeJob({ ...job, deletedAt: null })
      if (isCloudSync && supabase && user) {
        const row = { ...jobToRow(normalized, user.id), updated_at: new Date().toISOString() }
        const { error } = await supabase.from('job_applications').insert(row)
        if (error) throw error
        setJobs((prev) => [normalized, ...prev])
      } else {
        persistLocal([normalized, ...jobs])
      }
    },
    [isCloudSync, user, jobs, persistLocal]
  )

  const updateJob = useCallback(
    async (id: string, updates: Partial<JobApplication>) => {
      const updatedAt = new Date().toISOString()
      const nextJobs = jobs.map((job) =>
        job.id === id ? normalizeJob({ ...job, ...updates, updatedAt }) : job
      )
      const updated = nextJobs.find((j) => j.id === id)
      if (!updated) return

      if (isCloudSync && supabase && user) {
        const row = { ...jobToRow(updated, user.id), updated_at: updatedAt }
        const { error } = await supabase.from('job_applications').upsert(row)
        if (error) throw error
      } else {
        writeLocalJobs(nextJobs)
      }
      setJobs(nextJobs)
    },
    [isCloudSync, user, jobs]
  )

  const deleteJob = useCallback(
    async (id: string) => {
      await updateJob(id, { deletedAt: new Date().toISOString() })
    },
    [updateJob]
  )

  const restoreJob = useCallback(
    async (id: string) => {
      await updateJob(id, { deletedAt: null })
    },
    [updateJob]
  )

  const purgeJob = useCallback(
    async (id: string) => {
      if (isCloudSync && supabase) {
        const { error } = await supabase.from('job_applications').delete().eq('id', id)
        if (error) throw error
      } else {
        persistLocal(jobs.filter((job) => job.id !== id))
        return
      }
      setJobs((prev) => prev.filter((job) => job.id !== id))
    },
    [isCloudSync, jobs, persistLocal]
  )

  const moveJob = useCallback(
    async (id: string, status: JobStatus) => {
      const job = jobs.find((j) => j.id === id)
      if (!job || job.deletedAt) return
      // Saved = not an application for streak. Applied/interview/offer/rejected keep or set date.
      const countsAsApply = status !== 'saved'
      const today = new Date().toISOString().slice(0, 10)
      await updateJob(id, {
        status,
        appliedDate: countsAsApply ? job.appliedDate || today : '',
      })
    },
    [jobs, updateJob]
  )

  const getJob = useCallback((id: string) => jobs.find((job) => job.id === id), [jobs])

  const activeJobs = useMemo(() => jobs.filter((j) => !j.deletedAt), [jobs])
  const trashedJobs = useMemo(() => jobs.filter((j) => Boolean(j.deletedAt)), [jobs])

  const value = useMemo(
    () => ({
      jobs,
      activeJobs,
      trashedJobs,
      loading,
      addJob,
      updateJob,
      deleteJob,
      restoreJob,
      purgeJob,
      moveJob,
      getJob,
      isCloudSync,
    }),
    [
      jobs,
      activeJobs,
      trashedJobs,
      loading,
      addJob,
      updateJob,
      deleteJob,
      restoreJob,
      purgeJob,
      moveJob,
      getJob,
      isCloudSync,
    ]
  )

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>
}

export function useJobs() {
  const context = useContext(JobsContext)
  if (!context) throw new Error('useJobs must be used within JobsProvider')
  return context
}

export { createEmptyJob }
