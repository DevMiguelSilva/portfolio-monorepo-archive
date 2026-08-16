import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { profileToRow, rowToProfile } from '../lib/database'
import { supabase } from '../lib/supabase'
import { DEFAULT_PROFILE, EMPTY_PROFILE, isProfileEmpty, type UserProfile } from '../types/job'
import { useAuth } from './useAuth'

const LOCAL_STORAGE_KEY = 'job-tracker-profile'

interface ProfileContextValue {
  profile: UserProfile
  loading: boolean
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  isProfileComplete: boolean
  isCloudSync: boolean
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function readLocalProfile(): UserProfile {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!stored) return DEFAULT_PROFILE
    const parsed = { ...EMPTY_PROFILE, ...(JSON.parse(stored) as UserProfile) }
    return isProfileEmpty(parsed) ? DEFAULT_PROFILE : parsed
  } catch {
    return DEFAULT_PROFILE
  }
}

function writeLocalProfile(profile: UserProfile) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile))
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isCloudEnabled } = useAuth()
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)
  const isCloudSync = isCloudEnabled && Boolean(user)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      if (!isCloudSync || !supabase || !user) {
        setProfile(readLocalProfile())
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setProfile(rowToProfile(data))
      } else {
        const local = readLocalProfile()
        const row = profileToRow(local, user.id)
        await supabase.from('profiles').upsert(row)
        setProfile(local)
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
      setProfile(readLocalProfile())
    } finally {
      setLoading(false)
    }
  }, [isCloudSync, user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const next = { ...profile, ...updates }
      setProfile(next)

      if (isCloudSync && supabase && user) {
        const row = profileToRow(next, user.id)
        const { error } = await supabase.from('profiles').upsert(row)
        if (error) throw error
      } else {
        writeLocalProfile(next)
      }
    },
    [profile, isCloudSync, user]
  )

  const isProfileComplete = Boolean(profile.name.trim() && profile.experienceSummary.trim())

  const value = useMemo(
    () => ({ profile, loading, updateProfile, isProfileComplete, isCloudSync }),
    [profile, loading, updateProfile, isProfileComplete, isCloudSync]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) throw new Error('useProfile must be used within ProfileProvider')
  return context
}
