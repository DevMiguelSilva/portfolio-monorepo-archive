import { useState } from 'react'
import { generateCoverLetter, tailorMasterCv } from '../api/gemini'
import {
  downloadApplicationPack,
  downloadCoverLetterDocx,
  downloadCvDocx,
  openCvPrintWindow,
  tailoredDocFilename,
} from '../lib/docxExport'
import { buildGapReport } from '../lib/matchScore'
import type { GapReport, MasterCv, TailoredDocument } from '../types/cv'
import {
  CV_TRACK_LABELS,
  EMPTY_GAP_REPORT,
  lockSkillGroupsToMaster,
  masterCvSearchText,
} from '../types/cv'
import type { JobApplication } from '../types/job'
import { useMasterCv } from '../hooks/useMasterCv'
import { isMasterCvReadyForAi, masterCvToProfile } from '../lib/cvProfile'
import { useTailoredDocs } from '../hooks/useTailoredDocs'
import { LoadingSpinner } from './LoadingSpinner'

type PanelId = 'gap' | 'tailor' | 'cover'

interface TailorPanelProps {
  job: JobApplication
}

function hasGapContent(gap: GapReport): boolean {
  return gap.matchedKeywords.length > 0 || gap.missingKeywords.length > 0
}

function panelButtonClass(active: boolean, primary = false): string {
  if (primary) {
    return active
      ? 'rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white ring-2 ring-emerald-400/60'
      : 'rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50'
  }
  return active
    ? 'rounded-lg border border-emerald-500 bg-emerald-100/80 px-3 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-200'
    : 'rounded-lg border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-300 disabled:opacity-50'
}

