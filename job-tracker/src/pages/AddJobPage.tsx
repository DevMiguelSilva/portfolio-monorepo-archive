import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseJobPosting } from '../api/gemini'
import { boardLook } from '../components/BoardLook'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useJobs } from '../hooks/useJobs'
import { useMasterCv } from '../hooks/useMasterCv'
import { scoreMasterCvAgainstJob, withRequirementSignals } from '../lib/matchScore'
import { type CvTrack } from '../types/cv'
import {
  createEmptyJob,
  guessJobSourceFromUrl,
  JOB_SOURCE_LABELS,
  PORTAL_JOB_SOURCE_OPTIONS,
  type PortalJobSource,
} from '../types/job'

const mintBtn =
  'm-action rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-primary hover:bg-brand-mist disabled:opacity-60'
const fieldLabel = 'text-sm text-brand-muted'
const fieldControl =
  'mt-1 w-full rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-primary'

export function AddJobPage() {
  const navigate = useNavigate()
  const { addJob } = useJobs()
  const { getCv, activeTrack, library, getLabel } = useMasterCv()
  const [form, setForm] = useState(() =>
    createEmptyJob({ cvTrack: null, source: 'indeed', status: 'saved' })
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
        extractedSkills: withRequirementSignals(
          `${parsed.role || prev.role}\n${pasteText}`,
          parsed.skills ?? []
        ),
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
      const selectedCv = getCv(track)
      if (!selectedCv) throw new Error('Choose an existing CV template before saving.')
      const described = `${form.role}\n${fullJd}`
      const extractedSkills = withRequirementSignals(described, form.extractedSkills)
      const match = scoreMasterCvAgainstJob(described, selectedCv, extractedSkills)
      await addJob({
        ...form,
        status: 'saved',
        jobDescription: fullJd,
        extractedSkills,
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
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-3">
        <Link to="/" className="text-sm font-medium text-brand-muted hover:text-brand-ink">
          ← Back to board
        </Link>
        <h1 className={boardLook.headline}>Add application</h1>
      </div>

      <section className={`${boardLook.card} space-y-3 p-4 sm:p-5`}>
        <h2 className="font-display text-base font-semibold text-brand-ink">Quick add with AI</h2>
        <textarea
          value={pasteText}
          onChange={(e) => {
            const value = e.target.value
            setPasteText(value)
            setForm((prev) => ({ ...prev, jobDescription: value }))
          }}
          rows={8}
          placeholder="Paste the complete job posting here…"
          className={fieldControl}
        />
        <div className="m-actions">
          <button
            type="button"
            data-role="primary"
            onClick={handleParseAndFill}
            disabled={parsing || !pasteText.trim()}
            className={mintBtn}
          >
            {parsing ? 'Parsing…' : 'Parse with AI'}
          </button>
        </div>
        {parsing && <LoadingSpinner label="Extracting job details…" />}
      </section>

      <form onSubmit={handleSubmit} className={`${boardLook.card} space-y-4 p-4 sm:p-5`}>
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={fieldLabel}>
              Company <span className="text-red-700">*</span>
            </span>
            <input
              value={form.company}
              onChange={(e) => update('company', e.target.value)}
              className={fieldControl}
              required
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>
              Role <span className="text-red-700">*</span>
            </span>
            <input
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className={fieldControl}
              required
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>Location</span>
            <input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className={fieldControl}
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>Salary</span>
            <input
              value={form.salary}
              onChange={(e) => update('salary', e.target.value)}
              className={fieldControl}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={fieldLabel}>Job URL</span>
            <input
              type="url"
              value={form.jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className={fieldControl}
            />
          </label>
          <label className="block">
            <span className={fieldLabel}>Portal</span>
            <select
              value={sourceValue}
              onChange={(e) => {
                setSourceLocked(true)
                update('source', e.target.value)
              }}
              className={`${fieldControl} form-select`}
            >
              {PORTAL_JOB_SOURCE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {JOB_SOURCE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>
              Master CV <span className="text-red-700">*</span>
            </span>
            <select
              value={form.cvTrack ?? activeTrack}
              onChange={(e) => update('cvTrack', e.target.value as CvTrack)}
              className={`${fieldControl} form-select`}
            >
              {Object.keys(library.cvs).map((track) => (
                <option key={track} value={track}>
                  {getLabel(track)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {form.jdSummary && (
          <div className="rounded-lg border border-[#e6eeeb] bg-[#f7fbf9] p-3">
            <span className={fieldLabel}>AI summary</span>
            <p className="mt-1 text-sm leading-relaxed text-brand-ink">{form.jdSummary}</p>
          </div>
        )}

        <label className="block">
          <span className={fieldLabel}>Full job description</span>
          <textarea
            value={form.jobDescription}
            onChange={(e) => {
              update('jobDescription', e.target.value)
              setPasteText(e.target.value)
            }}
            rows={8}
            className={fieldControl}
          />
        </label>

        <label className="block">
          <span className={fieldLabel}>Personal notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={2}
            className={fieldControl}
          />
        </label>

        {form.extractedSkills.length > 0 && (
          <div>
            <span className={fieldLabel}>Extracted skills</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.extractedSkills.map((skill) => (
                <span key={skill} className="rounded-lg bg-[#f4faf8] px-2.5 py-1 text-sm text-brand-ink">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="m-actions">
          <button type="submit" data-role="primary" className={mintBtn}>
            Save application
          </button>
        </div>
      </form>
    </div>
  )
}
