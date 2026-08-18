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

function normalizeSearch(search: SavedSearch): SavedSearch {
  const track =
    search.track === 'frontend' || search.track === 'powerPlatform' || search.track === 'auto'
      ? search.track
      : /power\s*(platform|apps|automate)|dataverse/i.test(search.query)
        ? 'powerPlatform'
        : /react|front\s*end|frontend|typescript/i.test(search.query)
          ? 'frontend'
          : 'auto'

  return {
    id: search.id,
    label: search.label ?? '',
    query: search.query ?? '',
    location: search.location ?? '',
    country: search.country || 'ca',
    maxDaysOld: search.maxDaysOld ?? 7,
    excludeTerms: search.excludeTerms ?? '',
    track,
    active: search.active !== false,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
  }
}

interface SavedSearchesContextValue {
  searches: SavedSearch[]
  loading: boolean
  addSearch: (search: SavedSearch) => Promise<void>
  updateSearch: (id: string, updates: Partial<SavedSearch>) => Promise<void>
  deleteSearch: (id: string) => Promise<void>
  seedDefaults: () => Promise<void>
}

const SavedSearchesContext = createContext<SavedSearchesContextValue | null>(null)

function readLocal(): SavedSearch[] {
  try {
    const stored = localStorage.getItem(LOCAL_KEY)
    if (!stored) return []
    return (JSON.parse(stored) as SavedSearch[]).map(normalizeSearch)
  } catch {
    return []
  }
}

function writeLocal(searches: SavedSearch[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(searches))
}

function buildDefaultSearches(): SavedSearch[] {
  const now = new Date().toISOString()
  return DEFAULT_SAVED_SEARCHES.map((s) =>
    createEmptySavedSearch({ ...s, createdAt: now, updatedAt: now })
  )
}

export function SavedSearchesProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const isCloudSync = isCloudEnabled && Boolean(user)

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
        setSearches(local)
        return
      }

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
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
          setSearches(inserted.map((r) => normalizeSearch(rowToSavedSearch(r))))
          return
        }
        setSearches(defaults)
        return
      }

      // Existing rows imply this account already passed first-run seeding
      markSeeded(user.id)
      setSearches(rows.map((r) => normalizeSearch(rowToSavedSearch(r))))
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
      if (isCloudSync && supabase && user) {
        const row = savedSearchToRow(search, user.id)
        const { error } = await supabase.from('saved_searches').insert(row)
        if (error) throw error
        markSeeded(user.id)
        setSearches((prev) => [...prev, search])
      } else {
        const next = [...searches, search]
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
      setSearches(next)
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
        setSearches((prev) => prev.filter((s) => s.id !== id))
        return
      }

      const next = searches.filter((s) => s.id !== id)
      writeLocal(next)
      markSeeded(null)
      setSearches(next)
    },
    [isCloudSync, user, searches]
  )

  const seedDefaults = useCallback(async () => {
    for (const search of buildDefaultSearches()) {
      await addSearch(search)
    }
  }, [addSearch])

  const value = useMemo(
    () => ({ searches, loading, addSearch, updateSearch, deleteSearch, seedDefaults }),
    [searches, loading, addSearch, updateSearch, deleteSearch, seedDefaults]
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
