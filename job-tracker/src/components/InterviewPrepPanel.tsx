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

  return (
    <section className="space-y-4 rounded-xl border border-amber-300 bg-amber-50/50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
      <div>
        <h2 className="text-lg font-bold">Interview prep</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tailored resume for this call. Interview dates and your comments stay in the sections above.
        </p>
      </div>

      {tailored ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Tailored resume</h3>
            <button
              type="button"
              className="text-sm font-medium text-track-accent hover:underline"
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
          <p className="text-sm font-medium">{tailored.tailoredCv.headline}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {tailored.tailoredCv.summary}
          </p>
          {tailored.gapReport && (
            <p className="text-xs text-slate-500">
              Coverage: {tailored.gapReport.coveragePercent}% · matched{' '}
              {tailored.gapReport.matchedKeywords.slice(0, 6).join(', ')}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No tailored CV yet — use Tailor CV below before the interview if you need one.
        </p>
      )}
    </section>
  )
}
