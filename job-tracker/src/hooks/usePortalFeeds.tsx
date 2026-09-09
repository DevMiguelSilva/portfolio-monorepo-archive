import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import {
  computeStreak,
  dayHeatLevel,
  isDayComplete,
  type HeatLevel,
} from '../lib/huntStreak'
import {
  createEmptyPortalFeed,
  guessPortalSource,
  localDateKey,
  type HuntDay,
  type PortalFeed,
  type PortalSource,
} from '../types/portal'
import { useAuth } from './useAuth'

const FEEDS_KEY = 'applytrack-portal-feeds'
const DAYS_KEY = 'applytrack-hunt-days'

interface PortalFeedsContextValue {
  feeds: PortalFeed[]
  huntDays: HuntDay[]
  loading: boolean
  todayKey: string
  activeFeeds: PortalFeed[]
  todayCheckedIds: Set<string>
  todayComplete: boolean
  todayLevel: HeatLevel
  checkedTodayCount: number
  streak: number
  daysByDate: Map<string, HuntDay>
  addFeed: (input: { name: string; url: string; source?: PortalSource }) => Promise<void>
  updateFeed: (id: string, updates: Partial<PortalFeed>) => Promise<void>
  deleteFeed: (id: string) => Promise<void>
  /** Persist a new order after drag-and-drop (fromIndex → toIndex). */
  reorderFeeds: (fromIndex: number, toIndex: number) => Promise<void>
  toggleCheckedToday: (feedId: string) => Promise<void>
  markCheckedToday: (feedIds: string[]) => Promise<void>
  openFeed: (feed: PortalFeed, markChecked?: boolean) => Promise<void>
  openAllActive: () => Promise<{ opened: number; blockedHint: boolean; remaining: number }>
}

const PortalFeedsContext = createContext<PortalFeedsContextValue | null>(null)

function sortFeeds(feeds: PortalFeed[]): PortalFeed[] {
  const sorted = [...feeds].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.createdAt.localeCompare(b.createdAt)
  })
  return sorted.map((f, i) => (f.sortOrder === i ? f : { ...f, sortOrder: i }))
}

function readFeeds(): PortalFeed[] {
  try {
    const raw = localStorage.getItem(FEEDS_KEY)
    return raw ? sortFeeds(JSON.parse(raw) as PortalFeed[]) : []
  } catch {
    return []
  }
}

function writeFeeds(feeds: PortalFeed[]) {
  localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds))
}

function readDays(): HuntDay[] {
  try {
    const raw = localStorage.getItem(DAYS_KEY)
    return raw ? (JSON.parse(raw) as HuntDay[]) : []
  } catch {
    return []
  }
}

function writeDays(days: HuntDay[]) {
  localStorage.setItem(DAYS_KEY, JSON.stringify(days))
}

