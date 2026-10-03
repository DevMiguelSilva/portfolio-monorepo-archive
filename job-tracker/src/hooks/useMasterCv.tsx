import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { addCvTemplate, cvLabel, deleteLocalCv, recoverCvTransaction, CV_LIBRARY_EVENT } from '../lib/cvLibrary'
import { getErrorMessage } from '../lib/errorMessage'
import { createDefaultLibrary, normalizeLibrary, type CvTrack, type MasterCv, type MasterCvLibrary, type ResumeAttachment } from '../types/cv'
import { useAuth } from './useAuth'

const LOCAL_KEY = 'applytrack-master-cv'
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
  return JSON.stringify(value)
}
interface MasterCvContextValue {
  library: MasterCvLibrary
  masterCv: MasterCv
  activeTrack: CvTrack
  loading: boolean
  loadError: string | null
  reload: () => Promise<void>
  setActiveTrack: (track: CvTrack) => Promise<void>
  getCv: (track: CvTrack) => MasterCv | undefined
  getLabel: (track: CvTrack) => string
  saveTrackCv: (track: CvTrack, cv: MasterCv) => Promise<void>
  saveTemplate: (track: CvTrack, cv: MasterCv, attachment?: ResumeAttachment | null) => Promise<void>
  saveAttachment: (track: CvTrack, attachment: ResumeAttachment | null) => Promise<void>
  saveLibrary: (library: MasterCvLibrary) => Promise<void>
  saveMasterCv: (cv: MasterCv) => Promise<void>
  updateMasterCv: (updates: Partial<MasterCv>) => Promise<void>
  addTemplate: (name: string, copyFrom?: string) => Promise<void>
  renameTemplate: (id: string, name: string) => Promise<void>
  deleteTemplate: (id: string, replacement?: string) => Promise<void>
}
const MasterCvContext = createContext<MasterCvContextValue | null>(null)
function readLocal() {
  recoverCvTransaction(localStorage)
  const stored = localStorage.getItem(LOCAL_KEY)
  return stored ? normalizeLibrary(JSON.parse(stored)) : createDefaultLibrary()
}

