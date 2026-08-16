import { useState } from 'react'
import { generateCoverLetter, generateResumeBullets, parseJobPosting } from '../api/gemini'
import type { JobApplication } from '../types/job'
import { useJobs } from '../hooks/useJobs'
import { useProfile } from '../hooks/useProfile'
import { LoadingSpinner } from './LoadingSpinner'

interface AiToolsPanelProps {
  job: JobApplication
}

export function AiToolsPanel({ job }: AiToolsPanelProps) {
  const { updateJob } = useJobs()
  const { profile, isProfileComplete } = useProfile()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [bullets, setBullets] = useState<string[]>([])
  const [pasteText, setPasteText] = useState(job.jobDescription)

  const runAi = async (action: string, fn: () => Promise<void>) => {
    setLoading(action)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setLoading(null)
    }
  }

  const handleParse = () =>
    runAi('parse', async () => {
      if (!pasteText.trim()) throw new Error('Paste a job description first')
      const parsed = await parseJobPosting(pasteText)
      updateJob(job.id, {
        company: parsed.company || job.company,
        role: parsed.role || job.role,
        location: parsed.location || job.location,
        jobDescription: pasteText,
        extractedSkills: parsed.skills,
        extractedRequirements: parsed.requirements,
        notes: job.notes || parsed.summary,
      })
    })

  const handleCoverLetter = () =>
    runAi('cover', async () => {
      if (!isProfileComplete) throw new Error('Fill in your Profile first (name + experience)')
      const letter = await generateCoverLetter({ ...job, jobDescription: pasteText || job.jobDescription }, profile)
      setCoverLetter(letter)
    })

  const handleBullets = () =>
    runAi('bullets', async () => {
      if (!isProfileComplete) throw new Error('Fill in your Profile first (name + experience)')
      const result = await generateResumeBullets({ ...job, jobDescription: pasteText || job.jobDescription }, profile)
      setBullets(result)
    })

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <span>✨</span> AI Assistant
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Paste a job posting and let AI extract details, draft a cover letter, or suggest resume bullets.
        </p>

        {!isProfileComplete && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            ⚠️ Complete your <a href="/profile" className="font-medium underline">Profile</a> for cover letters and resume bullets.
          </p>
        )}

        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={6}
          placeholder="Paste the full job posting here…"
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-track-accent focus:ring-2 focus:ring-track-accent/20 dark:border-track-700 dark:bg-track-900"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleParse}
            disabled={!!loading}
            className="rounded-lg bg-track-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading === 'parse' ? 'Parsing…' : '🔍 Parse posting'}
          </button>
          <button
            type="button"
            onClick={handleCoverLetter}
            disabled={!!loading}
            className="rounded-lg border border-track-accent px-4 py-2 text-sm font-medium text-track-accent transition hover:bg-track-accent/10 disabled:opacity-50"
          >
            {loading === 'cover' ? 'Writing…' : '📝 Cover letter'}
          </button>
          <button
            type="button"
            onClick={handleBullets}
            disabled={!!loading}
            className="rounded-lg border border-track-accent px-4 py-2 text-sm font-medium text-track-accent transition hover:bg-track-accent/10 disabled:opacity-50"
          >
            {loading === 'bullets' ? 'Generating…' : '🎯 Resume bullets'}
          </button>
        </div>

        {loading && <LoadingSpinner label="AI is thinking…" />}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
      </div>

      {coverLetter && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Cover Letter Draft</h3>
            <button
              type="button"
              onClick={() => copyToClipboard(coverLetter)}
              className="text-xs font-medium text-track-accent hover:underline"
            >
              Copy
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {coverLetter}
          </p>
        </div>
      )}

      {bullets.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Suggested Resume Bullets</h3>
            <button
              type="button"
              onClick={() => copyToClipboard(bullets.map((b) => `• ${b}`).join('\n'))}
              className="text-xs font-medium text-track-accent hover:underline"
            >
              Copy all
            </button>
          </div>
          <ul className="space-y-2">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-track-accent">•</span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
