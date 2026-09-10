import { useEffect } from 'react'

/** Light-only for now — toggle hidden in UI. */
export function useTheme() {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('job-tracker-theme', 'light')
  }, [])

  return { theme: 'light' as const }
}
