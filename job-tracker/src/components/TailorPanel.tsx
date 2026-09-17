import { useMemo, useState } from 'react'
import { tailorMasterCv } from '../api/gemini'
import { downloadApplicationPack, openCvPrintWindow } from '../lib/docxExport'
import { buildGapReport } from '../lib/matchScore'
import { suggestTransferableSkills, transferCheck, transferDifficultyClass, transferDifficultyLabel } from '../lib/skillTransfer'
import type { GapReport, MasterCv, TailoredDocument } from '../types/cv'
import {
  CV_TRACK_LABELS,
  EMPTY_GAP_REPORT,
  lockSkillGroupsToMaster,
  masterCvSearchText,
  masterCvSkillList,
  mergeClaimedSkillsIntoGroups,
} from '../types/cv'
import type { JobApplication } from '../types/job'
import { useJobs } from '../hooks/useJobs'
import { useMasterCv } from '../hooks/useMasterCv'
import { masterCvToProfile } from '../lib/cvProfile'
import { useTailoredDocs } from '../hooks/useTailoredDocs'
import { LoadingSpinner } from './LoadingSpinner'

type PanelId = 'gap' | 'tailor' | 'cover'

interface TailorPanelProps {
  job: JobApplication
}

function hasGapContent(gap: GapReport): boolean {
  return (
    gap.matchedKeywords.length > 0 ||
    (gap.claimedKeywords?.length ?? 0) > 0 ||
    gap.missingKeywords.length > 0
  )
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

function skillKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function TailorPanel({ job }: TailorPanelProps) {
  const { updateJob } = useJobs()
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
  const [gapReport, setGapReport] = useState<GapReport>(() => ({
    ...EMPTY_GAP_REPORT,
    ...(existing?.gapReport ?? {}),
    claimedKeywords: existing?.gapReport?.claimedKeywords ?? [],
  }))
  /** Panels start collapsed even when saved results exist. */
  const [openPanels, setOpenPanels] = useState<Set<PanelId>>(() => new Set())

  const claimedSkills = job.claimedSkills ?? []
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

  const computeGap = (claimed: string[]) =>
    buildGapReport(
      job.jobDescription,
      job.extractedSkills,
      masterCvSearchText(masterCv),
      claimed
    )

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
      const gap = computeGap(claimedSkills)
      setGapReport(gap)
      setPanelOpen('gap', true)
      await updateJob(job.id, { matchScore: gap.coveragePercent })
      if (tailoredCv) await persist(tailoredCv, coverLetter, gap)
    })

  const toggleClaimedSkill = async (skill: string) => {
    const key = skillKey(skill)
    const nextClaimed = claimedSkills.some((s) => skillKey(s) === key)
      ? claimedSkills.filter((s) => skillKey(s) !== key)
      : [...claimedSkills, skill]
    const gap = computeGap(nextClaimed)
    setGapReport(gap)
    setPanelOpen('gap', true)
    try {
      await updateJob(job.id, {
        claimedSkills: nextClaimed,
        matchScore: gap.coveragePercent,
      })
      if (tailoredCv) await persist(tailoredCv, coverLetter, gap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save claimed skill')
    }
  }

  const runTailor = () =>
    run('tailor', async () => {
      if (!masterCv.contact.name.trim() && !masterCv.summary.trim()) {
        throw new Error('Fill in your Master CV first')
      }
      const jobForAi: JobApplication = { ...job, claimedSkills }
      const result = await tailorMasterCv(jobForAi, masterCv, profile)
      const locked = lockSkillGroupsToMaster(masterCv.skills, result.skills)
      const next: MasterCv = {
        ...masterCv,
        headline: result.headline || masterCv.headline,
        summary: result.summary || masterCv.summary,
        skills: mergeClaimedSkillsIntoGroups(locked, claimedSkills),
        experience: result.experience?.length ? result.experience : masterCv.experience,
        projects: result.projects?.length ? result.projects : masterCv.projects,
        education: masterCv.education,
        certifications: masterCv.certifications ?? [],
        updatedAt: new Date().toISOString(),
      }
      const gap = computeGap(claimedSkills)
      const letter = (result.coverLetter || '').trim()
      if (!letter) {
        throw new Error('Tailor did not return a cover letter — try Re-run.')
      }
      setTailoredCv(next)
      setGapReport(gap)
      setCoverLetter(letter)
      setPanelOpen('tailor', true)
      setPanelOpen('cover', true)
      await updateJob(job.id, { matchScore: gap.coveragePercent })
      await persist(next, letter, gap)
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
      setError('Tailor the resume first — cover letter is created with it.')
      return
    }
    setPanelOpen('cover', !showCover)
  }

  const handlePrint = () =>
    run('print', async () => {
      if (!tailoredCv) throw new Error('Tailor the resume first before printing')
      openCvPrintWindow(tailoredCv, `${job.company} — ${job.role}`)
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

  const claimedKeywords = gapReport.claimedKeywords ?? []
  const transferSuggestions = useMemo(
    () =>
      suggestTransferableSkills(gapReport.missingKeywords, [
        ...masterCvSkillList(masterCv),
        ...gapReport.matchedKeywords,
      ]),
    [gapReport.missingKeywords, gapReport.matchedKeywords, masterCv]
  )

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div>
        <h2 className="text-lg font-bold">ATS tailor & export</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Using{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {CV_TRACK_LABELS[track]}
          </span>{' '}
          master CV. Tailor creates the resume and cover letter together. Click a result button
          again to hide it; Re-run on the tailored preview updates both.
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
          {loading === 'tailor' ? 'Tailoring…' : 'Tailor resume + cover letter'}
        </button>
        <button
          type="button"
          disabled={!!loading || !coverLetter.trim()}
          onClick={onCoverClick}
          className={panelButtonClass(showCover)}
          title={
            coverLetter.trim()
              ? 'Show or hide the cover letter from tailor'
              : 'Created automatically when you tailor'
          }
        >
          Cover letter
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
            {claimedKeywords.map((k) => (
              <button
                key={`c-${k}`}
                type="button"
                disabled={!!loading}
                onClick={() => void toggleClaimedSkill(k)}
                title="Click to unconfirm"
                className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 ring-1 ring-sky-300/80 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-700 disabled:opacity-50"
              >
                {k}
              </button>
            ))}
            {gapReport.missingKeywords.map((k) => (
              <button
                key={`x-${k}`}
                type="button"
                disabled={!!loading}
                onClick={() => void toggleClaimedSkill(k)}
                title="Click if you know this skill"
                className="rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-transparent hover:ring-amber-400 dark:bg-amber-950/40 dark:text-amber-300 disabled:opacity-50"
              >
                {k}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {gapReport.suggestions.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
          {transferSuggestions.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-track-700">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Missing vs your CV
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Every amber skill is scored two ways — a hop from your CV, and how hard it is from
                zero. The easier one wins. Word, Jira, and similar tools are never a big gap just
                because they are not listed. Hard and big gap are for real stacks that take serious
                study.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[28rem] w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="pb-2 pr-3 font-medium">Missing skill</th>
                      <th className="pb-2 pr-3 font-medium">Your base</th>
                      <th className="pb-2 pr-3 font-medium">From zero</th>
                      <th className="pb-2 font-medium">Check it?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-track-700">
                    {transferSuggestions.map((row) => (
                      <tr key={row.skill}>
                        <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-100">
                          {row.skill}
                        </td>
                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                          {row.relatedOwned.length > 0
                            ? row.relatedOwned.join(', ')
                            : row.baseLabel ?? 'No close skill on this CV'}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={transferDifficultyClass(row.difficulty)}>
                            {transferDifficultyLabel(row.difficulty)}
                          </span>
                        </td>
                        <td className="py-2">
                          {row.checkIt ? (
                            <button
                              type="button"
                              disabled={!!loading}
                              onClick={() => void toggleClaimedSkill(row.skill)}
                              className="text-xs font-semibold text-track-accent hover:underline disabled:opacity-50"
                            >
                              {transferCheck(row.difficulty) === 'yes'
                                ? 'Yes — check'
                                : 'Probably — check'}
                            </button>
                          ) : (
                            <span
                              className={
                                row.difficulty === 'hard'
                                  ? 'text-xs font-semibold text-orange-700 dark:text-orange-300'
                                  : 'text-xs font-semibold text-rose-700 dark:text-rose-300'
                              }
                            >
                              {transferCheck(row.difficulty) === 'unlikely' ? 'Unlikely' : 'No'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                Re-run
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
              onClick={handleApplicationPack}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              title="ZIP folder with resume and cover letter"
            >
              {loading === 'pack' ? 'Packing…' : 'Download application folder'}
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={handlePrint}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 disabled:opacity-50"
            >
              {loading === 'print' ? 'Opening…' : 'Print / PDF'}
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
        </div>
      )}
    </div>
  )
}
