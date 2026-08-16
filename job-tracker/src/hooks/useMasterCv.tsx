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
  createDefaultLibrary,
  normalizeLibrary,
  type CvTrack,
  type MasterCv,
  type MasterCvLibrary,
  type ResumeAttachment,
} from '../types/cv'
import { useAuth } from './useAuth'

const LOCAL_KEY = 'applytrack-master-cv'

interface MasterCvContextValue {
  library: MasterCvLibrary
  /** Active track CV (shorthand). */
  masterCv: MasterCv
  activeTrack: CvTrack
  loading: boolean
  setActiveTrack: (track: CvTrack) => Promise<void>
  getCv: (track: CvTrack) => MasterCv
  saveTrackCv: (track: CvTrack, cv: MasterCv) => Promise<void>
  saveAttachment: (track: CvTrack, attachment: ResumeAttachment | null) => Promise<void>
  saveLibrary: (library: MasterCvLibrary) => Promise<void>
  /** @deprecated use saveTrackCv(activeTrack, cv) */
  saveMasterCv: (cv: MasterCv) => Promise<void>
  updateMasterCv: (updates: Partial<MasterCv>) => Promise<void>
}

const MasterCvContext = createContext<MasterCvContextValue | null>(null)

function readLocal(): MasterCvLibrary {
  try {
    const stored = localStorage.getItem(LOCAL_KEY)
    if (!stored) return createDefaultLibrary()
    return normalizeLibrary(JSON.parse(stored))
  } catch {
    return createDefaultLibrary()
  }
}

function writeLocal(library: MasterCvLibrary) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(library))
}

export function MasterCvProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [library, setLibrary] = useState<MasterCvLibrary>(createDefaultLibrary())
  const [loading, setLoading] = useState(true)
  const isCloudSync = isCloudEnabled && Boolean(user)

  const persist = useCallback(
    async (next: MasterCvLibrary) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() }
      setLibrary(stamped)

      if (isCloudSync && supabase && user) {
        const { error } = await supabase.from('master_cvs').upsert(
          {
            user_id: user.id,
            document: stamped,
            updated_at: stamped.updatedAt,
          },
          { onConflict: 'user_id' }
        )
        if (error) throw error
      } else {
        writeLocal(stamped)
      }
    },
    [isCloudSync, user]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!isCloudSync || !supabase || !user) {
        setLibrary(readLocal())
        return
      }

      const { data, error } = await supabase
        .from('master_cvs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (data?.document) {
        setLibrary(normalizeLibrary(data.document))
      } else {
        const local = readLocal()
        await supabase.from('master_cvs').upsert(
          {
            user_id: user.id,
            document: local,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        setLibrary(local)
      }
    } catch (err) {
      console.error('Failed to load master CV:', err)
      setLibrary(readLocal())
    } finally {
      setLoading(false)
    }
  }, [isCloudSync, user])

  useEffect(() => {
    load()
  }, [load])

  const setActiveTrack = useCallback(
    async (track: CvTrack) => {
      await persist({ ...library, activeTrack: track })
    },
    [library, persist]
  )

  const getCv = useCallback((track: CvTrack) => library.cvs[track], [library])

  const saveTrackCv = useCallback(
    async (track: CvTrack, cv: MasterCv) => {
      await persist({
        ...library,
        cvs: {
          ...library.cvs,
          [track]: { ...cv, updatedAt: new Date().toISOString() },
        },
      })
    },
    [library, persist]
  )

  const saveAttachment = useCallback(
    async (track: CvTrack, attachment: ResumeAttachment | null) => {
      await persist({
        ...library,
        attachments: { ...library.attachments, [track]: attachment },
      })
    },
    [library, persist]
  )

  const saveLibrary = useCallback(async (next: MasterCvLibrary) => persist(next), [persist])

  const saveMasterCv = useCallback(
    async (cv: MasterCv) => {
      await saveTrackCv(library.activeTrack, cv)
    },
    [library.activeTrack, saveTrackCv]
  )

  const updateMasterCv = useCallback(
    async (updates: Partial<MasterCv>) => {
      await saveTrackCv(library.activeTrack, { ...library.cvs[library.activeTrack], ...updates })
    },
    [library, saveTrackCv]
  )

  const value = useMemo(
    () => ({
      library,
      masterCv: library.cvs[library.activeTrack],
      activeTrack: library.activeTrack,
      loading,
      setActiveTrack,
      getCv,
      saveTrackCv,
      saveAttachment,
      saveLibrary,
      saveMasterCv,
      updateMasterCv,
    }),
    [
      library,
      loading,
      setActiveTrack,
      getCv,
      saveTrackCv,
      saveAttachment,
      saveLibrary,
      saveMasterCv,
      updateMasterCv,
    ]
  )

  return <MasterCvContext.Provider value={value}>{children}</MasterCvContext.Provider>
}

export function useMasterCv() {
  const context = useContext(MasterCvContext)
  if (!context) throw new Error('useMasterCv must be used within MasterCvProvider')
  return context
}
