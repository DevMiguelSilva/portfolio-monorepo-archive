/**
 * Live demo URLs — env vars in Vercel override these fallbacks.
 * jobTracker: legacy Vercel hostname (rename project in Vercel dashboard if desired).
 */
export const LIVE_URLS = {
  jobTracker: 'https://portafolio-mu-two-49.vercel.app',
}

function resolveLiveUrl(envValue: string | undefined, fallback: string): string {
  if (envValue?.startsWith('http')) return envValue.replace(/\/$/, '')
  if (fallback.startsWith('http') && !fallback.includes('REPLACE')) {
    return fallback.replace(/\/$/, '')
  }
  return ''
}

export function getJobTrackerUrl(): string {
  return resolveLiveUrl(import.meta.env.VITE_JOB_TRACKER_URL, LIVE_URLS.jobTracker)
}
