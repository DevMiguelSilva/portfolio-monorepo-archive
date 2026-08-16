import type { ParsedJobPosting, UserProfile } from '../types/job'
import type { JobApplication } from '../types/job'

const DEFAULT_MODEL = 'gemini-3.5-flash'

function getModel(): string {
  return import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL
}

function getBaseUrl(): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent`
}

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error(
      'Missing Gemini API key. Copy .env.example to .env and add your key from https://aistudio.google.com/apikey'
    )
  }
  return key
}

async function generate(prompt: string): Promise<string> {
  const response = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getApiKey(),
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    if (response.status === 404) {
      throw new Error(
        `Model "${getModel()}" not found. Set VITE_GEMINI_MODEL=gemini-3.5-flash in .env (or try gemini-3.1-flash-lite).`
      )
    }
    if (response.status === 429) {
      throw new Error(
        'Gemini rate limit reached. Wait a minute and try again, or check your quota at https://ai.dev/rate-limit'
      )
    }
    throw new Error(`AI request failed (${response.status}): ${error}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('AI returned an empty response')
  return text.trim()
}

function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI response did not contain valid JSON')
  return JSON.parse(match[0]) as T
}

export async function parseJobPosting(description: string): Promise<ParsedJobPosting> {
  const prompt = `You are a job posting parser. Extract structured data from this job posting.
Return ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "company": "company name or empty string if unknown",
  "role": "job title",
  "location": "location or Remote or empty string",
  "skills": ["skill1", "skill2"],
  "requirements": ["requirement1", "requirement2"],
  "summary": "2-3 sentence summary of the role"
}

Job posting:
${description}`

  const text = await generate(prompt)
  return extractJson<ParsedJobPosting>(text)
}

export async function generateCoverLetter(
  job: JobApplication,
  profile: UserProfile
): Promise<string> {
  const prompt = `Write a professional cover letter for a software developer job application in Canada.

Applicant:
- Name: ${profile.name || 'Applicant'}
- Headline: ${profile.headline || 'Software Developer'}
- Skills: ${profile.skills || 'Not provided'}
- Experience: ${profile.experienceSummary || 'Not provided'}

Job:
- Company: ${job.company}
- Role: ${job.role}
- Location: ${job.location || 'Not specified'}
- Key skills needed: ${job.extractedSkills.join(', ') || 'See description'}
- Requirements: ${job.extractedRequirements.join('; ') || 'See description'}

Job description excerpt:
${job.jobDescription.slice(0, 2000)}

Write a concise, genuine cover letter (3-4 paragraphs). Mention relevant skills honestly. Do not invent experience the applicant didn't list. Return only the cover letter text, no subject line.`

  return generate(prompt)
}

export async function generateResumeBullets(
  job: JobApplication,
  profile: UserProfile
): Promise<string[]> {
  const prompt = `Suggest 4-6 resume bullet points tailored for this job application.
Return ONLY a JSON array of strings, no markdown.

Applicant skills/experience:
${profile.experienceSummary}
Skills: ${profile.skills}

Target job: ${job.role} at ${job.company}
Required skills: ${job.extractedSkills.join(', ')}
Requirements: ${job.extractedRequirements.join('; ')}

Rules:
- Start each bullet with a strong action verb
- Be honest — only reframe existing experience, do not invent jobs or tools
- Focus on what matches this posting`

  const text = await generate(prompt)
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('AI response did not contain a valid array')
  return JSON.parse(match[0]) as string[]
}
