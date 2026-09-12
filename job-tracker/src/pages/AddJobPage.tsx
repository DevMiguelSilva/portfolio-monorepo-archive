import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseJobPosting } from '../api/gemini'
import { PageToolbar } from '../components/PageToolbar'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useJobs } from '../hooks/useJobs'
import { useMasterCv } from '../hooks/useMasterCv'
import {
  formAccentBtnClass,
  formControlClass,
  formGridClass,
  formLabelClass,
  formSelectClass,
} from '../lib/formUi'
import { scoreMasterCvAgainstJob } from '../lib/matchScore'
import { CV_TRACK_LABELS, CV_TRACKS, type CvTrack } from '../types/cv'
import {
  createEmptyJob,
  guessJobSourceFromUrl,
  JOB_SOURCE_LABELS,
  PORTAL_JOB_SOURCE_OPTIONS,
  type PortalJobSource,
} from '../types/job'

export function AddJobPage() {
  const navigate = useNavigate()
  const { addJob } = useJobs()
  const { getCv, activeTrack } = useMasterCv()
  const [form, setForm] = useState(() =>
    createEmptyJob({ cvTrack: activeTrack, source: 'indeed', status: 'saved' })
  )
  const [pasteText, setPasteText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Once the user picks Source manually, stop overwriting from URL. */
  const [sourceLocked, setSourceLocked] = useState(false)

  const update = (field: keyof typeof form, value: string | CvTrack | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const setJobUrl = (url: string) => {
    setForm((prev) => ({
      ...prev,
      jobUrl: url,
      source: sourceLocked ? prev.source : guessJobSourceFromUrl(url),
    }))
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
        salary: parsed.salary || prev.salary,
        // Keep the original pasted posting verbatim — never replace with summary
        jobDescription: pasteText.trim(),
        jdSummary: parsed.summary || prev.jdSummary,
        extractedSkills: parsed.skills ?? [],
        extractedRequirements: parsed.requirements ?? [],
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
      const fullJd = form.jobDescription.trim() || pasteText.trim()
      const track = form.cvTrack ?? activeTrack
      const match = scoreMasterCvAgainstJob(
        `${form.role}\n${fullJd}`,
        getCv(track),
        form.extractedSkills
      )
      await addJob({
        ...form,
        status: 'saved',
        jobDescription: fullJd,
        cvTrack: track,
        matchScore: match.score,
        jdComplete: Boolean(fullJd),
      })
      navigate(`/job/${form.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job')
    }
  }

  const sourceValue: PortalJobSource = PORTAL_JOB_SOURCE_OPTIONS.includes(
    form.source as PortalJobSource
  )
    ? (form.source as PortalJobSource)
    : 'indeed'

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageToolbar title="Add application" />

      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Quick add with AI</h2>
        <textarea
          value={pasteText}
          onChange={(e) => {
            const value = e.target.value
            setPasteText(value)
            setForm((prev) => ({ ...prev, jobDescription: value }))
          }}
          rows={8}
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
        />
        <button
          type="button"
          onClick={handleParseAndFill}
          disabled={parsing || !pasteText.trim()}
          className="mt-2 rounded-lg bg-track-accent px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {parsing ? 'Parsing…' : 'Parse with AI'}
        </button>
        {parsing && <LoadingSpinner label="Extracting job details…" />}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 dark:border-track-700 dark:bg-track-800"
      >
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div className={formGridClass}>
          <label className="block">
            <span className={formLabelClass}>
              Company <span className="text-red-500">*</span>
            </span>
            <input
              value={form.company}
              onChange={(e) => update('company', e.target.value)}
              className={formControlClass}
              required
            />
          </label>
          <label className="block">
            <span className={formLabelClass}>
              Role <span className="text-red-500">*</span>
            </span>
            <input
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className={formControlClass}
              required
            />
          </label>
          <label className="block">
            <span className={formLabelClass}>Location</span>
            <input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className={formControlClass}
            />
          </label>
          <label className="block">
            <span className={formLabelClass}>Salary</span>
            <input
              value={form.salary}
              onChange={(e) => update('salary', e.target.value)}
              className={formControlClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={formLabelClass}>Job URL</span>
            <input
              type="url"
              value={form.jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className={formControlClass}
            />
          </label>
          <label className="block">
            <span className={formLabelClass}>Portal</span>
            <select
              value={sourceValue}
              onChange={(e) => {
                setSourceLocked(true)
                update('source', e.target.value)
              }}
              className={formSelectClass}
            >
              {PORTAL_JOB_SOURCE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {JOB_SOURCE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={formLabelClass}>
              Master CV <span className="text-red-500">*</span>
            </span>
            <select
              value={form.cvTrack ?? activeTrack}
              onChange={(e) => update('cvTrack', e.target.value as CvTrack)}
              className={formSelectClass}
            >
              {CV_TRACKS.map((track) => (
                <option key={track} value={track}>
                  {CV_TRACK_LABELS[track]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {form.jdSummary && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-track-700 dark:bg-track-900">
            <span className={formLabelClass}>AI summary</span>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{form.jdSummary}</p>
          </div>
        )}

        <label className="block">
          <span className={formLabelClass}>Full job description</span>
          <textarea
            value={form.jobDescription}
            onChange={(e) => {
              update('jobDescription', e.target.value)
              setPasteText(e.target.value)
            }}
            rows={8}
            className={formControlClass}
          />
        </label>

        <label className="block">
          <span className={formLabelClass}>Personal notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={2}
            className={formControlClass}
          />
        </label>

        {form.extractedSkills.length > 0 && (
          <div>
            <span className={formLabelClass}>Extracted skills</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {form.extractedSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className={`w-full ${formAccentBtnClass} py-2 font-semibold`}>
          Save application
        </button>
      </form>
    </div>
  )
}
