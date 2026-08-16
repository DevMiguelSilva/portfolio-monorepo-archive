import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseResumeText } from '../api/gemini'
import { useMasterCv } from '../hooks/useMasterCv'
import {
  extractTextFromResumeFile,
  mergeParsedCv,
  sparseCvFromText,
  splitEducationAndCerts,
} from '../lib/resumeImport'
import {
  CV_TRACK_LABELS,
  CV_TRACKS,
  type CvCertification,
  type CvEducation,
  type CvExperience,
  type CvProject,
  type CvSkillGroup,
  type CvTrack,
  type MasterCv,
} from '../types/cv'

export function MasterCvPage() {
  const {
    library,
    activeTrack,
    loading,
    setActiveTrack,
    getCv,
    saveTrackCv,
    saveAttachment,
  } = useMasterCv()
  const [editingTrack, setEditingTrack] = useState<CvTrack>(activeTrack)
  const [draft, setDraft] = useState<MasterCv | null>(null)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importNote, setImportNote] = useState<string | null>(null)

  useEffect(() => {
    setEditingTrack(activeTrack)
    setDraft(null)
  }, [activeTrack])

  const cv = draft ?? getCv(editingTrack)
  const attachment = library.attachments[editingTrack]
  const setCv = (next: MasterCv) => setDraft(next)

  const switchTrack = async (track: CvTrack) => {
    if (draft) {
      await saveTrackCv(editingTrack, draft)
      setDraft(null)
    }
    setEditingTrack(track)
    await setActiveTrack(track)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveTrackCv(editingTrack, cv)
    setDraft(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    setImporting(true)
    setImportError(null)
    setImportNote(null)
    try {
      const text = await extractTextFromResumeFile(file)
      if (!text.trim()) throw new Error('No text could be extracted from that file.')

      await saveAttachment(editingTrack, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        extractedText: text,
      })

      let next = sparseCvFromText(text, getCv(editingTrack))
      try {
        const parsed = await parseResumeText(text, editingTrack)
        next = mergeParsedCv(getCv(editingTrack), parsed)
        setImportNote('Resume imported into the form. Review fields and save when ready.')
      } catch {
        setImportNote(
          'Text extracted and saved in Summary. AI structuring failed — edit the form manually or try again later.'
        )
      }

      setDraft(next)
      await saveTrackCv(editingTrack, next)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading master CV…</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/" className="text-sm text-slate-500 hover:text-track-accent dark:text-slate-400">
          ← Back to board
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Master CVs</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Keep two templates — Front-end and Power Platform. Upload a .docx/.txt to fill the form,
          then edit anytime. Inbox matching uses the track on each saved search (or auto-picks the
          best).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CV_TRACKS.map((track) => (
          <button
            key={track}
            type="button"
            onClick={() => switchTrack(track)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              editingTrack === track
                ? 'bg-track-accent text-white'
                : 'border border-slate-300 text-slate-600 dark:border-track-700 dark:text-slate-300'
            }`}
          >
            {CV_TRACK_LABELS[track]}
            {library.activeTrack === track && (
              <span className="ml-2 text-xs opacity-80">active</span>
            )}
          </button>
        ))}
      </div>

      <section className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-white p-5 dark:border-track-700 dark:bg-track-800">
        <h2 className="font-semibold">Attach resume → fill form</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload your {CV_TRACK_LABELS[editingTrack]} resume (.docx or .txt). We extract text, store
          the attachment metadata, and map what we can into the editable fields below.
        </p>
        <input
          type="file"
          accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={importing}
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-track-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        {attachment && (
          <p className="text-xs text-slate-500">
            Stored: <span className="font-medium">{attachment.fileName}</span> ·{' '}
            {new Date(attachment.uploadedAt).toLocaleString()} ·{' '}
            {attachment.extractedText.length.toLocaleString()} chars extracted
          </p>
        )}
        {importing && <p className="text-sm text-track-accent">Importing…</p>}
        {importError && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {importError}
          </p>
        )}
        {importNote && (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            {importNote}
          </p>
        )}
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
          <h2 className="font-semibold">Contact · {CV_TRACK_LABELS[editingTrack]}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['name', 'Full name'],
                ['email', 'Email'],
                ['phone', 'Phone'],
                ['location', 'Location'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="font-medium">{label}</span>
                <input
                  value={cv.contact[key]}
                  onChange={(e) =>
                    setCv({ ...cv, contact: { ...cv.contact, [key]: e.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-track-700 dark:bg-track-900"
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            <span className="font-medium">Links (comma-separated)</span>
            <input
              value={cv.contact.links.join(', ')}
              onChange={(e) =>
                setCv({
                  ...cv,
                  contact: {
                    ...cv.contact,
                    links: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-track-700 dark:bg-track-900"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Headline</span>
            <input
              value={cv.headline}
              onChange={(e) => setCv({ ...cv, headline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-track-700 dark:bg-track-900"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Summary</span>
            <textarea
              value={cv.summary}
              onChange={(e) => setCv({ ...cv, summary: e.target.value })}
              rows={5}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-track-700 dark:bg-track-900"
            />
          </label>
        </section>

        <SkillGroupsEditor skills={cv.skills} onChange={(skills) => setCv({ ...cv, skills })} />
        <ExperienceEditor
          experience={cv.experience}
          onChange={(experience) => setCv({ ...cv, experience })}
        />
        <ProjectsEditor projects={cv.projects} onChange={(projects) => setCv({ ...cv, projects })} />
        <EducationEditor
          education={cv.education}
          certifications={cv.certifications ?? []}
          onChange={(education) => setCv({ ...cv, education })}
          onSplitCerts={() => {
            const split = splitEducationAndCerts(cv.education, cv.certifications ?? [])
            setCv({ ...cv, education: split.education, certifications: split.certifications })
          }}
        />
        <CertificationsEditor
          certifications={cv.certifications ?? []}
          onChange={(certifications) => setCv({ ...cv, certifications })}
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-track-accent py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          {saved ? '✓ Saved' : `Save ${CV_TRACK_LABELS[editingTrack]} CV`}
        </button>
      </form>
    </div>
  )
}

function SkillGroupsEditor({
  skills,
  onChange,
}: {
  skills: CvSkillGroup[]
  onChange: (skills: CvSkillGroup[]) => void
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Skills</h2>
        <button
          type="button"
          className="text-sm text-track-accent hover:underline"
          onClick={() =>
            onChange([...skills, { id: crypto.randomUUID(), group: 'Group', items: [] }])
          }
        >
          + Group
        </button>
      </div>
      {skills.map((group, index) => (
        <div key={group.id} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-track-700">
          <div className="flex gap-2">
            <input
              value={group.group}
              onChange={(e) => {
                const next = [...skills]
                next[index] = { ...group, group: e.target.value }
                onChange(next)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
            <button
              type="button"
              className="text-xs text-red-500"
              onClick={() => onChange(skills.filter((g) => g.id !== group.id))}
            >
              Remove
            </button>
          </div>
          <input
            value={group.items.join(', ')}
            onChange={(e) => {
              const next = [...skills]
              next[index] = {
                ...group,
                items: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              }
              onChange(next)
            }}
            placeholder="React, TypeScript, …"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
          />
        </div>
      ))}
    </section>
  )
}

function RemoveCardButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-track-700 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path
          fillRule="evenodd"
          d="M8.75 3a.75.75 0 0 0-.75.75V5H5.5a.75.75 0 0 0 0 1.5h.59l.55 9.07A1.75 1.75 0 0 0 8.38 17h3.24a1.75 1.75 0 0 0 1.74-1.43l.55-9.07h.59a.75.75 0 0 0 0-1.5H12V3.75A.75.75 0 0 0 11.25 3h-2.5ZM10 6.5c-.28 0-.52.2-.57.47l-.7 4.5a.575.575 0 1 0 1.14.18l.7-4.5A.575.575 0 0 0 10 6.5Zm2.07.47a.575.575 0 0 0-1.14-.18l-.7 4.5a.575.575 0 1 0 1.14.18l.7-4.5Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
}

function ExperienceEditor({
  experience,
  onChange,
}: {
  experience: CvExperience[]
  onChange: (experience: CvExperience[]) => void
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Experience</h2>
        <button
          type="button"
          className="text-sm text-track-accent hover:underline"
          onClick={() =>
            onChange([
              ...experience,
              {
                id: crypto.randomUUID(),
                company: '',
                title: '',
                location: '',
                start: '',
                end: '',
                current: false,
                bullets: [{ id: crypto.randomUUID(), text: '', tags: [] }],
              },
            ])
          }
        >
          + Role
        </button>
      </div>
      {experience.map((exp, index) => (
        <div key={exp.id} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-track-700">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              Role {index + 1}
            </p>
            <RemoveCardButton
              label="Remove role"
              onClick={() => onChange(experience.filter((e) => e.id !== exp.id))}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={exp.title}
              placeholder="Title"
              onChange={(e) => {
                const next = [...experience]
                next[index] = { ...exp, title: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
            <input
              value={exp.company}
              placeholder="Company"
              onChange={(e) => {
                const next = [...experience]
                next[index] = { ...exp, company: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
            <input
              value={exp.location}
              placeholder="Location"
              onChange={(e) => {
                const next = [...experience]
                next[index] = { ...exp, location: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
            <div className="flex gap-2">
              <input
                value={exp.start}
                placeholder="Start"
                onChange={(e) => {
                  const next = [...experience]
                  next[index] = { ...exp, start: e.target.value }
                  onChange(next)
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
              />
              <input
                value={exp.end}
                placeholder="End"
                disabled={exp.current}
                onChange={(e) => {
                  const next = [...experience]
                  next[index] = { ...exp, end: e.target.value }
                  onChange(next)
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={exp.current}
              onChange={(e) => {
                const next = [...experience]
                next[index] = { ...exp, current: e.target.checked }
                onChange(next)
              }}
            />
            Current role
          </label>
          <textarea
            value={exp.bullets.map((b) => b.text).join('\n')}
            onChange={(e) => {
              const next = [...experience]
              next[index] = {
                ...exp,
                bullets: e.target.value
                  .split('\n')
                  .filter(Boolean)
                  .map((text) => ({
                    id: crypto.randomUUID(),
                    text,
                    tags: [],
                  })),
              }
              onChange(next)
            }}
            rows={4}
            placeholder="One bullet per line"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
          />
        </div>
      ))}
    </section>
  )
}

function ProjectsEditor({
  projects,
  onChange,
}: {
  projects: CvProject[]
  onChange: (projects: CvProject[]) => void
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Projects</h2>
        <button
          type="button"
          className="text-sm text-track-accent hover:underline"
          onClick={() =>
            onChange([
              ...projects,
              {
                id: crypto.randomUUID(),
                name: '',
                url: '',
                bullets: [{ id: crypto.randomUUID(), text: '', tags: [] }],
              },
            ])
          }
        >
          + Project
        </button>
      </div>
      {projects.map((project, index) => (
        <div key={project.id} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-track-700">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              Project {index + 1}
            </p>
            <RemoveCardButton
              label="Remove project"
              onClick={() => onChange(projects.filter((p) => p.id !== project.id))}
            />
          </div>
          <input
            value={project.name}
            placeholder="Project name"
            onChange={(e) => {
              const next = [...projects]
              next[index] = { ...project, name: e.target.value }
              onChange(next)
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
          />
          <input
            value={project.url}
            placeholder="URL"
            onChange={(e) => {
              const next = [...projects]
              next[index] = { ...project, url: e.target.value }
              onChange(next)
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
          />
          <textarea
            value={project.bullets.map((b) => b.text).join('\n')}
            onChange={(e) => {
              const next = [...projects]
              next[index] = {
                ...project,
                bullets: e.target.value
                  .split('\n')
                  .filter(Boolean)
                  .map((text) => ({
                    id: crypto.randomUUID(),
                    text,
                    tags: [],
                  })),
              }
              onChange(next)
            }}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
          />
        </div>
      ))}
    </section>
  )
}

function EducationEditor({
  education,
  certifications,
  onChange,
  onSplitCerts,
}: {
  education: CvEducation[]
  certifications: CvCertification[]
  onChange: (education: CvEducation[]) => void
  onSplitCerts: () => void
}) {
  const preview = splitEducationAndCerts(education, certifications)
  const movable = education.length - preview.education.length

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Education</h2>
          <p className="text-xs text-slate-400">Degrees and diplomas only — certs go below.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {movable > 0 && (
            <button
              type="button"
              className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-300"
              onClick={onSplitCerts}
            >
              Move {movable} cert{movable === 1 ? '' : 's'} → Certifications
            </button>
          )}
          <button
            type="button"
            className="text-sm text-track-accent hover:underline"
            onClick={() =>
              onChange([
                ...education,
                { id: crypto.randomUUID(), school: '', degree: '', start: '', end: '' },
              ])
            }
          >
            + Education
          </button>
        </div>
      </div>
      {education.map((edu, index) => (
        <div key={edu.id} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-track-700">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              Education {index + 1}
            </p>
            <RemoveCardButton
              label="Remove education"
              onClick={() => onChange(education.filter((e) => e.id !== edu.id))}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={edu.degree}
              placeholder="Degree / Diploma"
              onChange={(e) => {
                const next = [...education]
                next[index] = { ...edu, degree: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
            <input
              value={edu.school}
              placeholder="School"
              onChange={(e) => {
                const next = [...education]
                next[index] = { ...edu, school: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
            <input
              value={edu.start ?? ''}
              placeholder="Start (e.g. September 2022)"
              onChange={(e) => {
                const next = [...education]
                next[index] = { ...edu, start: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
            <input
              value={edu.end ?? ''}
              placeholder="End (e.g. July 2024)"
              onChange={(e) => {
                const next = [...education]
                next[index] = { ...edu, end: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
          </div>
        </div>
      ))}
    </section>
  )
}

function CertificationsEditor({
  certifications,
  onChange,
}: {
  certifications: CvCertification[]
  onChange: (certifications: CvCertification[]) => void
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-track-700 dark:bg-track-800">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Certifications</h2>
          <p className="text-xs text-slate-400">Microsoft, cloud, and other professional certs.</p>
        </div>
        <button
          type="button"
          className="text-sm text-track-accent hover:underline"
          onClick={() =>
            onChange([
              ...certifications,
              { id: crypto.randomUUID(), name: '', issuer: '', year: '' },
            ])
          }
        >
          + Certification
        </button>
      </div>
      {certifications.map((cert, index) => (
        <div key={cert.id} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-track-700">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              Certification {index + 1}
            </p>
            <RemoveCardButton
              label="Remove certification"
              onClick={() => onChange(certifications.filter((c) => c.id !== cert.id))}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={cert.name}
              placeholder="Name (e.g. Power Platform Fundamentals)"
              onChange={(e) => {
                const next = [...certifications]
                next[index] = { ...cert, name: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900 sm:col-span-1"
            />
            <input
              value={cert.issuer}
              placeholder="Issuer / code (e.g. Microsoft · PL-900)"
              onChange={(e) => {
                const next = [...certifications]
                next[index] = { ...cert, issuer: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
            <input
              value={cert.year}
              placeholder="Year / date"
              onChange={(e) => {
                const next = [...certifications]
                next[index] = { ...cert, year: e.target.value }
                onChange(next)
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-track-700 dark:bg-track-900"
            />
          </div>
        </div>
      ))}
    </section>
  )
}
