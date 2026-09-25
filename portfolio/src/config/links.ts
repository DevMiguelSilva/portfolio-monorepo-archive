/**
 * Live demo URLs — env vars in Vercel override these fallbacks.
 * jobTracker must be the Git-connected project (job-tracker), not the older
 * applytrack-board project, which does not receive pushes from this repo.
 */
export const LIVE_URLS = {
  jobTracker: 'https://job-tracker-miguel-381c.vercel.app',
  fitTracker: 'https://fittrack-logbook.vercel.app',
}

function resolveLiveUrl(envValue: string | undefined, fallback: string): string {
  if (envValue?.startsWith('http')) return envValue.replace(/\/$/, '')
  if (fallback.startsWith('http') && !fallback.includes('REPLACE')) {
    return fallback.replace(/\/$/, '')
  }
  return ''
}

export function getJobTrackerUrl(): string {
  const configured = import.meta.env.VITE_JOB_TRACKER_URL
  // Older Vercel env still names the project that does not receive git deploys.
  if (configured?.includes('applytrack-board.vercel.app')) {
    return LIVE_URLS.jobTracker
  }
  return resolveLiveUrl(configured, LIVE_URLS.jobTracker)
}

export function getFitTrackerUrl(): string {
  return resolveLiveUrl(import.meta.env.VITE_FIT_TRACKER_URL, LIVE_URLS.fitTracker)
}
