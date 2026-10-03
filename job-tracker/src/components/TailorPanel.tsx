import { Fragment, useMemo, useRef, useState } from 'react'
import { explainSkill, tailorMasterCv } from '../api/gemini'
import { downloadApplicationPack, openCvPrintWindow } from '../lib/docxExport'
import { buildGapReport } from '../lib/matchScore'
import { getErrorMessage } from '../lib/errorMessage'
import { suggestTransferableSkills, transferCheck, transferDifficultyClass, transferDifficultyLabel } from '../lib/skillTransfer'
import type { GapReport, GapSkill, MasterCv, TailoredDocument } from '../types/cv'
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

const quietBtn =
  'rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-[#f4faf8] disabled:opacity-60'
const pasteBtn =
  'rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-primary hover:bg-brand-mist disabled:opacity-60'
const quietOn =
  'rounded-lg border border-brand-primary bg-brand-mist px-4 py-2 text-sm font-semibold text-brand-ink disabled:opacity-60'
const nested = 'rounded-[1.25rem] border border-[#e6eeeb] bg-[#fafdfc] p-4 sm:p-5'

function panelButtonClass(active: boolean, primary = false): string {
  if (active) return quietOn
  return primary ? pasteBtn : quietBtn
}

function skillKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

const skillLink =
  'text-left font-medium underline-offset-4 transition hover:underline'

const chipHave = 'rounded-lg bg-[#f4faf8] px-2.5 py-1 text-sm text-brand-ink'
const chipAdded = 'rounded-lg border border-brand-primary bg-brand-mist px-2.5 py-1 text-sm text-brand-ink'
const chipMissing = 'rounded-lg bg-[#faf6ef] px-2.5 py-1 text-sm text-[#8a6230]'

function chipClass(state: GapSkill['state']): string {
  if (state === 'have') return chipHave
  if (state === 'added') return chipAdded
  return chipMissing
}

function SkillName({
  skill,
  active,
  added,
  onClick,
}: {
  skill: string
  active: boolean
  added?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={active}
      onClick={onClick}
      className={`${skillLink} text-brand-ink hover:text-brand-primaryDeep ${active || added ? 'underline' : ''}`}
    >
      {skill}
    </button>
  )
}

