import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { parseJobPosting } from '../api/gemini'
import { InterviewPrepPanel } from '../components/InterviewPrepPanel'
import { SourceBadge } from '../components/SourceBadge'
import { StatusBadge } from '../components/StatusBadge'
import { TailorPanel } from '../components/TailorPanel'
import { useJobs } from '../hooks/useJobs'
import { useMasterCv } from '../hooks/useMasterCv'
import {
  formAccentBtnClass,
  formControlClass,
  formLabelClass,
  formPanelClass,
  formPrimaryBtnClass,
} from '../lib/formUi'
import { formatDualTrackScores, scoreDualTracks, scoreMasterCvAgainstJob } from '../lib/matchScore'
import { CV_TRACK_LABELS, CV_TRACKS, type CvTrack } from '../types/cv'
import {
  guessJobSourceFromUrl,
  JOB_SOURCE_LABELS,
  MANUAL_JOB_SOURCE_OPTIONS,
  jobSourceLabel,
} from '../types/job'

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getJob, deleteJob, updateJob } = useJobs()
  const { getCv, activeTrack, library } = useMasterCv()
  const job = id ? getJob(id) : undefined
  const [showFullJd, setShowFullJd] = useState(false)
  const [editingTrack, setEditingTrack] = useState(false)
  const [editingSource, setEditingSource] = useState(false)
  const [editingJd, setEditingJd] = useState(false)
  const [jdDraft, setJdDraft] = useState('')
  const [savingJd, setSavingJd] = useState(false)
  const [parsingJd, setParsingJd] = useState(false)
  const [jdError, setJdError] = useState<string | null>(null)

  const dual = useMemo(() => {
    if (!job) return null
    const jobText = `${job.role}\n${job.jobDescription}`
    return scoreDualTracks(
      jobText,
      { frontend: getCv('frontend'), powerPlatform: getCv('powerPlatform') },
      job.extractedSkills
    )
  }, [job, getCv, library])

  if (!job) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Job not found.</p>
        <Link to="/" className="mt-2 inline-block text-track-accent hover:underline">
          ← Back to board
        </Link>
      </div>
    )
  }

  const handleDelete = async () => {
    if (confirm(`Delete ${job.role} at ${job.company}?`)) {
      await deleteJob(job.id)
      navigate('/')
    }
  }

  const selectedTrack = job.cvTrack ?? activeTrack
  const showInterviewPrep = job.status === 'interview'
  const hasUrl = Boolean(job.jobUrl.trim())
  const selectedScore = dual?.[selectedTrack].score ?? job.matchScore
  const jdIncomplete = !job.jdComplete

  const applyTrack = async (track: CvTrack) => {
    const match = scoreMasterCvAgainstJob(
      `${job.role}\n${job.jobDescription}`,
      getCv(track),
      job.extractedSkills
    )
    await updateJob(job.id, { cvTrack: track, matchScore: match.score })
    setEditingTrack(false)
  }

  const openJdEditor = () => {
    setJdDraft(job.jobDescription)
    setJdError(null)
    setEditingJd(true)
    setShowFullJd(true)
  }

  const saveJd = async (withParse: boolean) => {
    const fullJd = jdDraft.trim()
    if (!fullJd) {
      setJdError('Paste the full job description before saving.')
      return
    }

    setSavingJd(true)
    setJdError(null)
    try {
      let jdSummary = job.jdSummary
      let extractedSkills = job.extractedSkills
      let extractedRequirements = job.extractedRequirements
      let company = job.company
      let role = job.role
      let location = job.location
      let salary = job.salary

      if (withParse) {
        setParsingJd(true)
        try {
          const parsed = await parseJobPosting(fullJd)
          jdSummary = parsed.summary || jdSummary
          if (parsed.skills?.length) extractedSkills = parsed.skills
          else extractedSkills = []
          if (parsed.requirements?.length) extractedRequirements = parsed.requirements
          if (parsed.company) company = parsed.company
          if (parsed.role) role = parsed.role
          if (parsed.location) location = parsed.location
          if (parsed.salary) salary = parsed.salary
        } catch (err) {
          // Still save the JD + rescore even if Gemini is down
          setJdError(
            err instanceof Error
              ? `${err.message} — saved description and rescored without AI parse.`
              : 'AI parse failed — saved description and rescored without AI parse.'
          )
          extractedSkills = []
        } finally {
          setParsingJd(false)
        }
      } else {
        // Drop snippet-era skills so match mines keywords from the full JD text
        extractedSkills = []
      }

      const track = job.cvTrack ?? activeTrack
      const match = scoreMasterCvAgainstJob(
        `${role}\n${fullJd}`,
        getCv(track),
        extractedSkills
      )

      await updateJob(job.id, {
        jobDescription: fullJd,
        jdSummary,
        extractedSkills: extractedSkills.length ? extractedSkills : match.targets,
        extractedRequirements,
        company,
        role,
        location,
        salary,
        matchScore: match.score,
        jdComplete: true,
      })
      setEditingJd(false)
    } catch (err) {
      setJdError(err instanceof Error ? err.message : 'Failed to update job description')
    } finally {
      setSavingJd(false)
      setParsingJd(false)
    }
  }

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
        ← Back to board
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} size="md" />
            <SourceBadge source={job.source} size="md" />
            {jdIncomplete && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                JD incomplete
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-bold">{job.role}</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">{job.company}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
            {job.location && <span>📍 {job.location}</span>}
            {job.salary && <span>💰 {job.salary}</span>}
            {job.status !== 'saved' && job.appliedDate && (
              <span>📅 Applied {job.appliedDate}</span>
            )}
            {selectedScore != null && (
              <span>
                🎯 {selectedScore}% · {CV_TRACK_LABELS[selectedTrack]}
                {jdIncomplete ? ' (preview)' : ''}
              </span>
            )}
          </div>
          {dual && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Coverage vs master CVs:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {formatDualTrackScores(dual)}
              </span>
              {dual.bestTrack !== selectedTrack && (
                <span className="text-slate-400">
                  {' '}
                  · better fit: {CV_TRACK_LABELS[dual.bestTrack]}
                </span>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
        >
          Delete
        </button>
      </div>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-track-700 dark:bg-track-800">
        <div>
          <span className="text-sm font-medium text-slate-500">Posting URL</span>
          {hasUrl ? (
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm font-medium text-track-accent hover:underline"
            >
              Open original posting →
            </a>
          ) : (
            <p className="mt-1 text-sm text-slate-400">No URL on this job</p>
          )}
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-500">Source</span>
              {!editingSource && (
                <button
                  type="button"
                  onClick={() => setEditingSource(true)}
                  className="text-xs font-medium text-track-accent hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingSource ? (
              <div className="mt-1 space-y-2">
                <select
                  value={job.source || 'manual'}
                  onChange={async (e) => {
                    await updateJob(job.id, { source: e.target.value })
                    setEditingSource(false)
                  }}
                  className={formControlClass}
                >
                  {Array.from(
                    new Set<string>([...MANUAL_JOB_SOURCE_OPTIONS, 'adzuna', job.source || 'manual'])
                  ).map((value) => (
                    <option key={value} value={value}>
                      {JOB_SOURCE_LABELS[value] ?? jobSourceLabel(value)}
                    </option>
                  ))}
                </select>
                {hasUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      await updateJob(job.id, { source: guessJobSourceFromUrl(job.jobUrl) })
                      setEditingSource(false)
                    }}
                    className="text-xs font-medium text-track-accent hover:underline"
                  >
                    Detect from URL
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingSource(false)}
                  className="ml-3 text-xs text-slate-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-1">
                <SourceBadge source={job.source} size="md" />
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-500">Master CV for match & tailor</span>
            {!editingTrack && (
              <button
                type="button"
                onClick={() => setEditingTrack(true)}
                className="text-xs font-medium text-track-accent hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {editingTrack ? (
            <div className="mt-2 space-y-2">
              <select
                value={selectedTrack}
                onChange={(e) => applyTrack(e.target.value as CvTrack)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-track-accent dark:border-track-700 dark:bg-track-900"
              >
                {CV_TRACKS.map((track) => (
                  <option key={track} value={track}>
                    {CV_TRACK_LABELS[track]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setEditingTrack(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-track-700"
              >
                Cancel
              </button>
              <p className="text-xs text-slate-400">
                Changing this recalculates match % and which CV ATS tailor uses.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm font-medium">{CV_TRACK_LABELS[selectedTrack]}</p>
          )}
        </div>
      </section>

      {(jdIncomplete || editingJd) && (
        <section
          className={`space-y-3 rounded-xl border p-5 ${
            jdIncomplete
              ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20'
              : 'border-slate-200 bg-white dark:border-track-700 dark:bg-track-800'
          }`}
        >
          <div>
            <h2 className="font-semibold">
              {jdIncomplete ? 'Complete the job description' : 'Update job description'}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {jdIncomplete
                ? 'This listing came from an API preview. Open the posting, copy the full JD, paste it here, then save to refresh match %.'
                : 'Replace the stored JD and recalculate match against your Master CV.'}
            </p>
          </div>

          {!editingJd ? (
            <button type="button" onClick={openJdEditor} className={formAccentBtnClass}>
              Paste full job description
            </button>
          ) : (
            <div className={formPanelClass}>
              <label className="block">
                <span className={formLabelClass}>Full job description</span>
                <textarea
                  value={jdDraft}
                  onChange={(e) => setJdDraft(e.target.value)}
                  rows={12}
                  placeholder="Paste the complete job posting here…"
                  className={`${formControlClass} font-mono text-xs leading-relaxed`}
                />
              </label>
              {jdError && (
                <p className="text-sm text-amber-700 dark:text-amber-300" role="alert">
                  {jdError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingJd || parsingJd}
                  onClick={() => saveJd(true)}
                  className={`${formAccentBtnClass} disabled:opacity-60`}
                >
                  {parsingJd ? 'Parsing…' : savingJd ? 'Saving…' : 'Parse, save & rescore'}
                </button>
                <button
                  type="button"
                  disabled={savingJd || parsingJd}
                  onClick={() => saveJd(false)}
                  className={`${formPrimaryBtnClass} disabled:opacity-60`}
                >
                  {savingJd && !parsingJd ? 'Saving…' : 'Save & rescore'}
                </button>
                <button
                  type="button"
                  disabled={savingJd || parsingJd}
                  onClick={() => {
                    setEditingJd(false)
                    setJdError(null)
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-track-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {(job.jdSummary ||
        job.extractedSkills.length > 0 ||
        job.extractedRequirements.length > 0 ||
        job.jobDescription) && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Posting overview</h2>
            {job.jdComplete && !editingJd && (
              <button
                type="button"
                onClick={openJdEditor}
                className="text-xs font-medium text-track-accent hover:underline"
              >
                Update JD
              </button>
            )}
          </div>
          {job.jdSummary && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-500">AI summary</h3>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {job.jdSummary}
              </p>
            </div>
          )}
          {job.extractedSkills.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-500">Skills from JD</h3>
              <div className="flex flex-wrap gap-2">
                {job.extractedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {job.extractedRequirements.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-500">Requirements</h3>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {job.extractedRequirements.map((req) => (
                  <li key={req} className="flex gap-2">
                    <span className="text-track-accent">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.jobDescription ? (
            <div className="border-t border-slate-100 pt-3 dark:border-track-700">
              <button
                type="button"
                onClick={() => setShowFullJd((v) => !v)}
                className="text-sm font-medium text-track-accent hover:underline"
                aria-expanded={showFullJd}
              >
                {showFullJd
                  ? 'Hide job description'
                  : jdIncomplete
                    ? 'Show listing preview'
                    : 'Show full job description'}
              </button>
              {showFullJd && (
                <div
                  className="mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                  role="region"
                  aria-label="Job description"
                >
                  {job.jobDescription}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No JD saved yet. Paste the full posting above to unlock accurate match scoring.
            </p>
          )}
        </section>
      )}

      {showInterviewPrep && <InterviewPrepPanel job={job} />}
      <TailorPanel job={job} />
    </div>
  )
}
