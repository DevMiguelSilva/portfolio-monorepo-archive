import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { rowToTailoredDocument, tailoredDocumentToRow } from '../lib/database'
import { supabase } from '../lib/supabase'
import type { TailoredDocument } from '../types/cv'
import { useAuth } from './useAuth'

const LOCAL_KEY = 'applytrack-tailored-docs'

interface TailoredDocsContextValue {
  docs: TailoredDocument[]
  loading: boolean
  getForJob: (jobId: string) => TailoredDocument | undefined
  saveDoc: (doc: TailoredDocument) => Promise<void>
}

const TailoredDocsContext = createContext<TailoredDocsContextValue | null>(null)

function readLocal(): TailoredDocument[] {
  try {
    const stored = localStorage.getItem(LOCAL_KEY)
    return stored ? (JSON.parse(stored) as TailoredDocument[]) : []
  } catch {
    return []
  }
}

function writeLocal(docs: TailoredDocument[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(docs))
}

export function TailoredDocsProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [docs, setDocs] = useState<TailoredDocument[]>([])
  const [loading, setLoading] = useState(true)
  const isCloudSync = isCloudEnabled && Boolean(user)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!isCloudSync || !supabase || !user) {
        setDocs(readLocal())
        return
      }
      const { data, error } = await supabase
        .from('tailored_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      setDocs((data ?? []).map(rowToTailoredDocument))
    } catch (err) {
      console.error('Failed to load tailored docs:', err)
      setDocs(readLocal())
    } finally {
      setLoading(false)
    }
  }, [isCloudSync, user])

  useEffect(() => {
    load()
  }, [load])

  const saveDoc = useCallback(
    async (doc: TailoredDocument) => {
      const nextDoc = { ...doc, updatedAt: new Date().toISOString() }
      const without = docs.filter((d) => d.jobApplicationId !== nextDoc.jobApplicationId)
      const next = [nextDoc, ...without]

      if (isCloudSync && supabase && user) {
        const row = tailoredDocumentToRow(nextDoc, user.id)
        const { error } = await supabase.from('tailored_documents').upsert(row, {
          onConflict: 'user_id,job_application_id',
        })
        if (error) throw error
      } else {
        writeLocal(next)
      }
      setDocs(next)
    },
    [docs, isCloudSync, user]
  )

  const getForJob = useCallback(
    (jobId: string) => docs.find((d) => d.jobApplicationId === jobId),
    [docs]
  )

  const value = useMemo(
    () => ({ docs, loading, getForJob, saveDoc }),
    [docs, loading, getForJob, saveDoc]
  )

  return <TailoredDocsContext.Provider value={value}>{children}</TailoredDocsContext.Provider>
}

export function useTailoredDocs() {
  const context = useContext(TailoredDocsContext)
  if (!context) throw new Error('useTailoredDocs must be used within TailoredDocsProvider')
  return context
}
