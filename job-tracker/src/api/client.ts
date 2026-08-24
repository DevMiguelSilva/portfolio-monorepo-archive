async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`
    )
  }
  return data as T
}

export interface AdzunaClientJob {
  externalId: string
  company: string
  role: string
  location: string
  jobUrl: string
  salary: string
  description: string
  created: string
}

export async function fetchAdzunaJobs(params: {
  /** Exact phrase (`what_phrase`) — one term per saved search. */
  query: string
  location?: string
  country?: string
  maxDaysOld?: number
  excludeTerms?: string
  /** Require keyword "remote" without changing the phrase. */
  requireRemote?: boolean
}): Promise<AdzunaClientJob[]> {
  const data = await apiPost<{ results: AdzunaClientJob[] }>('/api/adzuna/search', params)
  return data.results ?? []
}

export async function callGemini<T>(body: Record<string, unknown>): Promise<T> {
  const data = await apiPost<{ result: T }>('/api/gemini', body)
  return data.result
}
