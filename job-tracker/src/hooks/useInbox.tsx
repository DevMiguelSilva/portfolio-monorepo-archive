import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchAdzunaJobs } from '../api/client'
import { parseJobPosting } from '../api/gemini'
import { inboxJobToRow, rowToInboxJob } from '../lib/database'
import {
  dualTrackReasonLine,
  scoreDualTracks,
  scoreMasterCvAgainstJob,
  type MatchResult,
} from '../lib/matchScore'
import { expandSearchLocations } from '../lib/searchLocations'
import { supabase } from '../lib/supabase'
import { CV_TRACK_LABELS, type CvTrack, type MasterCv } from '../types/cv'
import type { InboxJob, SearchTrack } from '../types/job'
import { createEmptyJob } from '../types/job'
import { useAuth } from './useAuth'
import { useJobs } from './useJobs'
import { useMasterCv } from './useMasterCv'
import { useSavedSearches } from './useSavedSearches'

const LOCAL_KEY = 'applytrack-inbox'

interface InboxContextValue {
  inbox: InboxJob[]
  loading: boolean
  refreshing: boolean
  refreshError: string | null
  newCount: number
  refreshInbox: () => Promise<void>
  approveJob: (id: string) => Promise<string>
  dismissJob: (id: string) => Promise<void>
}

const InboxContext = createContext<InboxContextValue | null>(null)

function readLocal(): InboxJob[] {
  try {
    const stored = localStorage.getItem(LOCAL_KEY)
    const items = stored ? (JSON.parse(stored) as InboxJob[]) : []
    return items.map((item) => ({
      ...item,
      matchedTrack: item.matchedTrack ?? null,
      matchReasons: item.matchReasons ?? [],
    }))
  } catch {
    return []
  }
}

