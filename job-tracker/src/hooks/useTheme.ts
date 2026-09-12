import { useLayoutEffect } from 'react'

/** Light-only — strip .dark before paint and block OS-driven dark styles. */
export function useTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
    localStorage.setItem('job-tracker-theme', 'light')
  }, [])

  return { theme: 'light' as const }
}
