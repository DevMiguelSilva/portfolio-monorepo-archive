import { searchAdzuna } from './adzuna.js'
import type { ServerEnv } from './env.js'
import { extractJsonArray, extractJsonObject, generateGeminiText } from './gemini.js'

export interface ApiResult {
  status: number
  body: unknown
}

function ok(body: unknown): ApiResult {
  return { status: 200, body }
}

function fail(status: number, message: string): ApiResult {
  return { status, body: { error: message } }
}

export async function handleAdzunaSearch(body: unknown, env: ServerEnv): Promise<ApiResult> {
  try {
    const input = (body ?? {}) as {
      query?: string
      what?: string
      location?: string
      country?: string
      maxDaysOld?: number
      excludeTerms?: string
      page?: number
      resultsPerPage?: number
    }
    const query = (input.query ?? input.what ?? '').trim()
    if (!query) return fail(400, 'query is required')

    const results = await searchAdzuna(
      {
        query,
        location: input.location,
        country: input.country,
        maxDaysOld: input.maxDaysOld,
        excludeTerms: input.excludeTerms,
        page: input.page,
        resultsPerPage: input.resultsPerPage,
      },
      env
    )
    return ok({ results })
  } catch (err) {
    return fail(500, err instanceof Error ? err.message : 'Adzuna search failed')
  }
}

type GeminiAction = 'parse' | 'parseResume' | 'coverLetter' | 'resumeBullets' | 'tailorCv'