export function MasterCvProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [library, setLibrary] = useState(createDefaultLibrary)
  const current = useRef(library)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const ready = useRef(false)
  const generation = useRef(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const cloud = isCloudEnabled && Boolean(user)

  const reload = useCallback(async () => {
    const version = ++generation.current
    ready.current = false
    setLoading(true)
    setLoadError(null)
    try {
      let next: MasterCvLibrary
      if (cloud && supabase && user) {
        const { data, error } = await supabase.from('master_cvs').select('document').eq('user_id', user.id).maybeSingle()
        if (error) throw error
        next = data ? normalizeLibrary(data.document) : readLocal()
        if (!data || canonical(next) !== canonical(data.document)) {
          if (data) {
            const {data: migrated, error: writeError} = await supabase.from('master_cvs').update({document:next, updated_at:next.updatedAt})
              .eq('user_id', user.id).eq('document', JSON.stringify(data.document)).select('user_id').maybeSingle()
            if (writeError) throw writeError
            if (!migrated) throw new Error('Your CV library changed while loading. Retry to load the latest version.')
          } else {
            const {error: writeError} = await supabase.from('master_cvs').insert({user_id:user.id, document:next, updated_at:next.updatedAt})
            if (writeError) throw writeError
          }
        }
      } else {
        next = readLocal()
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
      }
      if (generation.current !== version) return
      current.current = next
      setLibrary(next)
      ready.current = true
    } catch (error) {
      if (generation.current === version) setLoadError(getErrorMessage(error, 'Could not load your CV library. Retry before editing.'))
    } finally {
      if (generation.current === version) setLoading(false)
    }
  }, [cloud, user])
  useEffect(() => { void reload() }, [reload])

  const runMutation = useCallback((operation: (value: MasterCvLibrary) => Promise<MasterCvLibrary>) => {
    const version = generation.current
    const pending = queue.current.then(async () => {
      if (!ready.current || generation.current !== version) throw new Error('Wait for your CV library to load before editing.')
      const next = await operation(current.current)
      if (generation.current !== version) return
      current.current = next
      setLibrary(next)
    })
    queue.current = pending.catch(() => undefined)
    return pending
  }, [])
  const persist = useCallback((change: (value: MasterCvLibrary) => MasterCvLibrary) => runMutation(async (value) => {
    const next = {...change(value), updatedAt: new Date().toISOString()}
    if (cloud && supabase && user) {
      const {data, error} = await supabase.from('master_cvs').update({document:next, updated_at:next.updatedAt})
        .eq('user_id', user.id).eq('document', JSON.stringify(value)).select('user_id').maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Your CV library changed in another session. Your draft is preserved; reload before saving.')
    } else {
      const stored = localStorage.getItem(LOCAL_KEY)
      if (stored && canonical(JSON.parse(stored)) !== canonical(value)) throw new Error('Your CV library changed in another tab. Your draft is preserved; reload before saving.')
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
    }
    return next
  }), [cloud, user, runMutation])

  const setActiveTrack = useCallback((id: string) => persist((value) => {
    if (!value.cvs[id]) throw new Error('This CV template no longer exists.')
    return {...value, activeTrack:id}
  }), [persist])
  const saveTemplate = useCallback((id: string, cv: MasterCv, attachment?: ResumeAttachment | null) => persist((value) => {
    if (!value.cvs[id]) throw new Error('This CV template no longer exists.')
    return {...value, cvs:{...value.cvs, [id]:{...cv, updatedAt:new Date().toISOString()}},
      attachments: attachment === undefined ? value.attachments : {...value.attachments, [id]:attachment}}
  }), [persist])
  const saveTrackCv = useCallback((id: string, cv: MasterCv) => saveTemplate(id, cv), [saveTemplate])
  const saveAttachment = useCallback((id: string, attachment: ResumeAttachment | null) => persist((value) => {
    if (!value.cvs[id]) throw new Error('This CV template no longer exists.')
    return {...value, attachments:{...value.attachments, [id]:attachment}}
  }), [persist])
  const addTemplate = useCallback((name: string, source?: string) => persist((value) => addCvTemplate(value, name, source)), [persist])
  const renameTemplate = useCallback((id: string, name: string) => persist((value) => {
    if (!name.trim()) throw new Error('Enter a name for the CV template.')
    if (!value.cvs[id]) throw new Error('This CV template no longer exists.')
    return {...value, names:{...value.names, [id]:name.trim()}}
  }), [persist])
  const deleteTemplate = useCallback(async (id: string, replacement?: string) => {
    await runMutation(async (value) => {
      if (cloud && supabase && user) {
        const {data, error} = await supabase.rpc('delete_cv_template', {p_template_id:id, p_replacement_id:replacement ?? null, p_expected_document:value})
        if (error) throw error
        return normalizeLibrary(data)
      }
      return deleteLocalCv(localStorage, value, id, replacement)
    })
    window.dispatchEvent(new Event(CV_LIBRARY_EVENT))
  }, [cloud, user, runMutation])
  const getCv = useCallback((id: string) => library.cvs[id], [library])
  const getLabel = useCallback((id: string) => cvLabel(library, id), [library])
  const saveLibrary = useCallback((next: MasterCvLibrary) => persist(() => normalizeLibrary(next)), [persist])
  const saveMasterCv = useCallback((cv: MasterCv) => saveTrackCv(current.current.activeTrack, cv), [saveTrackCv])
  const updateMasterCv = useCallback((updates: Partial<MasterCv>) => persist((value) => ({...value,
    cvs:{...value.cvs, [value.activeTrack]:{...value.cvs[value.activeTrack], ...updates}}})), [persist])
  const value = useMemo(() => ({library, masterCv:library.cvs[library.activeTrack], activeTrack:library.activeTrack,
    loading, loadError, reload, setActiveTrack, getCv, getLabel, saveTrackCv, saveTemplate, saveAttachment,
    saveLibrary, saveMasterCv, updateMasterCv, addTemplate, renameTemplate, deleteTemplate}),
  [library, loading, loadError, reload, setActiveTrack, getCv, getLabel, saveTrackCv, saveTemplate, saveAttachment,
    saveLibrary, saveMasterCv, updateMasterCv, addTemplate, renameTemplate, deleteTemplate])
  return <MasterCvContext.Provider value={value}>{children}</MasterCvContext.Provider>
}
export function useMasterCv() {
  const value = useContext(MasterCvContext)
  if (!value) throw new Error('useMasterCv must be used within MasterCvProvider')
  return value
}