export function TailorPanel({ job }: TailorPanelProps) {
  const { getCv, activeTrack } = useMasterCv()
  const track = job.cvTrack ?? activeTrack
  const masterCv = getCv(track)
  const profile = masterCvToProfile(masterCv)
  const { getForJob, saveDoc } = useTailoredDocs()
  const existing = getForJob(job.id)

  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tailoredCv, setTailoredCv] = useState<MasterCv | null>(existing?.tailoredCv ?? null)
  const [coverLetter, setCoverLetter] = useState(existing?.coverLetter ?? '')
  const [gapReport, setGapReport] = useState<GapReport>(existing?.gapReport ?? EMPTY_GAP_REPORT)
  /** Panels start collapsed even when saved results exist. */
  const [openPanels, setOpenPanels] = useState<Set<PanelId>>(() => new Set())

  const showGap = openPanels.has('gap')
  const showTailor = openPanels.has('tailor')
  const showCover = openPanels.has('cover')

  const setPanelOpen = (id: PanelId, open: boolean) => {
    setOpenPanels((prev) => {
      const next = new Set(prev)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const run = async (action: string, fn: () => Promise<void>) => {
    setLoading(action)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(null)
    }
  }

  const persist = async (cv: MasterCv, letter: string, gap: GapReport) => {
    const doc: TailoredDocument = {
      id: existing?.id ?? crypto.randomUUID(),
      jobApplicationId: job.id,
      masterCvSnapshot: masterCv,
      tailoredCv: cv,
      coverLetter: letter,
      gapReport: gap,
      matchScore: gap.coveragePercent,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveDoc(doc)
  }

  const runGap = () =>
    run('gap', async () => {
      const gap = buildGapReport(
        job.jobDescription,
        job.extractedSkills,
        masterCvSearchText(masterCv)
      )
      setGapReport(gap)
      setPanelOpen('gap', true)
      if (tailoredCv) await persist(tailoredCv, coverLetter, gap)
    })

  const runTailor = () =>
    run('tailor', async () => {
      if (!masterCv.contact.name.trim() && !masterCv.summary.trim()) {
        throw new Error('Fill in your Master CV first')
      }
      const result = await tailorMasterCv(job, masterCv, profile)
      const next: MasterCv = {
        ...masterCv,
        headline: result.headline || masterCv.headline,
        summary: result.summary || masterCv.summary,
        skills: lockSkillGroupsToMaster(masterCv.skills, result.skills),
        experience: result.experience?.length ? result.experience : masterCv.experience,
        projects: result.projects?.length ? result.projects : masterCv.projects,
        education: masterCv.education,
        certifications: masterCv.certifications ?? [],
        updatedAt: new Date().toISOString(),
      }
      const gap = buildGapReport(
        job.jobDescription,
        job.extractedSkills,
        masterCvSearchText(masterCv)
      )
      const letter = result.coverLetter || coverLetter
      setTailoredCv(next)
      setGapReport(gap)
      if (letter) setCoverLetter(letter)
      setPanelOpen('tailor', true)
      await persist(next, letter, gap)
    })

  const runCover = () =>
    run('cover', async () => {
      if (!isMasterCvReadyForAi(masterCv)) {
        throw new Error('Fill in your Master CV first (name + summary or experience)')
      }
      const letter = await generateCoverLetter(job, profile)
      setCoverLetter(letter)
      setPanelOpen('cover', true)
      if (tailoredCv) await persist(tailoredCv, letter, gapReport)
    })

  /** Toggle open/closed when result exists; first click runs generation. */
  const onGapClick = () => {
    if (loading) return
    if (!hasGapContent(gapReport)) {
      void runGap()
      return
    }
    setPanelOpen('gap', !showGap)
  }

  const onTailorClick = () => {
    if (loading) return
    if (!tailoredCv) {
      void runTailor()
      return
    }
    setPanelOpen('tailor', !showTailor)
  }

  const onCoverClick = () => {
    if (loading) return
    if (!coverLetter.trim()) {
      void runCover()
      return
    }
    setPanelOpen('cover', !showCover)
  }

  const handleDocx = () =>
    run('docx', async () => {
      if (!tailoredCv) throw new Error('Tailor the resume first before downloading')
      await downloadCvDocx(tailoredCv, tailoredDocFilename(tailoredCv.contact.name))
    })

  const handlePrint = () =>
    run('print', async () => {
      if (!tailoredCv) throw new Error('Tailor the resume first before printing')
      openCvPrintWindow(tailoredCv, `${job.company} — ${job.role}`)
    })

  const handleCoverDocx = () =>
    run('coverDocx', async () => {
      if (!coverLetter.trim()) throw new Error('Generate a cover letter first')
      await downloadCoverLetterDocx(coverLetter, {
        company: job.company,
        role: job.role,
        candidateName: masterCv.contact.name,
      })
    })

  const handleApplicationPack = () =>
    run('pack', async () => {
      if (!tailoredCv) throw new Error('Tailor the resume first')
      await downloadApplicationPack({
        company: job.company,
        role: job.role,
        tailoredCv,
        coverLetter,
      })
    })

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div>
        <h2 className="text-lg font-bold">ATS tailor & export</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Using{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {CV_TRACK_LABELS[track]}
          </span>{' '}
          master CV. Tailor first, then download from the preview. Click a result button again to
          hide it; use Re-run for a new version.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!loading}
          onClick={onGapClick}
          className={panelButtonClass(showGap)}
        >
          {loading === 'gap' ? 'Checking…' : 'Gap check'}
        </button>
        <button
          type="button"
          disabled={!!loading}
          onClick={onTailorClick}
          className={panelButtonClass(showTailor, true)}
        >
          {loading === 'tailor' ? 'Tailoring…' : 'Tailor from master CV'}
        </button>
        <button
          type="button"
          disabled={!!loading}
          onClick={onCoverClick}
          className={panelButtonClass(showCover)}
        >
          {loading === 'cover' ? 'Writing…' : 'Cover letter'}
        </button>
      </div>

      {loading && <LoadingSpinner label="Working…" />}
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {showGap && hasGapContent(gapReport) && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-track-700 dark:bg-track-800">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Keyword coverage: {gapReport.coveragePercent}%</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!!loading}
                className="text-xs font-medium text-track-accent hover:underline disabled:opacity-50"
                onClick={() => void runGap()}
              >
                Re-run
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:underline"
                onClick={() => setPanelOpen('gap', false)}
              >
                Close
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {gapReport.matchedKeywords.map((k) => (
              <span
                key={`m-${k}`}
                className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                {k}
              </span>
            ))}
            {gapReport.missingKeywords.map((k) => (
              <span
                key={`x-${k}`}
                className="rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                missing: {k}
              </span>
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {gapReport.suggestions.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {showTailor && tailoredCv && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-track-700 dark:bg-track-800">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Tailored preview</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!!loading}
                className="text-xs font-medium text-track-accent hover:underline disabled:opacity-50"
                onClick={() => void runTailor()}
              >
                Re-run new version
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:underline"
                onClick={() => setPanelOpen('tailor', false)}
              >
                Close
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm font-medium">{tailoredCv.headline}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {tailoredCv.summary}
          </p>
          {tailoredCv.experience[0]?.bullets?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {tailoredCv.experience[0].bullets.slice(0, 4).map((b) => (
                <li key={b.id}>• {b.text}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-track-700">
            <button
              type="button"
              disabled={!!loading}
              onClick={handleDocx}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading === 'docx' ? 'Preparing…' : 'Download resume'}
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={handlePrint}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700"
            >
              Print / PDF
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={handleApplicationPack}
              className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-300 disabled:opacity-50"
              title="ZIP folder with resume (+ cover letter if generated)"
            >
              {loading === 'pack' ? 'Packing…' : 'Download application folder'}
            </button>
          </div>
        </div>
      )}

      {showCover && coverLetter.trim() && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-track-700 dark:bg-track-800">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Cover letter</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs text-track-accent hover:underline"
                onClick={() => navigator.clipboard.writeText(coverLetter)}
              >
                Copy
              </button>
              <button
                type="button"
                disabled={!!loading}
                className="text-xs font-medium text-track-accent hover:underline disabled:opacity-50"
                onClick={() => void runCover()}
              >
                Re-run
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:underline"
                onClick={() => setPanelOpen('cover', false)}
              >
                Close
              </button>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {coverLetter}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-track-700">
            <button
              type="button"
              disabled={!!loading}
              onClick={handleCoverDocx}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading === 'coverDocx' ? 'Preparing…' : 'Download cover letter'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
