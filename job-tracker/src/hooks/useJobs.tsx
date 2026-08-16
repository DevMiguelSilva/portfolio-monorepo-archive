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
import { createEmptyJob } from '../types/job'
import { useAuth } from './useAuth'

const LOCAL_STORAGE_KEY = 'job-tracker-applications'
const MIGRATED_KEY = 'job-tracker-migrated'

interface JobsContextValue {
  jobs: JobApplication[]
  loading: boolean
  addJob: (job: JobApplication) => Promise<void>
  updateJob: (id: string, updates: Partial<JobApplication>) => Promise<void>
  deleteJob: (id: string) => Promise<void>
  moveJob: (id: string, status: JobStatus) => Promise<void>
  getJob: (id: string) => JobApplication | undefined
  isCloudSync: boolean
}

const JobsContext = createContext<JobsContextValue | null>(null)

function readLocalJobs(): JobApplication[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as JobApplication[]) : []
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

      setJobs(cloudJobs)
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
      if (isCloudSync && supabase && user) {
        const row = { ...jobToRow(job, user.id), updated_at: new Date().toISOString() }
        const { error } = await supabase.from('job_applications').insert(row)
        if (error) throw error
        setJobs((prev) => [job, ...prev])
      } else {
        persistLocal([job, ...jobs])
      }
    },
    [isCloudSync, user, jobs, persistLocal]
  )

  const updateJob = useCallback(
    async (id: string, updates: Partial<JobApplication>) => {
      const updatedAt = new Date().toISOString()
      const nextJobs = jobs.map((job) =>
        job.id === id ? { ...job, ...updates, updatedAt } : job
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
      if (!job) return
      await updateJob(id, {
        status,
        appliedDate:
          status === 'applied' && !job.appliedDate
            ? new Date().toISOString().slice(0, 10)
            : job.appliedDate,
      })
    },
    [jobs, updateJob]
  )

  const getJob = useCallback((id: string) => jobs.find((job) => job.id === id), [jobs])

  const value = useMemo(
    () => ({ jobs, loading, addJob, updateJob, deleteJob, moveJob, getJob, isCloudSync }),
    [jobs, loading, addJob, updateJob, deleteJob, moveJob, getJob, isCloudSync]
  )

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>
}

export function useJobs() {
  const context = useContext(JobsContext)
  if (!context) throw new Error('useJobs must be used within JobsProvider')
  return context
}

export { createEmptyJob }