export async function handleGemini(body: unknown, env: ServerEnv): Promise<ApiResult> {
  try {
    const input = (body ?? {}) as {
      action?: GeminiAction
      description?: string
      resumeText?: string
      track?: string
      job?: Record<string, unknown>
      profile?: Record<string, unknown>
      masterCv?: Record<string, unknown>
    }

    if (!input.action) return fail(400, 'action is required')

    if (input.action === 'parseResume') {
      if (!input.resumeText?.trim()) return fail(400, 'resumeText is required')
      const trackHint =
        input.track === 'powerPlatform'
          ? 'This resume is for Microsoft Power Platform roles (Power Apps, Power Automate, Dataverse, Power BI).'
          : 'This resume is for Front-end / React / TypeScript roles.'
      const prompt = `Extract a structured master CV from this resume text.
${trackHint}
Return ONLY valid JSON (no markdown) with this exact shape:
{
  "contact": {"name":"","email":"","phone":"","location":"","links":[]},
  "headline": "",
  "summary": "",
  "skills": [{"id":"any-string","group":"","items":[""]}],
  "experience": [{"id":"any-string","company":"","title":"","location":"","start":"","end":"","current":false,"bullets":[{"id":"any-string","text":"","tags":[]}]}],
  "projects": [{"id":"any-string","name":"","url":"","bullets":[{"id":"any-string","text":"","tags":[]}]}],
  "education": [{"id":"any-string","school":"","degree":"","start":"","end":""}],
  "certifications": [{"id":"any-string","name":"","issuer":"","year":""}]
}
Rules:
- Do not invent employers, degrees, certifications, or skills not present in the text
- Put degrees/diplomas/college in education; put Microsoft/AWS/etc. certs (PL-900, PL-100, etc.) in certifications — never mix them
- For education dates use start and end (e.g. "September 2022", "July 2024"); leave empty if unknown
- Generate new string ids for each item
- Put tech keywords into bullet tags when obvious
- If a field is unknown, use empty string or empty array

Resume text:
${input.resumeText.slice(0, 20000)}`
      const text = await generateGeminiText(prompt, env, { maxOutputTokens: 8192 })
      return ok({ result: extractJsonObject(text) })
    }

    if (input.action === 'parse') {
      if (!input.description?.trim()) return fail(400, 'description is required')
      const prompt = `You are a job posting parser. Extract structured metadata from the FULL job posting below.
Do NOT rewrite or shorten the job posting itself — only extract fields.
Return ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "company": "company name or empty string if unknown",
  "role": "job title",
  "location": "city/region, Remote, or empty string",
  "salary": "salary/compensation range as written, or empty string if not stated",
  "skills": ["concrete skills and tools mentioned — e.g. React, TypeScript"],
  "requirements": ["key requirements / qualifications from the posting"],
  "summary": "brief 2-3 sentence overview of the role for quick scanning"
}

Full job posting:
${input.description}`
      const text = await generateGeminiText(prompt, env)
      return ok({ result: extractJsonObject(text) })
    }

    const job = input.job ?? {}
    const profile = input.profile ?? {}

    if (input.action === 'coverLetter') {
      const prompt = `Write a professional cover letter for a software developer job application in Canada.

Applicant:
- Name: ${profile.name || 'Applicant'}
- Headline: ${profile.headline || 'Software Developer'}
- Skills: ${profile.skills || 'Not provided'}
- Experience: ${profile.experienceSummary || 'Not provided'}

Job:
- Company: ${job.company || ''}
- Role: ${job.role || ''}
- Location: ${job.location || 'Not specified'}
- Key skills needed: ${Array.isArray(job.extractedSkills) ? job.extractedSkills.join(', ') : 'See description'}
- Requirements: ${Array.isArray(job.extractedRequirements) ? job.extractedRequirements.join('; ') : 'See description'}

Job description excerpt:
${String(job.jobDescription || '').slice(0, 2000)}

Write a concise, genuine cover letter (3-4 paragraphs). Mention relevant skills honestly. Do not invent experience the applicant didn't list. Return only the cover letter text, no subject line.`
      const letter = await generateGeminiText(prompt, env)
      return ok({ result: letter })
    }

    if (input.action === 'resumeBullets') {
      const prompt = `Suggest 4-6 resume bullet points tailored for this job application.
Return ONLY a JSON array of strings, no markdown.

Applicant skills/experience:
${profile.experienceSummary || ''}
Skills: ${profile.skills || ''}

Target job: ${job.role || ''} at ${job.company || ''}
Required skills: ${Array.isArray(job.extractedSkills) ? job.extractedSkills.join(', ') : ''}
Requirements: ${Array.isArray(job.extractedRequirements) ? job.extractedRequirements.join('; ') : ''}

Rules:
- Start each bullet with a strong action verb
- Be honest — only reframe existing experience, do not invent jobs or tools
- Focus on what matches this posting`
      const text = await generateGeminiText(prompt, env)
      return ok({ result: extractJsonArray<string[]>(text) })
    }

    if (input.action === 'tailorCv') {
      if (!input.masterCv) return fail(400, 'masterCv is required')
      const prompt = `You tailor resumes for ATS screening in Canada (Workday/Greenhouse/Lever-style parsers).
Rewrite the candidate's master CV for ONE job so keyword overlap is honest and scannable.

Hard rules:
- Do NOT invent employers, titles, dates, education, certifications, metrics, or tools the candidate did not list
- Keep education and certifications unchanged (omit them from the JSON — the app preserves master values)
- Keep the same experience/project IDs where possible; do not drop real employers
- Prefer plain ASCII punctuation (hyphens, straight quotes). No emoji.

ATS-friendly content rules:
- Headline: match the target role family (e.g. Front-End / React OR Power Platform) using words from the JD only if they fit real experience
- Summary: 3-4 sentences max; weave in high-priority JD keywords the candidate truly has
- Skills: Keep the EXACT same skill groups as the Master CV (same id and group label, same number of groups — do not rename, merge, split, or invent groups). Only reorder items within each group toward the JD; demote less relevant skills to the end of their group. Do not add skills not already listed on the Master CV. Use exact common spellings from the JD when equivalent (e.g. Power Apps vs PowerApps)
- Experience bullets: max 5 bullets per role; start with strong verbs; include real metrics when already present; mirror JD keywords naturally in bullets where true
- Prefer one-page density: concise bullets, no filler

Return ONLY valid JSON with this shape:
{
  "headline": "string",
  "summary": "string",
  "skills": [{"id":"","group":"","items":[""]}],
  "experience": [{"id":"","company":"","title":"","location":"","start":"","end":"","current":true,"bullets":[{"id":"","text":"","tags":[]}]}],
  "projects": [{"id":"","name":"","url":"","bullets":[{"id":"","text":"","tags":[]}]}],
  "coverLetter": "optional short cover letter text"
}

Master CV JSON:
${JSON.stringify(input.masterCv)}

Target job:
Company: ${job.company || ''}
Role: ${job.role || ''}
Location: ${job.location || ''}
Skills: ${Array.isArray(job.extractedSkills) ? job.extractedSkills.join(', ') : ''}
Requirements: ${Array.isArray(job.extractedRequirements) ? job.extractedRequirements.join('; ') : ''}
Description:
${String(job.jobDescription || '').slice(0, 3500)}`
      const text = await generateGeminiText(prompt, env, { maxOutputTokens: 8192 })
      return ok({ result: extractJsonObject(text) })
    }

    return fail(400, `Unknown action: ${input.action}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini request failed'
    const status = message.includes('rate limit') ? 429 : 500
    return fail(status, message)
  }
}

export async function routeApi(
  pathname: string,
  method: string,
  body: unknown,
  env: ServerEnv
): Promise<ApiResult> {
  const path = pathname.replace(/\?.*$/, '')

  if (path === '/api/adzuna/search' && method === 'POST') {
    return handleAdzunaSearch(body, env)
  }
  if (path === '/api/gemini' && method === 'POST') {
    return handleGemini(body, env)
  }
  return fail(404, `No API route for ${method} ${path}`)
}
