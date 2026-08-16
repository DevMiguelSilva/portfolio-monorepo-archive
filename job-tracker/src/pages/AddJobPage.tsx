import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseJobPosting } from '../api/gemini'
import { createEmptyJob, STATUS_ORDER, type JobStatus } from '../types/job'
import { useJobs } from '../hooks/useJobs'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function AddJobPage() {
  const navigate = useNavigate()
  const { addJob } = useJobs()
  const [form, setForm] = useState(createEmptyJob())
  const [pasteText, setPasteText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof typeof form, value: string | JobStatus) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleParseAndFill = async () => {
    if (!pasteText.trim()) return
    setParsing(true)
    setError(null)
    try {
      const parsed = await parseJobPosting(pasteText)
      setForm((prev) => ({
        ...prev,
        company: parsed.company || prev.company,
        role: parsed.role || prev.role,
        location: parsed.location || prev.location,
        jobDescription: pasteText,
        extractedSkills: parsed.skills,
        extractedRequirements: parsed.requirements,
        notes: parsed.summary,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse posting')
    } finally {
      setParsing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company.trim() || !form.role.trim()) {
      setError('Company and role are required')
      return
    }
    try {
      await addJob(form)
      navigate(`/job/${form.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
          ← Back to board
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add Application</h1>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
        <h2 className="mb-2 font-semibold">✨ Quick add with AI</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Paste a job posting and AI will fill in the details for you.
        </p>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={5}
          placeholder="Paste job description here…"
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
        />
        <button
          type="button"
          onClick={handleParseAndFill}
          disabled={parsing || !pasteText.trim()}
          className="mt-2 rounded-lg bg-track-accent px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          {parsing ? 'Parsing…' : 'Parse with AI'}
        </button>
        {parsing && <LoadingSpinner label="Extracting job details…" />}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-track-700 dark:bg-track-800">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Company *</span>
            <input
              value={form.company}
              onChange={(e) => update('company', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Role *</span>
            <input
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Location</span>
            <input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="Toronto, ON / Remote"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Salary</span>
            <input
              value={form.salary}
              onChange={(e) => update('salary', e.target.value)}
              placeholder="$60k – $80k CAD"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Job URL</span>
          <input
            type="url"
            value={form.jobUrl}
            onChange={(e) => update('jobUrl', e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Status</span>
          <select
            value={form.status}
            onChange={(e) => update('status', e.target.value as JobStatus)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
          />
        </label>

        {form.extractedSkills.length > 0 && (
          <div>
            <span className="text-sm font-medium">Extracted skills</span>
            <div className="mt-2 flex flex-wrap gap-1">
              {form.extractedSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-track-accent py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          Save application
        </button>
      </form>
    </div>
  )
}
