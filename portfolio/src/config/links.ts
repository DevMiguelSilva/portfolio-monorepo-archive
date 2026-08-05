/**
 * Live demo URLs — paste your real Vercel URLs below, then push to GitHub.
 * Env vars in Vercel (VITE_MOVIE_APP_URL, VITE_JOB_TRACKER_URL) override these.
 */
export const LIVE_URLS = {
  movieDiscovery: 'https://movie-discovery-delta.vercel.app',
  jobTracker: 'https://portafolio-mu-two-49.vercel.app',
}

function resolveLiveUrl(envValue: string | undefined, fallback: string): string {
  if (envValue?.startsWith('http')) return envValue.replace(/\/$/, '')
  if (fallback.startsWith('http') && !fallback.includes('REPLACE')) {
    return fallback.replace(/\/$/, '')
  }
  return ''
}

export function getMovieAppUrl(): string {
  return resolveLiveUrl(import.meta.env.VITE_MOVIE_APP_URL, LIVE_URLS.movieDiscovery)
}

export function getJobTrackerUrl(): string {
  return resolveLiveUrl(import.meta.env.VITE_JOB_TRACKER_URL, LIVE_URLS.jobTracker)
}
