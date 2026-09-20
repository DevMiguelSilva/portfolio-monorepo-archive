import { downloadCvDocx, tailoredDocFilename } from '../lib/docxExport'
import type { JobApplication } from '../types/job'
import { useTailoredDocs } from '../hooks/useTailoredDocs'

interface InterviewPrepPanelProps {
  job: JobApplication
}

/** Shown only when status is Interview — tailored resume, not a second overview. */
export function InterviewPrepPanel({ job }: InterviewPrepPanelProps) {
  const { getForJob } = useTailoredDocs()
  const tailored = getForJob(job.id)

  const quietBtn =
    'rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-[#f4faf8]'

  return (
    <section className="space-y-4 rounded-[1.25rem] border border-[#e6eeeb] bg-white p-6">
      <div>
        <h2 className="font-display text-base font-semibold text-brand-ink">Interview prep</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Tailored resume for this call. Interview dates and your comments stay in the sections above.
        </p>
      </div>

      {tailored ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm text-brand-muted">Tailored resume</h3>
            <button
              type="button"
              className={quietBtn}
              onClick={() =>
                downloadCvDocx(
                  tailored.tailoredCv,
                  tailoredDocFilename(tailored.tailoredCv.contact.name)
                )
              }
            >
              Download DOCX
            </button>
          </div>
          <p className="text-sm font-medium text-brand-ink">{tailored.tailoredCv.headline}</p>
          <p className="text-sm leading-relaxed text-brand-ink">{tailored.tailoredCv.summary}</p>
          {tailored.gapReport && (
            <p className="text-sm text-brand-muted">
              Coverage: {tailored.gapReport.coveragePercent}% · matched{' '}
              {tailored.gapReport.matchedKeywords.slice(0, 6).join(', ')}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-brand-muted">
          No tailored CV yet — use Tailor below before the interview if you need one.
        </p>
      )}
    </section>
  )
}
