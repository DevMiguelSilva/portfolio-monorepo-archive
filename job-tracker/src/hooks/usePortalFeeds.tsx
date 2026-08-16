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
  toggleCheckedToday: (feedId: string) => Promise<void>
  markCheckedToday: (feedIds: string[]) => Promise<void>
  openFeed: (feed: PortalFeed, markChecked?: boolean) => Promise<void>
  openAllActive: () => Promise<{ opened: number; blockedHint: boolean }>
}

const PortalFeedsContext = createContext<PortalFeedsContextValue | null>(null)

function readFeeds(): PortalFeed[] {
  try {
    const raw = localStorage.getItem(FEEDS_KEY)
    return raw ? (JSON.parse(raw) as PortalFeed[]) : []
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
        (feedsRes.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          url: row.url,
          source: row.source,
          active: row.active,
          sortOrder: row.sort_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
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
      setFeeds(next)
      if (!isCloudSync || !supabase || !user) {
        writeFeeds(next)
        return
      }
      const rows = next.map((f) => ({
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
        setFeeds((prev) => prev.filter((f) => f.id !== id))
      } else {
        await persistFeeds(feeds.filter((f) => f.id !== id))
      }
    },
    [feeds, isCloudSync, persistFeeds]
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
      window.open(feed.url, '_blank', 'noopener,noreferrer')
      if (markChecked && feed.active) await markCheckedToday([feed.id])
    },
    [markCheckedToday]
  )

  const openAllActive = useCallback(async () => {
    const active = feeds.filter((f) => f.active && f.url.trim())
    let opened = 0
    for (const feed of active) {
      const win = window.open(feed.url, '_blank', 'noopener,noreferrer')
      if (win) opened += 1
    }
    if (active.length > 0) await markCheckedToday(active.map((f) => f.id))
    return { opened, blockedHint: opened < active.length }
  }, [feeds, markCheckedToday])

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
  const todayComplete = isDayComplete(todayDay, activeIds)
  const todayLevel = dayHeatLevel(todayDay, activeIds)
  const checkedTodayCount = activeIds.filter((id) => todayCheckedIds.has(id)).length
  const streak = useMemo(
    () => computeStreak(daysByDate, activeIds, todayKey),
    [daysByDate, activeIds, todayKey]
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
