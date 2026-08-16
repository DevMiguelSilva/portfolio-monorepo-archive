import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { InterviewPrepPanel } from '../components/InterviewPrepPanel'
import { StatusBadge } from '../components/StatusBadge'
import { TailorPanel } from '../components/TailorPanel'
import { useJobs } from '../hooks/useJobs'
import { useMasterCv } from '../hooks/useMasterCv'
import { formatDualTrackScores, scoreDualTracks, scoreMasterCvAgainstJob } from '../lib/matchScore'
import { CV_TRACK_LABELS, CV_TRACKS, type CvTrack } from '../types/cv'

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getJob, deleteJob, updateJob } = useJobs()
  const { getCv, activeTrack, library } = useMasterCv()
  const job = id ? getJob(id) : undefined
  const [showFullJd, setShowFullJd] = useState(false)
  const [editingTrack, setEditingTrack] = useState(false)

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

  const applyTrack = async (track: CvTrack) => {
    const match = scoreMasterCvAgainstJob(
      `${job.role}\n${job.jobDescription}`,
      getCv(track),
      job.extractedSkills
    )
    await updateJob(job.id, { cvTrack: track, matchScore: match.score })
    setEditingTrack(false)
  }

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
        ← Back to board
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <StatusBadge status={job.status} size="md" />
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
              </span>
            )}
            {job.source && job.source !== 'manual' && <span>via {job.source}</span>}
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

      {(job.jdSummary ||
        job.extractedSkills.length > 0 ||
        job.extractedRequirements.length > 0 ||
        job.jobDescription) && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
          <h2 className="font-semibold">Posting overview</h2>
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
                {showFullJd ? 'Hide full job description' : 'Show full job description'}
              </button>
              {showFullJd && (
                <div
                  className="mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                  role="region"
                  aria-label="Full job description"
                >
                  {job.jobDescription}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No full JD saved yet. Include the posting when you add the job (or from Inbox) if you
              need it for match scoring and interview prep.
            </p>
          )}
        </section>
      )}

      {showInterviewPrep && <InterviewPrepPanel job={job} />}
      <TailorPanel job={job} />
    </div>
  )
}