function SkillAnswer({
  loading,
  error,
  summary,
}: {
  loading: boolean
  error: string | null
  summary: string | null
}) {
  return (
    <div className="mt-2 text-sm leading-relaxed text-brand-ink">
      {loading && <p className="text-brand-muted">Looking it up…</p>}
      {error && (
        <p className="text-red-700" role="alert">
          {error}
        </p>
      )}
      {summary && !loading && <p>{summary}</p>}
    </div>
  )
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
  const [liteDraft, setLiteDraft] = useState(false)

  const claimedSkills = job.claimedSkills ?? []
  const skillsLocked = job.status !== 'saved' || Boolean(job.deletedAt)
  const showGap = openPanels.has('gap')
  const showTailor = openPanels.has('tailor')

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
      `${job.role}\n${job.jobDescription}`,
      job.extractedSkills,
      masterCvSearchText(masterCv),
      claimed
    )

  const run = async (action: string, fn: () => Promise<void>) => {
    setLoading(action)
    setError(null)
    if (action === 'tailor') setLiteDraft(false)
    try {
      await fn()
    } catch (err) {
      setError(getErrorMessage(err, 'Request failed'))
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
      await updateJob(job.id, { matchScore: gap.coveragePercent })
      if (tailoredCv) await persist(tailoredCv, coverLetter, gap)
      setGapReport(gap)
      setPanelOpen('gap', true)
    })

  const toggleClaimedSkill = async (skill: string) => {
    if (skillsLocked) return
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
      setError(getErrorMessage(err, 'Failed to save claimed skill'))
    }
  }

  const runTailor = () =>
    run('tailor', async () => {
      if (skillsLocked && tailoredCv) return
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
      setLiteDraft(Boolean(result.tailorModel?.includes('flash-lite')))
      setTailoredCv(next)
      setGapReport(gap)
      setCoverLetter(letter)
      setPanelOpen('tailor', true)
      setPanelOpen('cover', true)
      await updateJob(job.id, { matchScore: gap.coveragePercent })
      await persist(next, letter, gap)
    })

  /** Fresh check on open, so an older saved report cannot hide languages or role requirements. */
  const onGapClick = () => {
    if (loading) return
    if (showGap) {
      setPanelOpen('gap', false)
      return
    }
    void runGap()
  }

  const explainCache = useRef(new Map<string, string>())
  const explainRequest = useRef(0)
  const [explainSkillName, setExplainSkillName] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)

  const closeExplanation = () => {
    explainRequest.current += 1
    setExplainSkillName(null)
    setExplainLoading(false)
    setExplainError(null)
  }

  const lookupSkill = async (skill: string) => {
    if (explainSkillName === skill) {
      closeExplanation()
      return
    }
    const request = ++explainRequest.current
    setExplainSkillName(skill)
    setExplainError(null)
    const cached = explainCache.current.get(skill)
    if (cached) {
      setExplanation(cached)
      setExplainLoading(false)
      return
    }
    setExplanation(null)
    setExplainLoading(true)
    try {
      const result = (await explainSkill(skill)).trim()
      if (request !== explainRequest.current) return
      if (!result) throw new Error('No explanation came back')
      explainCache.current.set(skill, result)
      setExplanation(result)
    } catch (err) {
      if (request !== explainRequest.current) return
      setExplanation(null)
      setExplainError(getErrorMessage(err, 'Could not look that up'))
    } finally {
      if (request === explainRequest.current) setExplainLoading(false)
    }
  }

  const onTailorClick = () => {
    if (loading) return
    if (!tailoredCv) {
      void runTailor()
      return
    }
    const open = !showTailor
    setPanelOpen('tailor', open)
    setPanelOpen('cover', open)
  }

  const hidePack = () => {
    setPanelOpen('tailor', false)
    setPanelOpen('cover', false)
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
  const gapSkills = useMemo<GapSkill[]>(() => {
    if (gapReport.skills?.length) return gapReport.skills
    return [
      ...gapReport.matchedKeywords.map((skill) => ({ skill, state: 'have' as const })),
      ...claimedKeywords.map((skill) => ({ skill, state: 'added' as const })),
      ...gapReport.missingKeywords.map((skill) => ({ skill, state: 'missing' as const })),
    ]
  }, [gapReport, claimedKeywords])
  const displaySkills = useMemo(
    () => [
      ...gapSkills.filter((item) => item.state === 'have'),
      ...gapSkills.filter((item) => item.state !== 'have'),
    ],
    [gapSkills]
  )
  const addedKeys = useMemo(
    () => new Set(gapSkills.filter((item) => item.state === 'added').map((item) => skillKey(item.skill))),
    [gapSkills]
  )
  const transferSuggestions = useMemo(
    () =>
      suggestTransferableSkills(
        gapSkills.filter((item) => item.state !== 'have').map((item) => item.skill),
        [...masterCvSkillList(masterCv), ...gapReport.matchedKeywords]
      ),
    [gapSkills, gapReport.matchedKeywords, masterCv]
  )

  const baseFor = (row: (typeof transferSuggestions)[number]) => {
    if (row.relatedOwned.length === 0) return row.baseLabel ?? 'Nothing close on your CV.'
    const names = row.relatedOwned.slice(0, 3)
    const listed =
      names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names[0]}, ${names[1]}, and ${names[2]}`
    return `You already use ${listed}.`
  }

  const claimFor = (row: (typeof transferSuggestions)[number]) => {
    if (addedKeys.has(skillKey(row.skill))) {
      return skillsLocked ? (
        <span className="text-sm font-medium text-brand-ink">Added</span>
      ) : (
        <button
          type="button"
          disabled={!!loading}
          onClick={() => void toggleClaimedSkill(row.skill)}
          title="Click to remove it from this resume"
          className="text-sm font-medium text-brand-ink underline-offset-4 transition hover:text-brand-primaryDeep hover:underline disabled:opacity-60"
        >
          Added
        </button>
      )
    }
    return row.checkIt ? (
      skillsLocked ? (
        <span className="text-sm font-medium text-brand-ink">
          {transferCheck(row.difficulty) === 'yes' ? 'Yes' : 'Probably'}
        </span>
      ) : (
        <button
          type="button"
          disabled={!!loading}
          onClick={() => void toggleClaimedSkill(row.skill)}
          className="text-sm font-medium text-brand-ink underline-offset-4 transition hover:text-brand-primaryDeep hover:underline disabled:opacity-60"
        >
          {transferCheck(row.difficulty) === 'yes' ? 'Yes' : 'Probably'}
        </button>
      )
    ) : (
      <span
        className={
          row.difficulty === 'hard'
            ? 'text-sm font-medium text-orange-700'
            : 'text-sm font-medium text-red-700'
        }
      >
        {transferCheck(row.difficulty) === 'unlikely' ? 'Unlikely' : 'No'}
      </span>
    )
  }

  return (
    <div className="space-y-4 rounded-[1.25rem] border border-[#e6eeeb] bg-white p-4 sm:p-6">
      <div>
        <h2 className="font-display text-base font-semibold text-brand-ink">ATS tailor & export</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Using <span className="text-brand-ink">{CV_TRACK_LABELS[track]}</span> master CV. One
          button writes the resume and the cover letter. Click it again to show or hide both.
          {skillsLocked
            ? ' Skill claims stay as they were when you applied.'
            : ' Re-run updates both.'}
        </p>
      </div>

      <div className="m-actions flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          data-role="quiet"
          disabled={!!loading}
          onClick={onGapClick}
          className={`${panelButtonClass(showGap)} m-action w-full sm:w-auto`}
        >
          {loading === 'gap' ? 'Checking…' : 'Gap check'}
        </button>
        <button
          type="button"
          data-role="primary"
          disabled={!!loading}
          onClick={onTailorClick}
          className={`${panelButtonClass(showTailor, true)} m-action w-full sm:w-auto`}
        >
          {loading === 'tailor' ? 'Tailoring…' : tailoredCv ? (showTailor ? 'Hide files' : 'See files') : 'Tailor'}
        </button>
      </div>

      {loading && <LoadingSpinner label="Working…" />}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {liteDraft && !error && (
        <p className="text-sm text-[#8a6230]">
          Draft written with the lighter model because the main models were busy. Tailor again in a
          minute for a stronger version.
        </p>
      )}

      {showGap && hasGapContent(gapReport) && (
        <div className={nested}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm text-brand-muted">
              Keyword coverage: {gapReport.coveragePercent}%
            </h3>
            <button type="button" className={quietBtn} onClick={() => setPanelOpen('gap', false)}>
              Close
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#f4faf8] ring-1 ring-[#dce8e4]" />
              On your CV
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-brand-primary bg-brand-mist" />
              Added
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#faf6ef] ring-1 ring-[#e6d3b8]" />
              Not on this CV
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {displaySkills.map((item) => {
              const className = `${chipClass(item.state)} disabled:opacity-60`
              if (item.state === 'have' || skillsLocked) {
                return (
                  <span key={item.skill} className={className}>
                    {item.skill}
                  </span>
                )
              }
              return (
                <button
                  key={item.skill}
                  type="button"
                  disabled={!!loading}
                  onClick={() => void toggleClaimedSkill(item.skill)}
                  title={item.state === 'added' ? 'Click to remove it from this resume' : 'Click if you know this skill'}
                  className={className}
                >
                  {item.skill}
                </button>
              )
            })}
          </div>
          <ul className="mt-3 space-y-1 text-sm text-brand-ink">
            {gapReport.suggestions
              .filter((s) => !(skillsLocked && s.startsWith('Warm chips')))
              .map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-brand-muted">•</span>
                {s}
              </li>
            ))}
          </ul>
          {transferSuggestions.length > 0 && (
            <div className="mt-4 border-t border-[#e6eeeb] pt-4">
              <h4 className="text-sm font-medium text-brand-ink">Compared with your CV</h4>
              <p className="mt-1 hidden text-sm text-brand-muted sm:block">
                How hard it is to become proficient, based on what is already on your CV. A check
                stays in this list.
              </p>
              <ul className="mt-2 divide-y divide-[#e6eeeb] sm:hidden">
                {transferSuggestions.map((row) => (
                  <li key={row.skill} className="py-3">
                    <SkillName
                      skill={row.skill}
                      added={addedKeys.has(skillKey(row.skill))}
                      active={explainSkillName === row.skill}
                      onClick={() => void lookupSkill(row.skill)}
                    />
                    <p className="mt-1 text-sm">
                      <span className={transferDifficultyClass(row.difficulty)}>
                        {transferDifficultyLabel(row.difficulty)}
                      </span>
                      <span className="text-brand-muted"> · </span>
                      {claimFor(row)}
                    </p>
                    <p className="mt-0.5 text-sm text-brand-muted">{baseFor(row)}</p>
                    {explainSkillName === row.skill && (
                      <SkillAnswer
                        loading={explainLoading}
                        error={explainError}
                        summary={explanation}
                      />
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-3 hidden sm:block">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[42%]" />
                    <col className="w-[16%]" />
                    <col className="w-[18%]" />
                  </colgroup>
                  <thead className="text-xs text-brand-muted">
                    <tr>
                      <th className="pb-2 pr-3 font-medium">Skill</th>
                      <th className="pb-2 pr-3 font-medium">Your base</th>
                      <th className="pb-2 pr-3 font-medium">From zero</th>
                      <th className="w-[7.5rem] pb-2 font-medium">Claim?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6eeeb]">
                    {transferSuggestions.map((row) => (
                      <Fragment key={row.skill}>
                        <tr>
                          <td className="py-2 pr-3 font-medium text-brand-ink">
                            <SkillName
                              skill={row.skill}
                              added={addedKeys.has(skillKey(row.skill))}
                              active={explainSkillName === row.skill}
                              onClick={() => void lookupSkill(row.skill)}
                            />
                          </td>
                          <td className="py-2 pr-3 text-brand-muted">{baseFor(row)}</td>
                          <td className="py-2 pr-3">
                            <span className={transferDifficultyClass(row.difficulty)}>
                              {transferDifficultyLabel(row.difficulty)}
                            </span>
                          </td>
                          <td className="w-[7.5rem] whitespace-nowrap py-2">{claimFor(row)}</td>
                        </tr>
                        {explainSkillName === row.skill && (
                          <tr>
                            <td colSpan={4} className="pb-3">
                              <SkillAnswer
                                loading={explainLoading}
                                error={explainError}
                                summary={explanation}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showTailor && tailoredCv && (
        <div className={nested}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm text-brand-muted">Tailored preview</h3>
            <div className="flex items-center gap-2">
              {!skillsLocked && (
                <button
                  type="button"
                  disabled={!!loading}
                  className={quietBtn}
                  onClick={() => void runTailor()}
                >
                  Re-run
                </button>
              )}
              <button
                type="button"
                className={quietBtn}
                onClick={hidePack}
              >
                Close
              </button>
            </div>
          </div>
          <p className="text-sm font-medium text-brand-ink">{tailoredCv.headline}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">
            {tailoredCv.summary}
          </p>
          {tailoredCv.experience[0]?.bullets?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-brand-ink">
              {tailoredCv.experience[0].bullets.slice(0, 4).map((b) => (
                <li key={b.id} className="flex gap-2">
                  <span className="text-brand-muted">•</span>
                  {b.text}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="m-actions mt-4 flex flex-wrap gap-2 border-t border-[#e6eeeb] pt-4">
            <button
              type="button"
              data-role="primary"
              disabled={!!loading}
              onClick={handleApplicationPack}
              className={`${pasteBtn} m-action`}
              title="ZIP folder with resume and cover letter"
            >
              {loading === 'pack' ? 'Packing…' : 'Download application folder'}
            </button>
            <button
              type="button"
              data-role="quiet"
              disabled={!!loading}
              onClick={handlePrint}
              className={`${quietBtn} m-action`}
            >
              {loading === 'print' ? 'Opening…' : 'Print / PDF'}
            </button>
          </div>
        </div>
      )}

      {showTailor && (
        <div className={nested}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm text-brand-muted">Cover letter</h3>
            {coverLetter.trim() && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={quietBtn}
                  onClick={() => navigator.clipboard.writeText(coverLetter)}
                >
                  Copy
                </button>
                <button type="button" className={quietBtn} onClick={hidePack}>
                  Close
                </button>
              </div>
            )}
          </div>
          {coverLetter.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">{coverLetter}</p>
          ) : (
            <p className="text-sm text-brand-muted">
              No cover letter saved with this resume. Re-run creates the resume and the letter together.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