export function PortalFeedsProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [feeds, setFeeds] = useState<PortalFeed[]>([])
  const [huntDays, setHuntDays] = useState<HuntDay[]>([])
  const [loading, setLoading] = useState(true)
  const isCloudSync = isCloudEnabled && Boolean(user)
  const todayKey = localDateKey()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!isCloudSync || !supabase || !user) {
        setFeeds(readFeeds())
        setHuntDays(readDays())
        return
      }

      const [feedsRes, daysRes] = await Promise.all([
        supabase
          .from('portal_feeds')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true }),
        supabase.from('hunt_days').select('*').eq('user_id', user.id),
      ])

      if (feedsRes.error) throw feedsRes.error
      if (daysRes.error) throw daysRes.error

      setFeeds(
        sortFeeds(
          (feedsRes.data ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            url: row.url,
            source: row.source,
            active: row.active,
            sortOrder: row.sort_order ?? 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        )
      )
      setHuntDays(
        (daysRes.data ?? []).map((row) => ({
          date: row.day,
          checkedFeedIds: row.checked_feed_ids ?? [],
          updatedAt: row.updated_at,
        }))
      )
    } catch (err) {
      console.error('Failed to load portal feeds:', err)
      setFeeds(readFeeds())
      setHuntDays(readDays())
    } finally {
      setLoading(false)
    }
  }, [isCloudSync, user])

  useEffect(() => {
    load()
  }, [load])

  const persistFeeds = useCallback(
    async (next: PortalFeed[]) => {
      const ordered = sortFeeds(next)
      setFeeds(ordered)
      if (!isCloudSync || !supabase || !user) {
        writeFeeds(ordered)
        return
      }
      const rows = ordered.map((f) => ({
        id: f.id,
        user_id: user.id,
        name: f.name,
        url: f.url,
        source: f.source,
        active: f.active,
        sort_order: f.sortOrder,
        updated_at: f.updatedAt,
      }))
      const { error } = await supabase.from('portal_feeds').upsert(rows)
      if (error) throw error
    },
    [isCloudSync, user]
  )

  const persistDays = useCallback(
    async (next: HuntDay[]) => {
      setHuntDays(next)
      if (!isCloudSync || !supabase || !user) {
        writeDays(next)
        return
      }
      const rows = next.map((d) => ({
        user_id: user.id,
        day: d.date,
        checked_feed_ids: d.checkedFeedIds,
        updated_at: d.updatedAt,
      }))
      const { error } = await supabase
        .from('hunt_days')
        .upsert(rows, { onConflict: 'user_id,day' })
      if (error) throw error
    },
    [isCloudSync, user]
  )

  const addFeed = useCallback(
    async (input: { name: string; url: string; source?: PortalSource }) => {
      const feed = createEmptyPortalFeed({
        name: input.name.trim() || 'Untitled feed',
        url: input.url.trim(),
        source: input.source ?? guessPortalSource(input.url),
        sortOrder: feeds.length,
      })
      await persistFeeds([...feeds, feed])
    },
    [feeds, persistFeeds]
  )

  const updateFeed = useCallback(
    async (id: string, updates: Partial<PortalFeed>) => {
      const next = feeds.map((f) =>
        f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
      )
      await persistFeeds(next)
    },
    [feeds, persistFeeds]
  )

  const deleteFeed = useCallback(
    async (id: string) => {
      if (isCloudSync && supabase) {
        const { error } = await supabase.from('portal_feeds').delete().eq('id', id)
        if (error) throw error
        setFeeds((prev) => sortFeeds(prev.filter((f) => f.id !== id)))
      } else {
        await persistFeeds(feeds.filter((f) => f.id !== id))
      }
    },
    [feeds, isCloudSync, persistFeeds]
  )

  const reorderFeeds = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= feeds.length ||
        toIndex >= feeds.length
      ) {
        return
      }
      const now = new Date().toISOString()
      const next = [...feeds]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      await persistFeeds(next.map((f, i) => ({ ...f, sortOrder: i, updatedAt: now })))
    },
    [feeds, persistFeeds]
  )

  const upsertToday = useCallback(
    async (checkedFeedIds: string[]) => {
      const now = new Date().toISOString()
      const existing = huntDays.find((d) => d.date === todayKey)
      const day: HuntDay = {
        date: todayKey,
        checkedFeedIds: [...new Set(checkedFeedIds)],
        updatedAt: now,
      }
      const next = existing
        ? huntDays.map((d) => (d.date === todayKey ? day : d))
        : [...huntDays, day]
      await persistDays(next)
    },
    [huntDays, persistDays, todayKey]
  )

  const toggleCheckedToday = useCallback(
    async (feedId: string) => {
      const existing = huntDays.find((d) => d.date === todayKey)
      const set = new Set(existing?.checkedFeedIds ?? [])
      if (set.has(feedId)) set.delete(feedId)
      else set.add(feedId)
      await upsertToday([...set])
    },
    [huntDays, todayKey, upsertToday]
  )

  const markCheckedToday = useCallback(
    async (feedIds: string[]) => {
      const existing = huntDays.find((d) => d.date === todayKey)
      const set = new Set(existing?.checkedFeedIds ?? [])
      for (const id of feedIds) set.add(id)
      await upsertToday([...set])
    },
    [huntDays, todayKey, upsertToday]
  )

  const openFeed = useCallback(
    async (feed: PortalFeed, markChecked = true) => {
      const win = window.open(feed.url, '_blank')
      if (!win) return
      try {
        win.opener = null
      } catch {
        /* ignore */
      }
      if (markChecked && feed.active) await markCheckedToday([feed.id])
    },
    [markCheckedToday]
  )

  const openAllActive = useCallback(async () => {
    const active = feeds.filter((f) => f.active && f.url.trim())
    const already = new Set(
      huntDays.find((d) => d.date === todayKey)?.checkedFeedIds ?? []
    )
    // Unchecked first so each click advances the list when the browser blocks extras.
    const targets = [
      ...active.filter((f) => !already.has(f.id)),
      ...active.filter((f) => already.has(f.id)),
    ]
    if (targets.length === 0) {
      return { opened: 0, blockedHint: false, remaining: 0 }
    }

    // Open blank tabs in one synchronous gesture (browsers often allow several),
    // then navigate — more reliable than window.open(url) in a loop.
    const slots = targets.map((feed) => ({
      feed,
      win: window.open('about:blank', '_blank'),
    }))

    const openedIds: string[] = []
    for (const { feed, win } of slots) {
      if (!win) continue
      try {
        win.opener = null
        win.location.href = feed.url
        openedIds.push(feed.id)
      } catch {
        try {
          win.close()
        } catch {
          /* ignore */
        }
      }
    }

    if (openedIds.length > 0) await markCheckedToday(openedIds)

    const openedSet = new Set(openedIds)
    const remaining = active.filter(
      (f) => !already.has(f.id) && !openedSet.has(f.id)
    ).length

    return {
      opened: openedIds.length,
      blockedHint: openedIds.length < targets.length,
      remaining,
    }
  }, [feeds, huntDays, todayKey, markCheckedToday])

  const activeFeeds = useMemo(() => feeds.filter((f) => f.active), [feeds])
  const activeIds = useMemo(() => activeFeeds.map((f) => f.id), [activeFeeds])
  const daysByDate = useMemo(() => {
    const map = new Map<string, HuntDay>()
    for (const d of huntDays) map.set(d.date, d)
    return map
  }, [huntDays])

  const todayDay = daysByDate.get(todayKey)
  const todayCheckedIds = useMemo(
    () => new Set(todayDay?.checkedFeedIds ?? []),
    [todayDay]
  )
  const todayComplete = isDayComplete(todayDay, activeFeeds, todayKey)
  const todayLevel = dayHeatLevel(todayDay, activeFeeds, todayKey)
  const checkedTodayCount = activeIds.filter((id) => todayCheckedIds.has(id)).length
  const streak = useMemo(
    () => computeStreak(daysByDate, activeFeeds, todayKey),
    [daysByDate, activeFeeds, todayKey]
  )

  const value = useMemo(
    () => ({
      feeds,
      huntDays,
      loading,
      todayKey,
      activeFeeds,
      todayCheckedIds,
      todayComplete,
      todayLevel,
      checkedTodayCount,
      streak,
      daysByDate,
      addFeed,
      updateFeed,
      deleteFeed,
      reorderFeeds,
      toggleCheckedToday,
      markCheckedToday,
      openFeed,
      openAllActive,
    }),
    [
      feeds,
      huntDays,
      loading,
      todayKey,
      activeFeeds,
      todayCheckedIds,
      todayComplete,
      todayLevel,
      checkedTodayCount,
      streak,
      daysByDate,
      addFeed,
      updateFeed,
      deleteFeed,
      reorderFeeds,
      toggleCheckedToday,
      markCheckedToday,
      openFeed,
      openAllActive,
    ]
  )

  return (
    <PortalFeedsContext.Provider value={value}>{children}</PortalFeedsContext.Provider>
  )
}

export function usePortalFeeds() {
  const ctx = useContext(PortalFeedsContext)
  if (!ctx) throw new Error('usePortalFeeds must be used within PortalFeedsProvider')
  return ctx
}
