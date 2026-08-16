import { getAdzunaCredentials, type ServerEnv } from './env'

export interface AdzunaSearchParams {
  query: string
  location?: string
  country?: string
  maxDaysOld?: number
  excludeTerms?: string
  page?: number
  resultsPerPage?: number
}

export interface AdzunaJobResult {
  externalId: string
  company: string
  role: string
  location: string
  jobUrl: string
  salary: string
  description: string
  created: string
}

interface AdzunaApiJob {
  id: string | number
  title?: string
  description?: string
  created?: string
  redirect_url?: string
  salary_min?: number
  salary_max?: number
  company?: { display_name?: string }
  location?: { display_name?: string }
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return ''
  if (min && max) return `$${Math.round(min).toLocaleString()} – $${Math.round(max).toLocaleString()}`
  if (min) return `From $${Math.round(min).toLocaleString()}`
  return `Up to $${Math.round(max!).toLocaleString()}`
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function searchAdzuna(
  params: AdzunaSearchParams,
  env: ServerEnv
): Promise<AdzunaJobResult[]> {
  const { appId, appKey } = getAdzunaCredentials(env)
  const country = (params.country || 'ca').toLowerCase()
  const page = params.page ?? 1
  const resultsPerPage = Math.min(params.resultsPerPage ?? 25, 50)

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`)
  url.searchParams.set('app_id', appId)
  url.searchParams.set('app_key', appKey)
  url.searchParams.set('results_per_page', String(resultsPerPage))
  url.searchParams.set('what', params.query)
  // Empty / omitted location = country-wide (e.g. Canada when country=ca)
  if (params.location?.trim()) url.searchParams.set('where', params.location.trim())
  if (params.maxDaysOld) url.searchParams.set('max_days_old', String(params.maxDaysOld))
  if (params.excludeTerms?.trim()) url.searchParams.set('what_exclude', params.excludeTerms.trim())
  url.searchParams.set('sort_by', 'date')
  url.searchParams.set('content-type', 'application/json')

  const response = await fetch(url.toString())
  if (!response.ok) {
    const text = await response.text()
    if (response.status === 429) {
      throw new Error('Adzuna rate limit reached. Wait a minute and try again.')
    }
    throw new Error(`Adzuna request failed (${response.status}): ${text.slice(0, 300)}`)
  }

  const data = (await response.json()) as { results?: AdzunaApiJob[] }
  const results = data.results ?? []

  return results.map((job) => ({
    externalId: String(job.id),
    company: job.company?.display_name?.trim() || 'Unknown company',
    role: job.title?.trim() || 'Untitled role',
    location: job.location?.display_name?.trim() || '',
    jobUrl: job.redirect_url || '',
    salary: formatSalary(job.salary_min, job.salary_max),
    description: stripHtml(job.description || ''),
    created: job.created || '',
  }))
}
