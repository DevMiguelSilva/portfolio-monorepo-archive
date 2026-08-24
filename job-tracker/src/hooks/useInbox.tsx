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
import type { InboxJob, SavedSearch, SearchTrack } from '../types/job'
import { createEmptyJob } from '../types/job'
import { useAuth } from './useAuth'
import { useJobs } from './useJobs'
import { useMasterCv } from './useMasterCv'
import { useSavedSearches } from './useSavedSearches'

const LOCAL_KEY = 'applytrack-inbox'

export interface RefreshInboxOptions {
  /** Run only this saved search (ignores other active flags for this refresh). */
  onlySearchId?: string
  /** Park current "new" rows before fetching so results are only from this run. */
  clearReviewFirst?: boolean
  /**
   * Use this list instead of context searches (avoids stale state right after
   * activateAll / reorder before React re-renders).
   */
  searchesOverride?: SavedSearch[]
}

interface InboxContextValue {
  inbox: InboxJob[]
  loading: boolean
  refreshing: boolean
  refreshError: string | null
  newCount: number
  refreshInbox: (options?: RefreshInboxOptions) => Promise<void>
  /** Hide everything currently in the review list (keeps history for "Seen before"). */
  clearReviewList: () => Promise<void>
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
      seenCount: item.seenCount && item.seenCount > 0 ? item.seenCount : 1,
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
      if (!isCloudSync || !supabase || !user) {
        writeLocal(next)
        setInbox(next)
        return
      }
      const rows = next.map((item) => inboxJobToRow(item, user.id))
      const { error } = await supabase.from('job_inbox').upsert(rows)
      if (error) throw error
      setInbox(next)
    },
    [isCloudSync, user]
  )

  const clearReviewList = useCallback(async () => {
    const now = new Date().toISOString()
    const next = inbox.map((item) =>
      item.status === 'new' ? { ...item, status: 'dismissed' as const, updatedAt: now } : item
    )
    await persistAll(next)
  }, [inbox, persistAll])

  const refreshInbox = useCallback(async (options?: RefreshInboxOptions) => {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const list = options?.searchesOverride ?? searches
      const active = options?.onlySearchId
        ? list
            .filter((s) => s.id === options.onlySearchId && s.query.trim())
            .map((s) => ({ ...s, active: true }))
        : list.filter((s) => s.active && s.query.trim())

      if (active.length === 0) {
        throw new Error(
          options?.onlySearchId
            ? 'That saved search was not found or has an empty query.'
            : 'Add at least one active saved search before refreshing.'
        )
      }

      const approvedExternal = new Set(
        jobs.filter((j) => j.externalId).map((j) => j.externalId)
      )

      const nowPark = new Date().toISOString()
      const startingInbox =
        options?.clearReviewFirst
          ? inbox.map((item) =>
              item.status === 'new'
                ? { ...item, status: 'dismissed' as const, updatedAt: nowPark }
                : item
            )
          : inbox

      const existingByExternal = new Map(startingInbox.map((item) => [item.externalId, item]))

      const merged = new Map<string, InboxJob>()
      // Keep full inbox history so seenCount / dismissed jobs survive when a listing
      // is missing from one refresh and returns later.
      for (const item of startingInbox) {
        merged.set(item.externalId, item)
      }
      const refreshStartedMs = Date.now()

      /** seenCount increments once per refresh per listing (not once per matching search). */
      const seenCountForRefresh = new Map<string, number>()
      const nextSeenCount = (externalId: string, existing?: InboxJob) => {
        const cached = seenCountForRefresh.get(externalId)
        if (cached != null) return cached
        const count = existing ? (existing.seenCount > 0 ? existing.seenCount : 1) + 1 : 1
        seenCountForRefresh.set(externalId, count)
        return count
      }

      /** Every Adzuna hit this refresh (including already-approved), for empty/park guards. */
      const apiReturnedIds = new Set<string>()
      let skippedApproved = 0

      for (const search of active) {
        const legs = expandSearchLocations(search.location)
        const resultsById = new Map<
          string,
          Awaited<ReturnType<typeof fetchAdzunaJobs>>[number]
        >()

        for (const leg of legs) {
          const results = await fetchAdzunaJobs({
            query: search.query,
            location: leg.location || undefined,
            country: search.country,
            maxDaysOld: search.maxDaysOld,
            excludeTerms: search.excludeTerms,
            // Keep "remote" out of what_phrase so "Power Apps" stays an exact phrase.
            requireRemote:
              leg.isRemote && !/\bremote\b/i.test(search.query),
          })

          for (const result of results) {
            const prev = resultsById.get(result.externalId)
            if (!prev) {
              resultsById.set(result.externalId, result)
              continue
            }
            if (!prev.location && result.location) {
              resultsById.set(result.externalId, result)
            }
          }
        }

        for (const result of resultsById.values()) {
          apiReturnedIds.add(result.externalId)
          const existing = existingByExternal.get(result.externalId)
          const now = new Date().toISOString()

          // Already on the board (or approved in inbox) — keep history, don't resurface as new
          if (existing?.status === 'approved' || approvedExternal.has(result.externalId)) {
            skippedApproved += 1
            if (existing?.status === 'approved') {
              merged.set(result.externalId, {
                ...existing,
                description: result.description || existing.description,
                fetchedAt: now,
              })
            }
            continue
          }

          const jobText = `${result.role}\n${result.description}`
          const match = pickMatch(jobText, search.track ?? 'auto', cvsByTrack)
          const prevMerged = merged.get(result.externalId)
          const seenCount = nextSeenCount(result.externalId, existing)

          // Already have a better/equal hit this refresh — keep it, but mark as returned
          if (prevMerged?.status === 'new' && prevMerged.matchScore >= match.score) {
            merged.set(result.externalId, {
              ...prevMerged,
              seenCount,
              fetchedAt: now,
              updatedAt: now,
            })
            continue
          }

          merged.set(result.externalId, {
            id: existing?.id ?? prevMerged?.id ?? crypto.randomUUID(),
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
            seenCount,
            fetchedAt: now,
            createdAt: existing?.createdAt ?? prevMerged?.createdAt ?? now,
            updatedAt: now,
          })
        }
      }

      // Adzuna sometimes returns an empty page (outage / rate / flaky). Never wipe the inbox.
      if (apiReturnedIds.size === 0) {
        setRefreshError(
          'Adzuna returned 0 jobs for your active searches. Inbox left unchanged — try again shortly, or widen query/location.'
        )
        return
      }

      // Previous "new" rows that no search returned this round → park as dismissed
      // (history kept; a later refresh can resurface them as "Seen before").
      // Only do this when Adzuna actually returned hits, so an empty response can't clear the list.
      const parkNow = new Date().toISOString()
      for (const [externalId, item] of merged) {
        if (item.status !== 'new') continue
        if (apiReturnedIds.has(externalId)) continue
        if (new Date(item.fetchedAt).getTime() >= refreshStartedMs) continue
        merged.set(externalId, {
          ...item,
          status: 'dismissed',
          updatedAt: parkNow,
        })
      }

      const next = [...merged.values()].sort((a, b) => b.matchScore - a.matchScore)
      await persistAll(next)

      const visibleNew = next.filter((i) => i.status === 'new').length
      if (visibleNew === 0 && skippedApproved > 0) {
        setRefreshError(
          `Adzuna returned ${apiReturnedIds.size} listing(s), but all were already approved / on your board — nothing new to review.`
        )
      } else if (visibleNew === 0) {
        setRefreshError(
          `Adzuna returned ${apiReturnedIds.size} listing(s), but none are left to review (dismissed history may still resurface next time).`
        )
      }
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
        // API listings are usually snippets — paste full JD on Job Detail to complete.
        jdComplete: false,
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
      clearReviewList,
      approveJob,
      dismissJob,
    }),
    [
      inbox,
      loading,
      refreshing,
      refreshError,
      newCount,
      refreshInbox,
      clearReviewList,
      approveJob,
      dismissJob,
    ]
  )

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
}

export function useInbox() {
  const context = useContext(InboxContext)
  if (!context) throw new Error('useInbox must be used within InboxProvider')
  return context
}
