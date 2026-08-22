import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { rowToSavedSearch, savedSearchToRow } from '../lib/database'
import { supabase } from '../lib/supabase'
import { coalesceSearchQuery } from '../lib/adzunaQuery'
import {
  createEmptySavedSearch,
  DEFAULT_SAVED_SEARCHES,
  type SavedSearch,
} from '../types/job'
import { useAuth } from './useAuth'

const LOCAL_KEY = 'applytrack-saved-searches'
const SEEDED_KEY = 'applytrack-searches-seeded-v2'

function seededStorageKey(userId?: string | null): string {
  return userId ? `${SEEDED_KEY}:${userId}` : SEEDED_KEY
}

function hasSeeded(userId?: string | null): boolean {
  return localStorage.getItem(seededStorageKey(userId)) === '1'
}

function markSeeded(userId?: string | null): void {
  localStorage.setItem(seededStorageKey(userId), '1')
}

function normalizeSearch(
  search: SavedSearch & {
    whatOr?: string
    whatAnd?: string
    whatPhrase?: string
  },
  fallbackOrder = 0
): SavedSearch {
  const query = coalesceSearchQuery({
    query: search.query ?? '',
    whatOr: search.whatOr ?? '',
    whatAnd: search.whatAnd ?? '',
    whatPhrase: search.whatPhrase ?? '',
  })
  const track =
    search.track === 'frontend' || search.track === 'powerPlatform' || search.track === 'auto'
      ? search.track
      : /power\s*(platform|apps|automate)|dataverse/i.test(query)
        ? 'powerPlatform'
        : /react|front\s*end|frontend|typescript/i.test(query)
          ? 'frontend'
          : 'auto'

  return {
    id: search.id,
    label: search.label ?? '',
    query,
    location: search.location ?? '',
    country: search.country || 'ca',
    maxDaysOld: search.maxDaysOld ?? 7,
    excludeTerms: search.excludeTerms ?? '',
    track,
    active: search.active !== false,
    sortOrder: typeof search.sortOrder === 'number' ? search.sortOrder : fallbackOrder,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
  }
}

/** Stable display / refresh order; reindexes 0..n-1. */
function sortSearches(searches: SavedSearch[]): SavedSearch[] {
  const sorted = [...searches].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.createdAt.localeCompare(b.createdAt)
  })
  return sorted.map((s, i) => (s.sortOrder === i ? s : { ...s, sortOrder: i }))
}

interface SavedSearchesContextValue {
  searches: SavedSearch[]
  loading: boolean
  addSearch: (search: SavedSearch) => Promise<void>
  updateSearch: (id: string, updates: Partial<SavedSearch>) => Promise<void>
  deleteSearch: (id: string) => Promise<void>
  /** Pause every search except this one (for testing one query at a time). */
  activateOnly: (id: string) => Promise<void>
  /** Activate every saved search. Returns the updated list for immediate refresh. */
  activateAll: () => Promise<SavedSearch[]>
  /** Persist a new order after drag-and-drop (fromIndex → toIndex). */
  reorderSearches: (fromIndex: number, toIndex: number) => Promise<void>
  seedDefaults: () => Promise<void>
}

const SavedSearchesContext = createContext<SavedSearchesContextValue | null>(null)

