import { CV_LIBRARY_EVENT, recoverCvTransaction } from '../lib/cvLibrary'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchAdzunaJobs } from '../api/client'
import { parseJobPosting } from '../api/gemini'
import { inboxJobToRow, rowToInboxJob } from '../lib/database'
import {
  dualTrackReasonLine,
  createCvMatcher,
  scoreDualTracks,
  scoreMasterCvAgainstJob,
  withRequirementSignals,
  type MatchResult,
  type DualTrackMatch,
} from '../lib/matchScore'
import { expandSearchLocations } from '../lib/searchLocations'
import { supabase } from '../lib/supabase'
import { type CvTrack, type MasterCv } from '../types/cv'
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
  /** Remove current review cards so the next refresh can show them as new again. */
  clearReviewList: () => Promise<void>
  approveJob: (id: string) => Promise<string>
  dismissJob: (id: string) => Promise<void>
}

const InboxContext = createContext<InboxContextValue | null>(null)

function readLocal(): InboxJob[] {
  recoverCvTransaction(localStorage)
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
  cvs: Record<CvTrack, MasterCv>,
  names: Record<string, string>,
  score: (text: string) => DualTrackMatch = (text) => scoreDualTracks(text, cvs)
): MatchResult & { track: CvTrack } {
  const dual = score(jobText)
  const track = searchTrack === 'auto' ? dual.bestTrack : searchTrack
  const match = dual.scores[track]
  if (!match) throw new Error('The selected CV is unavailable. Choose another CV for this search.')
  return {
    ...match,
    track,
    reasons: [
      dualTrackReasonLine(dual, names),
      `Best for apply: ${names[dual.bestTrack]} (${dual.bestScore}%)`,
      ...match.reasons,
    ],
  }
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const { searches } = useSavedSearches()
  const { library } = useMasterCv()
  const live = useRef({ library, searches })
  live.current = { library, searches }
  const { addJob, jobs } = useJobs()
  const [inbox, setInbox] = useState<InboxJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const isCloudSync = isCloudEnabled && Boolean(user)

  const cvsByTrack = library.cvs
  const matchJob = useMemo(() => {
    const score = createCvMatcher(cvsByTrack)
    const cache = new Map<string, DualTrackMatch>()
    return (text: string) => {
      const existing = cache.get(text)
      if (existing) return existing
      const match = score(text)
      if (cache.size >= 500) cache.delete(cache.keys().next().value!)
      cache.set(text, match)
      return match
    }
  }, [cvsByTrack])

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
    void load()
    const refresh = () => { void load() }
    window.addEventListener(CV_LIBRARY_EVENT, refresh)
    return () => window.removeEventListener(CV_LIBRARY_EVENT, refresh)
  }, [load])

  const persistAll = useCallback(
    async (next: InboxJob[]) => {
      if (!isCloudSync || !supabase || !user) {
        writeLocal(next)
        setInbox(next)
        return
      }

      // Drop rows removed from memory (auto-park / clear-review-first), keep dismiss/approve history.
      const nextIds = new Set(next.map((item) => item.id))
      const removedIds = inbox.filter((item) => !nextIds.has(item.id)).map((item) => item.id)
      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('job_inbox')
          .delete()
          .eq('user_id', user.id)
          .in('id', removedIds)
        if (deleteError) throw deleteError
      }

      if (next.length > 0) {
        const rows = next.map((item) => inboxJobToRow(item, user.id))
        const { error } = await supabase.from('job_inbox').upsert(rows)
        if (error) throw error
      }
      setInbox(next)
    },
    [isCloudSync, user, inbox]
  )

  const clearReviewList = useCallback(async () => {
    // Drop "new" rows only — do not mark dismissed (that would block Run alone / Refresh).
    const next = inbox.filter((item) => item.status !== 'new')
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
        jobs.filter((j) => j.externalId && !j.deletedAt).map((j) => j.externalId)
      )

      // Run alone: drop current "new" rows from this refresh's working set (not permanent dismiss).
      const startingInbox = options?.clearReviewFirst
        ? inbox.filter((item) => item.status !== 'new')
        : inbox

      const existingByExternal = new Map(startingInbox.map((item) => [item.externalId, item]))

      const merged = new Map<string, InboxJob>()
      // Keep approved/dismissed history; "new" rows may be dropped below if Adzuna no longer returns them.
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
      const skippedApprovedIds = new Set<string>()
      const skippedDismissedIds = new Set<string>()

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
            skippedApprovedIds.add(result.externalId)
            if (existing?.status === 'approved') {
              merged.set(result.externalId, {
                ...existing,
                description: result.description || existing.description,
                fetchedAt: now,
              })
            }
            continue
          }

          // Explicit dismiss (or parked from clear review) — never show again
          if (existing?.status === 'dismissed') {
            skippedDismissedIds.add(result.externalId)
            merged.set(result.externalId, {
              ...existing,
              description: result.description || existing.description,
              fetchedAt: now,
            })
            continue
          }

          const jobText = `${result.role}\n${result.description}`
          const match = pickMatch(jobText, search.track ?? 'auto', cvsByTrack, library.names, matchJob)
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

      // Previous "new" rows Adzuna did not return this round → remove (not dismiss).
      // Only explicit Dismiss permanently blocks resurfacing.
      // Only do this when Adzuna actually returned hits, so an empty response can't clear the list.
      for (const [externalId, item] of [...merged.entries()]) {
        if (item.status !== 'new') continue
        if (apiReturnedIds.has(externalId)) continue
        if (new Date(item.fetchedAt).getTime() >= refreshStartedMs) continue
        merged.delete(externalId)
      }

      const next = [...merged.values()].sort((a, b) => b.matchScore - a.matchScore)
      await persistAll(next)

      const visibleNew = next.filter((i) => i.status === 'new').length
      if (visibleNew === 0) {
        const onBoard = skippedApprovedIds.size
        const dismissed = skippedDismissedIds.size
        const total = apiReturnedIds.size
        if (onBoard > 0 && dismissed === 0) {
          setRefreshError(
            `Adzuna returned ${total} listing(s), but all were already approved / on your board — nothing new to review.`
          )
        } else if (dismissed > 0 && onBoard === 0) {
          setRefreshError(
            `Adzuna returned ${total} listing(s), but all were previously dismissed — nothing new to review.`
          )
        } else if (onBoard > 0 && dismissed > 0) {
          setRefreshError(
            `Adzuna returned ${total} listing(s): ${onBoard} already on your board, ${dismissed} previously dismissed — nothing new to review.`
          )
        } else {
          setRefreshError(
            `Adzuna returned ${total} listing(s), but none are left to review.`
          )
        }
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Refresh failed')
      throw err
    } finally {
      setRefreshing(false)
    }
  }, [searches, inbox, jobs, cvsByTrack, library.names, matchJob, persistAll])

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
      // Parsing can finish after a template was deleted or a search reassigned.
      const latest = live.current
      const search = latest.searches.find((entry) => entry.id === item.savedSearchId)
      const currentMatch = pickMatch(jobText, search?.track ?? (item.matchedTrack && latest.library.cvs[item.matchedTrack] ? item.matchedTrack : 'auto'), latest.library.cvs, latest.library.names)
      const track = currentMatch.track
      extractedSkills = withRequirementSignals(jobText, extractedSkills)
      const coverage = scoreMasterCvAgainstJob(jobText, latest.library.cvs[track], extractedSkills)

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
        notes: `Approved from inbox (${item.source}). Match ${coverage.score}% · ${latest.library.names[track]}.`,
        source: item.source,
        externalId: item.externalId,
        savedSearchId: item.savedSearchId,
        matchScore: coverage.score,
        cvTrack: track,
        // API listings are usually snippets — paste full JD on Job Detail to complete.
        jdComplete: false,
      })

      await addJob(job)
      await updateInboxItem(id, { status: 'approved' })
      return job.id
    },
    [inbox, addJob, updateInboxItem]
  )

  const dismissJob = useCallback(
    async (id: string) => {
      await updateInboxItem(id, { status: 'dismissed' })
    },
    [updateInboxItem]
  )

  const newCount = useMemo(() => inbox.filter((i) => i.status === 'new').length, [inbox])

  const scoredInbox = useMemo(() => inbox.map((item) => {
    if (item.status !== 'new') return item
    const search = searches.find((entry) => entry.id === item.savedSearchId)
    try {
      const match = pickMatch(`${item.role}\n${item.description}`, search?.track ?? (item.matchedTrack && cvsByTrack[item.matchedTrack] ? item.matchedTrack : 'auto'), cvsByTrack, library.names, matchJob)
      return { ...item, matchedTrack: match.track, matchScore: match.score, matchReasons: match.reasons }
    } catch { return { ...item, matchScore: 0, matchReasons: ['Selected CV unavailable. Update the saved search before approval.'] } }
  }).sort((a, b) => b.matchScore - a.matchScore), [inbox, searches, cvsByTrack, library.names, matchJob])

  const value = useMemo(
    () => ({
      inbox: scoredInbox,
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
      scoredInbox,
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
