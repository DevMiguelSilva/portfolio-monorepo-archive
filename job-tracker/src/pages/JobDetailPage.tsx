import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { parseJobPosting } from '../api/gemini'
import { InterviewList } from '../components/InterviewList'
import { InterviewPrepPanel } from '../components/InterviewPrepPanel'
import { TailorPanel } from '../components/TailorPanel'
import { useJobs } from '../hooks/useJobs'
import { useMasterCv } from '../hooks/useMasterCv'
import { useTailoredDocs } from '../hooks/useTailoredDocs'
import { BOARD_TONE } from '../lib/boardTone'
import { scoreMasterCvAgainstJob, withRequirementSignals } from '../lib/matchScore'
import { jobSourceLabel, latestInterviewFollowUp, personalNotesText, STATUS_CONFIG } from '../types/job'

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getJob, deleteJob, restoreJob, purgeJob, updateJob, moveJob } = useJobs()
  const { getCv, activeTrack, library, getLabel } = useMasterCv()
  const { getForJob } = useTailoredDocs()
  const job = id ? getJob(id) : undefined
  const hasResume = Boolean(id && getForJob(id)?.tailoredCv)
  const [showFullJd, setShowFullJd] = useState(false)
  const [editingJd, setEditingJd] = useState(false)
  const [jdDraft, setJdDraft] = useState('')
  const [savingJd, setSavingJd] = useState(false)
  const [parsingJd, setParsingJd] = useState(false)
  const [jdError, setJdError] = useState<string | null>(null)
  const [jdCopied, setJdCopied] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)

  const matchPercent = useMemo(() => {
    if (!job) return null
    if (job.status !== 'saved') return getForJob(job.id)?.matchScore ?? job.matchScore
    const selectedCv = getCv(job.cvTrack ?? activeTrack)
    if (!selectedCv) return null
    return scoreMasterCvAgainstJob(
      `${job.role}\n${job.jobDescription}`,
      selectedCv,
      job.extractedSkills
    ).score
  }, [job, getCv, activeTrack, getForJob])

  useEffect(() => {
    if (!job || job.status !== 'saved' || job.deletedAt) setEditingJd(false)
  }, [job])

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
    if (confirm(`Move ${job.role} at ${job.company} to Trash?`)) {
      await deleteJob(job.id)
      navigate('/')
    }
  }

  const handleRestore = async () => {
    await restoreJob(job.id)
  }

  const handlePurge = async () => {
    if (confirm(`Permanently delete ${job.role} at ${job.company}? This cannot be undone.`)) {
      await purgeJob(job.id)
      navigate('/')
    }
  }

  const showInterviewPrep = job.status === 'interview'
  const notesText = personalNotesText(job.notes)
  const followUp = job.status === 'interview' ? latestInterviewFollowUp(job.interviews) : null
  const tone = BOARD_TONE[job.deletedAt ? 'trash' : job.status]
  const statusLabel = job.deletedAt ? 'Trash' : STATUS_CONFIG[job.status].label
  const statusBtn = (slot: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'trash') =>
    `m-action rounded-lg px-4 py-2 text-sm font-semibold transition ${BOARD_TONE[slot].action}`
  const quietBtn =
    'rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-[#f4faf8]'
  const pasteBtn =
    'rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-primary hover:bg-brand-mist'
  const panel = 'rounded-[1.25rem] border border-[#e6eeeb] bg-white p-6'
  const field =
    'mt-2 w-full rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-sm leading-relaxed text-brand-ink outline-none transition focus:border-brand-primary'

  const saveNotes = async () => {
    setSavingNotes(true)
    setNotesError(null)
    try {
      await updateJob(job.id, { notes: notesDraft })
      setEditingNotes(false)
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'Could not save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const hasUrl = Boolean(job.jobUrl.trim())
  const jdIncomplete = !job.jdComplete

  const copyFullJd = async () => {
    const text = job.jobDescription.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setJdCopied(true)
      window.setTimeout(() => setJdCopied(false), 2000)
    } catch {
      setJdCopied(false)
    }
  }

  const openJdEditor = () => {
    setJdDraft(job.jobDescription)
    setJdError(null)
    setEditingJd(true)
    setShowFullJd(true)
  }

  const saveJd = async (fullJdRaw: string) => {
    if (job.status !== 'saved' || job.deletedAt) return
    const fullJd = fullJdRaw.trim()
    if (!fullJd) {
      setJdError('Paste the full job description before saving.')
      return
    }

    setSavingJd(true)
    setJdError(null)
    setParsingJd(true)
    try {
      let jdSummary = job.jdSummary
      let extractedSkills = job.extractedSkills
      let extractedRequirements = job.extractedRequirements
      let company = job.company
      let role = job.role
      let location = job.location
      let salary = job.salary

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
        setJdError(
          err instanceof Error
            ? `${err.message} — saved description and rescored without AI parse.`
            : 'AI parse failed — saved description and rescored without AI parse.'
        )
        extractedSkills = []
      } finally {
        setParsingJd(false)
      }

      const track = job.cvTrack ?? activeTrack
      const described = `${role}\n${fullJd}`
      extractedSkills = withRequirementSignals(described, extractedSkills)
      const selectedCv = getCv(track)
      if (!selectedCv) throw new Error('Choose an existing CV template for this job.')
      const match = scoreMasterCvAgainstJob(described, selectedCv, extractedSkills)

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
        needsRescore: false,
      })
      setEditingJd(false)
      setShowFullJd(false)
    } catch (err) {
      setJdError(err instanceof Error ? err.message : 'Failed to update job description')
    } finally {
      setSavingJd(false)
      setParsingJd(false)
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm font-medium text-brand-muted hover:text-brand-ink">
        ← Back to board
      </Link>

      <section className="rounded-[1.25rem] border border-[#e6eeeb] bg-white p-6 sm:p-8">
        <div className="m-action-row flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-baseline gap-2">
              <span className={`text-sm font-medium ${tone.figure}`}>{statusLabel}</span>
              <span className="text-[11px] text-brand-muted">{jobSourceLabel(job.source)}</span>
            </p>
            <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-brand-ink">
              {job.role || 'Untitled role'}
            </h1>
            <p className="mt-1 truncate text-sm text-brand-muted">{job.company || 'Unknown company'}</p>
            <p className="truncate text-sm text-brand-muted">
              {job.location.trim() || 'No location'}
            </p>
            <p className={`mt-2 text-sm ${job.salary.trim() ? 'text-brand-ink' : 'text-brand-muted'}`}>
              {job.salary.trim() || 'No salary yet'}
            </p>
            {job.status !== 'saved' && (job.appliedDate || matchPercent != null) && (
              <p className="mt-2 text-sm text-brand-muted">
                {[
                  job.appliedDate ? `Applied ${job.appliedDate}` : null,
                  matchPercent != null ? `${matchPercent}% match` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {job.deletedAt && (
              <p className="mt-1 text-xs text-brand-muted">Was {STATUS_CONFIG[job.status].label}</p>
            )}
            {job.status === 'interview' && job.notSelected && (
              <p className="pt-2 text-sm text-brand-muted">Not selected</p>
            )}
            {job.status === 'interview' && !job.notSelected && followUp === 'pending' && (
              <p className="pt-2 text-sm text-emerald-700">Interview booked</p>
            )}
            {job.status === 'interview' && !job.notSelected && followUp === 'waiting' && (
              <p className="pt-2 text-sm text-emerald-700">Waiting for an answer</p>
            )}
            {jdIncomplete && !job.needsRescore && (
              <p className="pt-2 text-sm text-[#8a6230]">Description incomplete</p>
            )}
          </div>

          <div className="m-actions flex flex-wrap gap-2">
            {job.deletedAt ? (
              <>
                <button type="button" data-slot="saved" data-role="primary" onClick={handleRestore} className={statusBtn('saved')}>
                  Restore
                </button>
                <button type="button" data-slot="rejected" onClick={handlePurge} className={statusBtn('rejected')}>
                  Delete
                </button>
              </>
            ) : (
              <>
                {job.status === 'saved' && job.jdComplete && hasResume && (
                  <button
                    type="button"
                    data-slot="applied"
                    data-role="primary"
                    onClick={() => moveJob(job.id, 'applied')}
                    className={statusBtn('applied')}
                  >
                    Mark as applied
                  </button>
                )}
                {job.status === 'applied' && (
                  <>
                    <button
                      type="button"
                      data-slot="interview"
                      data-role="primary"
                      onClick={() => moveJob(job.id, 'interview')}
                      className={statusBtn('interview')}
                    >
                      Interview
                    </button>
                    <button type="button" data-slot="rejected" onClick={() => moveJob(job.id, 'rejected')} className={statusBtn('rejected')}>
                      Rejected
                    </button>
                  </>
                )}
                {job.status === 'interview' &&
                  !job.notSelected &&
                  job.interviews.length > 0 &&
                  job.interviews.every((round) => round.done) && (
                  <>
                    <button
                      type="button"
                      data-slot="offer"
                      data-role="primary"
                      onClick={() => moveJob(job.id, 'offer')}
                      className={statusBtn('offer')}
                    >
                      Offer
                    </button>
                    {!job.notSelected && (
                      <button
                        type="button"
                        data-role="quiet"
                        onClick={() => updateJob(job.id, { notSelected: true })}
                        className={`${quietBtn} m-action`}
                      >
                        Not selected
                      </button>
                    )}
                  </>
                )}
                {job.status === 'saved' && (
                  <button type="button" data-slot="trash" onClick={handleDelete} className={statusBtn('trash')}>
                    Move to trash
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {job.status === 'interview' && (!job.deletedAt || job.interviews.length > 0) && (
          <div className="mt-6">
            <InterviewList
              interviews={job.interviews}
              readOnly={Boolean(job.deletedAt) || job.notSelected}
              embedded
              onSave={(interviews) =>
                updateJob(job.id, {
                  interviews,
                  ...(interviews.some((round) => !round.done) ? { notSelected: false } : {}),
                })
              }
            />
          </div>
        )}
      </section>

      <section className={panel}>
        <span className="text-sm text-brand-muted">Posting URL</span>
        {hasUrl ? (
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm text-brand-ink underline-offset-4 transition hover:text-brand-primaryDeep hover:underline"
          >
            Open original posting
          </a>
        ) : (
          <p className="mt-1 text-sm text-brand-muted">No URL on this job</p>
        )}
      </section>

      {job.status === 'saved' && !job.deletedAt && (jdIncomplete || editingJd) && (
        <section className={`${panel} space-y-4`}>
          <h2 className="font-display text-base font-semibold text-brand-ink">Job description</h2>

          {!editingJd ? (
            job.needsRescore ? (
              <div className="space-y-3">
                <button
                  type="button"
                  data-role="primary"
                  disabled={savingJd || parsingJd}
                  onClick={() => void saveJd(job.jobDescription)}
                  className={`${pasteBtn} m-action disabled:opacity-60`}
                >
                  {parsingJd || savingJd ? 'Rescoring…' : 'Rescore'}
                </button>
                {jdError && (
                  <p className="text-sm text-[#8a6230]" role="alert">
                    {jdError}
                  </p>
                )}
              </div>
            ) : (
              <button type="button" data-role="primary" onClick={openJdEditor} className={`${quietBtn} m-action`}>
                Paste full job description
              </button>
            )
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-brand-muted">Full job description</span>
                <textarea
                  value={jdDraft}
                  onChange={(e) => setJdDraft(e.target.value)}
                  rows={12}
                  placeholder="Paste the complete job posting here…"
                  className={field}
                />
              </label>
              {jdError && (
                <p className="text-sm text-[#8a6230]" role="alert">
                  {jdError}
                </p>
              )}
              <div className="m-actions flex flex-wrap gap-2">
                <button
                  type="button"
                  data-role="primary"
                  disabled={savingJd || parsingJd}
                  onClick={() => void saveJd(jdDraft)}
                  className={`${pasteBtn} m-action disabled:opacity-60`}
                >
                  {parsingJd ? 'Parsing…' : savingJd ? 'Saving…' : 'Parse, save & rescore'}
                </button>
                <button
                  type="button"
                  data-role="quiet"
                  disabled={savingJd || parsingJd}
                  onClick={() => {
                    setEditingJd(false)
                    setJdError(null)
                  }}
                  className={`${quietBtn} m-action disabled:opacity-60`}
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
        <section className={`${panel} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-brand-ink">Posting overview</h2>
            {job.status === 'saved' && !job.deletedAt && job.jdComplete && !editingJd && (
              <button type="button" onClick={openJdEditor} className={quietBtn}>
                Update
              </button>
            )}
          </div>
          {job.jdSummary && (
            <div>
              <h3 className="mb-1 text-sm text-brand-muted">Summary</h3>
              <p className="text-sm leading-relaxed text-brand-ink">{job.jdSummary}</p>
            </div>
          )}
          {job.extractedSkills.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm text-brand-muted">Skills from the posting</h3>
              <div className="flex flex-wrap gap-2">
                {job.extractedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg bg-[#f4faf8] px-2.5 py-1 text-sm text-brand-ink"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {job.extractedRequirements.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm text-brand-muted">Requirements</h3>
              <ul className="space-y-1 text-sm text-brand-ink">
                {job.extractedRequirements.map((req) => (
                  <li key={req} className="flex gap-2">
                    <span className="text-brand-muted">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.jobDescription ? (
            <div className="border-t border-[#e6eeeb] pt-4">
              {showFullJd ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm text-brand-muted">Full text</h3>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void copyFullJd()} className={quietBtn}>
                        {jdCopied ? 'Copied' : 'Copy'}
                      </button>
                      <button type="button" onClick={() => setShowFullJd(false)} className={quietBtn}>
                        Close
                      </button>
                    </div>
                  </div>
                  <div
                    className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-brand-ink"
                    role="region"
                    aria-label="Job description"
                  >
                    {job.jobDescription}
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  data-role="quiet"
                  onClick={() => setShowFullJd(true)}
                  className={`${quietBtn} m-action`}
                  aria-expanded={false}
                >
                  {jdIncomplete ? 'Show listing preview' : 'Show full job description'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-brand-muted">No description saved yet.</p>
          )}
        </section>
      )}

      <section className={`${panel} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-brand-ink">Personal notes</h2>
          {!editingNotes && (
            <button
              type="button"
              onClick={() => {
                setNotesDraft(notesText)
                setNotesError(null)
                setEditingNotes(true)
              }}
              className={quietBtn}
            >
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-3">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={4}
              placeholder="Recruiter name, follow-ups, anything you want to remember…"
              className={field}
            />
            {notesError && (
              <p className="text-sm text-[#8a6230]" role="alert">
                {notesError}
              </p>
            )}
            <div className="m-actions flex flex-wrap gap-2">
              <button
                type="button"
                data-role="primary"
                disabled={savingNotes}
                onClick={() => void saveNotes()}
                className={`${pasteBtn} m-action disabled:opacity-60`}
              >
                {savingNotes ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                data-role="quiet"
                disabled={savingNotes}
                onClick={() => {
                  setEditingNotes(false)
                  setNotesError(null)
                }}
                className={`${quietBtn} m-action disabled:opacity-60`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : notesText.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">{notesText}</p>
        ) : (
          <p className="text-sm text-brand-muted">No notes yet.</p>
        )}
      </section>

      {showInterviewPrep && <InterviewPrepPanel job={job} />}
      {job.status === 'saved' && !job.deletedAt && <label className="block rounded-2xl border border-[#e6eeeb] bg-white p-5 text-sm text-brand-muted">CV template<select aria-label="CV template" className="mt-2 w-full rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-brand-ink" value={job.cvTrack ?? activeTrack} onChange={(e) => { void updateJob(job.id, { cvTrack: e.target.value, matchScore: null, needsRescore: true }).catch((error) => setJdError(error instanceof Error ? error.message : 'Could not change CV template.')) }}>{!library.cvs[job.cvTrack ?? activeTrack] && <option value={job.cvTrack ?? activeTrack}>Unavailable template — choose a CV</option>}{Object.keys(library.cvs).map((id) => <option key={id} value={id}>{getLabel(id)}</option>)}</select></label>}
      {job.jdComplete && <TailorPanel job={job} />}
    </div>
  )
}
