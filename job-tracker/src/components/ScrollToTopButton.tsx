import { useEffect, useState } from 'react'

const SHOW_AFTER_PX = 280

function pageIsScrolled(): boolean {
  if (window.scrollY > SHOW_AFTER_PX) return true
  return [...document.querySelectorAll<HTMLElement>('.app-scroll')].some(
    (el) => el.scrollTop > SHOW_AFTER_PX
  )
}

function scrollPageToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  document.querySelectorAll<HTMLElement>('.app-scroll').forEach((el) => {
    if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(pageIsScrolled())
    onScroll()
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={scrollPageToTop}
      className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-lg shadow-slate-300/50 transition hover:border-sky-200 hover:text-sky-700 hover:shadow-sky-100/70 sm:bottom-8 sm:right-6"
      aria-label="Back to top"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
}