function writeLocal(items: InboxJob[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
}

function pickMatch(
  jobText: string,
  searchTrack: SearchTrack,
  cvs: Record<CvTrack, MasterCv>
): MatchResult & { track: CvTrack } {
  const dual = scoreDualTracks(jobText, cvs)
  const track =
    searchTrack === 'frontend' || searchTrack === 'powerPlatform'
      ? searchTrack
      : dual.bestTrack
  const match = dual[track]
  return {
    ...match,
    track,
    reasons: [
      dualTrackReasonLine(dual),
      `Best for apply: ${CV_TRACK_LABELS[dual.bestTrack]} (${dual.bestScore}%)`,
      ...match.reasons,
    ],
  }
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const { searches } = useSavedSearches()
  const { library, getCv } = useMasterCv()
  const { addJob, jobs } = useJobs()
  const [inbox, setInbox] = useState<InboxJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const isCloudSync = isCloudEnabled && Boolean(user)

  const cvsByTrack = useMemo(
    () => ({
      frontend: getCv('frontend'),
      powerPlatform: getCv('powerPlatform'),
    }),
    [getCv, library]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!isCloudSync || !supabase || !user) {
        setInbox(readLocal())
        return
      }
      const { data, error } = await supabase
        .from('job_inbox')
        .select('*')
        .eq('user_id', user.id)
        .order('match_score', { ascending: false })
      if (error) throw error
      setInbox((data ?? []).map(rowToInboxJob))
    } catch (err) {
      console.error('Failed to load inbox:', err)
      setInbox(readLocal())
    } finally {
      setLoading(false)
    }
  }, [isCloudSync, user])

  useEffect(() => {
    load()
  }, [load])

  const persistAll = useCallback(
    async (next: InboxJob[]) => {
      setInbox(next)
      if (!isCloudSync || !supabase || !user) {
        writeLocal(next)
        return
      }
      const rows = next.map((item) => inboxJobToRow(item, user.id))
      const { error } = await supabase.from('job_inbox').upsert(rows)
      if (error) throw error
    },
    [isCloudSync, user]
  )

  const refreshInbox = useCallback(async () => {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const active = searches.filter((s) => s.active && s.query.trim())
      if (active.length === 0) {
        throw new Error('Add at least one active saved search before refreshing.')
      }

      const existingByExternal = new Map(inbox.map((item) => [item.externalId, item]))
      const approvedExternal = new Set(
        jobs.filter((j) => j.externalId).map((j) => j.externalId)
      )

      const merged = new Map<string, InboxJob>()
      for (const item of inbox) {
        if (item.status !== 'new') merged.set(item.externalId, item)
      }

      for (const search of active) {
        const legs = expandSearchLocations(search.location)
        const resultsById = new Map<
          string,
          Awaited<ReturnType<typeof fetchAdzunaJobs>>[number]
        >()

        for (const leg of legs) {
          // Remote / empty location → Canada-wide (no Adzuna `where`)
          const query =
            leg.isRemote && !/\bremote\b/i.test(search.query)
              ? `${search.query} remote`.trim()
              : search.query

          const results = await fetchAdzunaJobs({
            query,
            location: leg.location || undefined,
            country: search.country,
            maxDaysOld: search.maxDaysOld,
            excludeTerms: search.excludeTerms,
          })

          for (const result of results) {
            const prev = resultsById.get(result.externalId)
            if (!prev) {
              resultsById.set(result.externalId, result)
              continue
            }
            // Prefer a result that already has a clearer location label
            if (!prev.location && result.location) {
              resultsById.set(result.externalId, result)
            }
          }
        }

        for (const result of resultsById.values()) {
          const existing = existingByExternal.get(result.externalId)
          if (existing?.status === 'dismissed' || existing?.status === 'approved') {
            merged.set(result.externalId, {
              ...existing,
              description: result.description || existing.description,
              fetchedAt: new Date().toISOString(),
            })
            continue
          }
          if (approvedExternal.has(result.externalId)) continue

          const jobText = `${result.role}\n${result.description}`
          const match = pickMatch(jobText, search.track ?? 'auto', cvsByTrack)
          const now = new Date().toISOString()
          const prevNew = merged.get(result.externalId)
          if (prevNew?.status === 'new' && prevNew.matchScore >= match.score) {
            continue
          }

          merged.set(result.externalId, {
            id: existing?.id ?? prevNew?.id ?? crypto.randomUUID(),
            externalId: result.externalId,
            source: 'adzuna',
            company: result.company,
            role: result.role,
            location: result.location,
            jobUrl: result.jobUrl,
            salary: result.salary,
            description: result.description,
            matchScore: match.score,
            matchReasons: match.reasons,
            matchedTrack: match.track,
            status: 'new',
            savedSearchId: search.id,
            fetchedAt: now,
            createdAt: existing?.createdAt ?? prevNew?.createdAt ?? now,
            updatedAt: now,
          })
        }
      }

      const next = [...merged.values()].sort((a, b) => b.matchScore - a.matchScore)
      await persistAll(next)
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Refresh failed')
      throw err
    } finally {
      setRefreshing(false)
    }
  }, [searches, inbox, jobs, cvsByTrack, persistAll])

  const updateInboxItem = useCallback(
    async (id: string, updates: Partial<InboxJob>) => {
      const next = inbox.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      )
      const updated = next.find((i) => i.id === id)
      if (!updated) return

      if (isCloudSync && supabase && user) {
        const row = inboxJobToRow(updated, user.id)
        const { error } = await supabase.from('job_inbox').upsert(row)
        if (error) throw error
      } else {
        writeLocal(next)
      }
      setInbox(next)
    },
    [inbox, isCloudSync, user]
  )

  const approveJob = useCallback(
    async (id: string) => {
      const item = inbox.find((i) => i.id === id)
      if (!item) throw new Error('Inbox item not found')

      const track = item.matchedTrack ?? 'frontend'

      // Same job shape as manual add: keep full description text; AI fills summary/skills when possible.
      let jdSummary = ''
      let extractedSkills: string[] = []
      let extractedRequirements: string[] = []
      let salary = item.salary
      let location = item.location
      let company = item.company
      let role = item.role

      if (item.description.trim()) {
        try {
          const parsed = await parseJobPosting(item.description)
          jdSummary = parsed.summary || ''
          if (parsed.skills?.length) extractedSkills = parsed.skills
          if (parsed.requirements?.length) extractedRequirements = parsed.requirements
          if (parsed.salary) salary = parsed.salary
          if (parsed.location) location = parsed.location
          if (parsed.company) company = parsed.company
          if (parsed.role) role = parsed.role
        } catch {
          // Adzuna approve still works offline / without Gemini
        }
      }

      const jobText = `${role}\n${item.description}`
      const coverage = scoreMasterCvAgainstJob(jobText, cvsByTrack[track], extractedSkills)

      const job = createEmptyJob({
        company,
        role,
        location,
        jobUrl: item.jobUrl,
        salary,
        status: 'saved',
        jobDescription: item.description,
        jdSummary,
        extractedSkills: extractedSkills.length ? extractedSkills : coverage.targets,
        extractedRequirements,
        notes: `Approved from inbox (${item.source}). Match ${coverage.score}% · ${CV_TRACK_LABELS[track]}.`,
        source: item.source,
        externalId: item.externalId,
        matchScore: coverage.score,
        cvTrack: track,
      })

      await addJob(job)
      await updateInboxItem(id, { status: 'approved' })
      return job.id
    },
    [inbox, cvsByTrack, addJob, updateInboxItem]
  )

  const dismissJob = useCallback(
    async (id: string) => {
      await updateInboxItem(id, { status: 'dismissed' })
    },
    [updateInboxItem]
  )

  const newCount = useMemo(() => inbox.filter((i) => i.status === 'new').length, [inbox])

  const value = useMemo(
    () => ({
      inbox,
      loading,
      refreshing,
      refreshError,
      newCount,
      refreshInbox,
      approveJob,
      dismissJob,
    }),
    [inbox, loading, refreshing, refreshError, newCount, refreshInbox, approveJob, dismissJob]
  )

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
}

export function useInbox() {
  const context = useContext(InboxContext)
  if (!context) throw new Error('useInbox must be used within InboxProvider')
  return context
}