function readLocal(): SavedSearch[] {
  try {
    const stored = localStorage.getItem(LOCAL_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as SavedSearch[]
    return sortSearches(parsed.map((s, i) => normalizeSearch(s, i)))
  } catch {
    return []
  }
}

function writeLocal(searches: SavedSearch[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(searches))
}

function buildDefaultSearches(): SavedSearch[] {
  const now = new Date().toISOString()
  return DEFAULT_SAVED_SEARCHES.map((s, i) =>
    createEmptySavedSearch({ ...s, sortOrder: s.sortOrder ?? i, createdAt: now, updatedAt: now })
  )
}

export function SavedSearchesProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const isCloudSync = isCloudEnabled && Boolean(user)

  const persistList = useCallback(
    async (next: SavedSearch[]) => {
      const ordered = sortSearches(next)
      if (isCloudSync && supabase && user) {
        const rows = ordered.map((s) => savedSearchToRow(s, user.id))
        const { error } = await supabase.from('saved_searches').upsert(rows)
        if (error) throw error
      } else {
        writeLocal(ordered)
      }
      setSearches(ordered)
      return ordered
    },
    [isCloudSync, user]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!isCloudSync || !supabase || !user) {
        let local = readLocal()
        if (local.length === 0 && !hasSeeded(null)) {
          local = buildDefaultSearches()
          writeLocal(local)
          markSeeded(null)
        }
        setSearches(sortSearches(local))
        return
      }

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      const rows = data ?? []
      if (rows.length === 0) {
        // Only seed once per user. Empty after delete must stay empty.
        if (hasSeeded(user.id)) {
          setSearches([])
          return
        }

        const defaults = buildDefaultSearches()
        const insertRows = defaults.map((s) => ({
          ...savedSearchToRow(s, user.id),
          created_at: s.createdAt,
        }))
        const { data: inserted, error: insertError } = await supabase
          .from('saved_searches')
          .insert(insertRows)
          .select()

        markSeeded(user.id)

        if (!insertError && inserted) {
          setSearches(
            sortSearches(inserted.map((r, i) => normalizeSearch(rowToSavedSearch(r), i)))
          )
          return
        }
        setSearches(defaults)
        return
      }

      // Existing rows imply this account already passed first-run seeding
      markSeeded(user.id)
      setSearches(sortSearches(rows.map((r, i) => normalizeSearch(rowToSavedSearch(r), i))))
    } catch (err) {
      console.error('Failed to load saved searches:', err)
      setSearches(readLocal())
    } finally {
      setLoading(false)
    }
  }, [isCloudSync, user])

  useEffect(() => {
    load()
  }, [load])

  const addSearch = useCallback(
    async (search: SavedSearch) => {
      const nextOrder =
        searches.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1
      const withOrder = { ...search, sortOrder: search.sortOrder ?? nextOrder }
      if (isCloudSync && supabase && user) {
        const row = savedSearchToRow(withOrder, user.id)
        const { error } = await supabase.from('saved_searches').insert(row)
        if (error) throw error
        markSeeded(user.id)
        setSearches((prev) => sortSearches([...prev, withOrder]))
      } else {
        const next = sortSearches([...searches, withOrder])
        writeLocal(next)
        markSeeded(null)
        setSearches(next)
      }
    },
    [isCloudSync, user, searches]
  )

  const updateSearch = useCallback(
    async (id: string, updates: Partial<SavedSearch>) => {
      const next = searches.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      )
      const updated = next.find((s) => s.id === id)
      if (!updated) return

      if (isCloudSync && supabase && user) {
        const row = savedSearchToRow(updated, user.id)
        const { error } = await supabase.from('saved_searches').upsert(row)
        if (error) throw error
      } else {
        writeLocal(next)
      }
      setSearches(sortSearches(next))
    },
    [isCloudSync, user, searches]
  )

  const deleteSearch = useCallback(
    async (id: string) => {
      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('saved_searches').delete().eq('id', id)
        if (error) throw error
        // Deleting the last search must not trigger first-run seed on next load
        markSeeded(user.id)
        setSearches((prev) => sortSearches(prev.filter((s) => s.id !== id)))
        return
      }

      const next = sortSearches(searches.filter((s) => s.id !== id))
      writeLocal(next)
      markSeeded(null)
      setSearches(next)
    },
    [isCloudSync, user, searches]
  )

  const activateOnly = useCallback(
    async (id: string) => {
      const now = new Date().toISOString()
      const next = searches.map((s) => ({
        ...s,
        active: s.id === id,
        updatedAt: now,
      }))
      if (!next.some((s) => s.id === id)) {
        throw new Error('Saved search not found')
      }
      await persistList(next)
    },
    [searches, persistList]
  )

  const activateAll = useCallback(async () => {
    const now = new Date().toISOString()
    const next = searches.map((s) => ({
      ...s,
      active: true,
      updatedAt: now,
    }))
    return persistList(next)
  }, [searches, persistList])

  const reorderSearches = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= searches.length ||
        toIndex >= searches.length
      ) {
        return
      }
      const now = new Date().toISOString()
      const next = [...searches]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      await persistList(next.map((s, i) => ({ ...s, sortOrder: i, updatedAt: now })))
    },
    [searches, persistList]
  )

  const seedDefaults = useCallback(async () => {
    for (const search of buildDefaultSearches()) {
      await addSearch(search)
    }
  }, [addSearch])

  const value = useMemo(
    () => ({
      searches,
      loading,
      addSearch,
      updateSearch,
      deleteSearch,
      activateOnly,
      activateAll,
      reorderSearches,
      seedDefaults,
    }),
    [
      searches,
      loading,
      addSearch,
      updateSearch,
      deleteSearch,
      activateOnly,
      activateAll,
      reorderSearches,
      seedDefaults,
    ]
  )

  return (
    <SavedSearchesContext.Provider value={value}>{children}</SavedSearchesContext.Provider>
  )
}

export function useSavedSearches() {
  const context = useContext(SavedSearchesContext)
  if (!context) throw new Error('useSavedSearches must be used within SavedSearchesProvider')
  return context
}
