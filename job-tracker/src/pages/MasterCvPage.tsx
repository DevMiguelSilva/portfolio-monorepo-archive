import { useEffect, useRef, useState } from 'react'
import { useJobs } from '../hooks/useJobs'
import { useSavedSearches } from '../hooks/useSavedSearches'
import { templateReferences } from '../lib/cvLibrary'
import { getErrorMessage } from '../lib/errorMessage'
import { parseResumeText } from '../api/gemini'
import { useMasterCv } from '../hooks/useMasterCv'
import {
  extractTextFromResumeFile,
  mergeParsedCv,
  sparseCvFromText,
  splitEducationAndCerts,
} from '../lib/resumeImport'
import {
  type ResumeAttachment,
  type CvCertification,
  type CvEducation,
  type CvExperience,
  type CvProject,
  type CvSkillGroup,
  type CvTrack,
  type MasterCv,
} from '../types/cv'

const card = 'min-w-0 space-y-4 rounded-2xl border border-[#e6eeeb] bg-white p-5 sm:p-6'
const button = 'rounded-lg border border-[#e6eeeb] bg-white px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-mist disabled:opacity-50'
const field = 'w-full min-w-0 rounded-lg border border-[#e6eeeb] bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-primary'

export function MasterCvPage() {
  const {
    library,
    activeTrack,
    loading,
    setActiveTrack,
    getCv,
    saveTemplate, getLabel, addTemplate, renameTemplate, deleteTemplate, loadError, reload,
  } = useMasterCv()
  const [editingTrack, setEditingTrack] = useState<CvTrack>(activeTrack)
  const [draft, setDraft] = useState<MasterCv | null>(null)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importNote, setImportNote] = useState<string | null>(null)
  const { jobs } = useJobs()
  const { searches } = useSavedSearches()
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [rename, setRename] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [replacement, setReplacement] = useState('')
  const [pendingAttachment, setPendingAttachment] = useState<ResumeAttachment | undefined>()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (deleting) dialog.current?.showModal(); else dialog.current?.close() }, [deleting])

  useEffect(() => {
    setEditingTrack(activeTrack)
    setDraft(null)
    setPendingAttachment(undefined)
    setRename(null)
    setImportNote(null)
    setSaved(false)
  }, [activeTrack])

  const cv = draft ?? getCv(editingTrack)
  const attachment = library.attachments[editingTrack]
  const setCv = (next: MasterCv) => setDraft(next)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setImportError(null)
    try { await action() }
    catch (error) { setImportError(getErrorMessage(error, 'Could not save. Your draft is still here.')) }
    finally { setBusy(false) }
  }
  const saveDraft = async () => { if (draft) await saveTemplate(editingTrack, draft, pendingAttachment) }
  const switchTrack = (track: CvTrack) => run(async () => {
    await setActiveTrack(track, draft ? {track:editingTrack, cv:draft, attachment:pendingAttachment} : undefined)
    setDraft(null)
    setPendingAttachment(undefined)
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cv) return
    await run(async () => {
      await saveTemplate(editingTrack, cv, pendingAttachment)
      setDraft(null)
      setPendingAttachment(undefined)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleUpload = async (file: File | null) => {
    if (!file || !cv || busy || importing) return
    const target = editingTrack
    const base = cv
    setImporting(true)
    setImportError(null)
    setImportNote(null)
    try {
      const text = await extractTextFromResumeFile(file)
      if (!text.trim()) throw new Error('No text could be extracted from that file.')

      const importedAttachment = {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        extractedText: text,
      }
      setPendingAttachment(importedAttachment)

      let next = sparseCvFromText(text, base)
      try {
        const parsed = await parseResumeText(text, target, getLabel(target))
        next = mergeParsedCv(base, parsed)
        setImportNote('Resume imported into the form. Review fields and save when ready.')
      } catch {
        setImportNote(
          'Text extracted and saved in Summary. AI structuring failed — edit the form manually or try again later.'
        )
      }

      setDraft(next)
      await saveTemplate(target, next, importedAttachment)
      setDraft(null)
      setPendingAttachment(undefined)
    } catch (err) {
      setImportError(getErrorMessage(err, 'Import failed. Your draft is still here.'))
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-brand-muted">Loading master CV…</p>
  }

  if (loadError || !cv) return <div className={card}><p role="alert">{loadError ?? 'CV template unavailable.'}</p><button className={button} onClick={() => void reload()}>Retry loading CVs</button></div>
  const locked = busy || importing
  const refs = deleting ? templateReferences(library, deleting, jobs, searches) : { jobs: [], searches: [] }
  const needsReplacement = refs.jobs.length + refs.searches.length > 0

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6 text-brand-ink">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">CV library</h1><p className="mt-2 text-sm text-brand-muted">Keep a master CV for each kind of role you apply to.</p></div>
        <button type="button" className={button} disabled={locked} onClick={() => setShowAdd(!showAdd)}>+ New CV</button>
      </header>
      {importError && <div className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><p role="alert">{importError}</p><button type="button" disabled={locked} className={button} onClick={() => void run(reload)}>Reload library</button></div>}
      {showAdd && <form className={card} onSubmit={(e) => { e.preventDefault(); void run(async () => { await saveDraft(); await addTemplate(newName, copyFrom || undefined); setNewName(''); setShowAdd(false) }) }}>
        <h2 className="break-words font-display text-lg font-semibold text-brand-ink">New CV template</h2>
        <label className="block text-sm text-brand-muted">Template name<input required disabled={locked} className={`${field} mt-1`} value={newName} onChange={(e) => setNewName(e.target.value)} /></label>
        <label className="block text-sm text-brand-muted">Start from<select className={`${field} mt-1`} disabled={locked} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}><option value="">Blank CV</option>{Object.keys(library.cvs).map((id) => <option key={id} value={id}>{getLabel(id)}</option>)}</select></label>
        <div className="flex min-w-0 gap-2"><button className={button} disabled={locked || !newName.trim()}>Create CV</button><button type="button" className={button} disabled={locked} onClick={() => setShowAdd(false)}>Cancel</button></div>
      </form>}
      <section className={card}>
        <label className="block text-sm font-medium">Selected CV<select aria-label="Selected CV" disabled={locked} className={`${field} mt-2`} value={editingTrack} onChange={(e) => void switchTrack(e.target.value)}>{Object.keys(library.cvs).map((id) => <option key={id} value={id}>{getLabel(id)}</option>)}</select></label>
        <div className="flex flex-wrap items-center gap-2"><span className="mr-auto text-xs text-brand-muted">Used by default for new applications</span><button type="button" className={button} disabled={locked} onClick={() => setRename(getLabel(editingTrack))}>Rename</button><CvDeleteButton label={`Delete ${getLabel(editingTrack)} template`} disabled={locked || Object.keys(library.cvs).length <= 1} onClick={() => { setReplacement(''); setDeleting(editingTrack) }} /></div>
        {rename !== null && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { await renameTemplate(editingTrack, rename); setRename(null) }) }}><label className="block text-sm">Template name<input className={`${field} mt-1`} required disabled={locked} value={rename} onChange={(e) => setRename(e.target.value)} /></label><div className="flex min-w-0 gap-2"><button className={button} disabled={locked || !rename.trim()}>Save name</button><button type="button" className={button} disabled={locked} onClick={() => setRename(null)}>Cancel</button></div></form>}
      </section>
      <dialog ref={dialog} onCancel={(e) => { if (locked) e.preventDefault(); else setDeleting(null) }} className="w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-[#e6eeeb] bg-white p-6 text-brand-ink backdrop:bg-brand-ink/30">
        {deleting && <div className="min-w-0 space-y-4"><h2 className="break-words text-xl font-semibold">Delete {getLabel(deleting)}?</h2><p className="text-sm text-brand-muted">This removes the template and its attached resume. Submitted application documents stay saved.</p>
          {needsReplacement && <><p className="text-sm">Choose a replacement for these saved references:</p><ul className="max-h-40 space-y-1 overflow-auto text-sm">{refs.jobs.map((job) => <li key={job.id} className="break-words">Job: {job.role} at {job.company}</li>)}{refs.searches.map((search) => <li key={search.id} className="break-words">Search: {search.label || search.query}</li>)}</ul></>}
          <label className="block text-sm">Replacement CV{!needsReplacement && ' (optional)'}<select aria-label="Replacement CV" className={`${field} mt-1`} disabled={locked} value={replacement} onChange={(e) => setReplacement(e.target.value)}><option value="">{needsReplacement ? 'Choose a CV' : 'Use another remaining CV'}</option>{Object.keys(library.cvs).filter((id) => id !== deleting).map((id) => <option key={id} value={id}>{getLabel(id)}</option>)}</select></label>
          {importError && <p role="alert" className="text-sm text-red-700">{importError}</p>}
          <div className="flex flex-wrap gap-2"><CvDeleteButton label="Delete template" disabled={locked || (needsReplacement && !replacement)} onClick={() => void run(async () => { await deleteTemplate(deleting, replacement || undefined); setDeleting(null); setDraft(null); setPendingAttachment(undefined) })} />{busy && <span role="status" className="self-center text-sm text-brand-muted">Deleting…</span>}<button className={button} disabled={locked} onClick={() => setDeleting(null)}>Cancel</button></div>
        </div>}
      </dialog>
      <fieldset disabled={locked} className="min-w-0 space-y-6">
      <section className="min-w-0 space-y-4 rounded-2xl border border-[#e6eeeb] bg-white p-5 sm:p-6">
        <h2 className="break-words font-display text-lg font-semibold text-brand-ink">Attach resume → fill form</h2>
        <input
          type="file"
          accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={locked}
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-brand-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        {attachment && (
          <p className="break-words text-xs text-brand-muted">
            Stored: <span className="font-medium">{attachment.fileName}</span> ·{' '}
            {new Date(attachment.uploadedAt).toLocaleString()} ·{' '}
            {attachment.extractedText.length.toLocaleString()} chars extracted
          </p>
        )}
        {importing && <p className="text-sm text-brand-primaryDeep">Importing…</p>}
        {importError && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {importError}
          </p>
        )}
        {importNote && (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {importNote}
          </p>
        )}
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="min-w-0 space-y-4 rounded-2xl border border-[#e6eeeb] bg-white p-5 sm:p-6">
          <h2 className="break-words font-display text-lg font-semibold text-brand-ink">Contact · {getLabel(editingTrack)}</h2>
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
                  className="mt-1 min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2"
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
              className="mt-1 min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Headline</span>
            <input
              value={cv.headline}
              onChange={(e) => setCv({ ...cv, headline: e.target.value })}
              className="mt-1 min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Summary</span>
            <textarea
              value={cv.summary}
              onChange={(e) => setCv({ ...cv, summary: e.target.value })}
              rows={5}
              className="mt-1 min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2"
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
          disabled={locked} className="w-full break-words rounded-lg bg-brand-primary py-2.5 text-sm font-semibold text-white hover:bg-brand-primaryDeep"
        >
          {saved ? '✓ Saved' : `Save ${getLabel(editingTrack)} CV`}
        </button>
      </form>
      </fieldset>
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
    <section className="min-w-0 space-y-4 rounded-2xl border border-[#e6eeeb] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="break-words font-display text-lg font-semibold text-brand-ink">Skills</h2>
        <button
          type="button"
          className={button}
          onClick={() =>
            onChange([...skills, { id: crypto.randomUUID(), group: 'Group', items: [] }])
          }
        >
          + Group
        </button>
      </div>
      {skills.map((group, index) => (
        <div key={group.id} className="space-y-2 rounded-lg border border-[#e6eeeb] p-3">
          <div className="flex min-w-0 gap-2">
            <input
              value={group.group}
              onChange={(e) => {
                const next = [...skills]
                next[index] = { ...group, group: e.target.value }
                onChange(next)
              }}
              className="min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
            <CvDeleteButton
              label={`Remove ${group.group || 'skill'} group`}
              onClick={() => onChange(skills.filter((g) => g.id !== group.id))}
            />
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
            className="min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
          />
        </div>
      ))}
    </section>
  )
}

function CvDeleteButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e6eeeb] bg-white text-brand-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
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
    <section className="min-w-0 space-y-4 rounded-2xl border border-[#e6eeeb] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="break-words font-display text-lg font-semibold text-brand-ink">Experience</h2>
        <button
          type="button"
          className={button}
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
        <div key={exp.id} className="space-y-2 rounded-lg border border-[#e6eeeb] p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">
              Role {index + 1}
            </p>
            <CvDeleteButton
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
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
            <input
              value={exp.company}
              placeholder="Company"
              onChange={(e) => {
                const next = [...experience]
                next[index] = { ...exp, company: e.target.value }
                onChange(next)
              }}
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
            <input
              value={exp.location}
              placeholder="Location"
              onChange={(e) => {
                const next = [...experience]
                next[index] = { ...exp, location: e.target.value }
                onChange(next)
              }}
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
            <div className="flex min-w-0 gap-2">
              <input
                value={exp.start}
                placeholder="Start"
                onChange={(e) => {
                  const next = [...experience]
                  next[index] = { ...exp, start: e.target.value }
                  onChange(next)
                }}
                className="min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
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
                className="min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
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
            className="min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
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
    <section className="min-w-0 space-y-4 rounded-2xl border border-[#e6eeeb] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="break-words font-display text-lg font-semibold text-brand-ink">Projects</h2>
        <button
          type="button"
          className={button}
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
        <div key={project.id} className="space-y-2 rounded-lg border border-[#e6eeeb] p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">
              Project {index + 1}
            </p>
            <CvDeleteButton
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
            className="min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
          />
          <input
            value={project.url}
            placeholder="URL"
            onChange={(e) => {
              const next = [...projects]
              next[index] = { ...project, url: e.target.value }
              onChange(next)
            }}
            className="min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
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
            className="min-w-0 w-full rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
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
    <section className="min-w-0 space-y-4 rounded-2xl border border-[#e6eeeb] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="break-words font-display text-lg font-semibold text-brand-ink">Education</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {movable > 0 && (
            <button
              type="button"
              className="text-sm font-medium text-amber-700 hover:underline"
              onClick={onSplitCerts}
            >
              Move {movable} cert{movable === 1 ? '' : 's'} → Certifications
            </button>
          )}
          <button
            type="button"
            className={button}
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
        <div key={edu.id} className="space-y-2 rounded-lg border border-[#e6eeeb] p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">
              Education {index + 1}
            </p>
            <CvDeleteButton
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
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
            <input
              value={edu.school}
              placeholder="School"
              onChange={(e) => {
                const next = [...education]
                next[index] = { ...edu, school: e.target.value }
                onChange(next)
              }}
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
            <input
              value={edu.start ?? ''}
              placeholder="Start (e.g. September 2022)"
              onChange={(e) => {
                const next = [...education]
                next[index] = { ...edu, start: e.target.value }
                onChange(next)
              }}
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
            <input
              value={edu.end ?? ''}
              placeholder="End (e.g. July 2024)"
              onChange={(e) => {
                const next = [...education]
                next[index] = { ...edu, end: e.target.value }
                onChange(next)
              }}
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
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
    <section className="min-w-0 space-y-4 rounded-2xl border border-[#e6eeeb] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="break-words font-display text-lg font-semibold text-brand-ink">Certifications</h2>
        </div>
        <button
          type="button"
          className={button}
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
        <div key={cert.id} className="space-y-2 rounded-lg border border-[#e6eeeb] p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="pt-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">
              Certification {index + 1}
            </p>
            <CvDeleteButton
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
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm sm:col-span-1"
            />
            <input
              value={cert.issuer}
              placeholder="Issuer / code (e.g. Microsoft · PL-900)"
              onChange={(e) => {
                const next = [...certifications]
                next[index] = { ...cert, issuer: e.target.value }
                onChange(next)
              }}
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
            <input
              value={cert.year}
              placeholder="Year / date"
              onChange={(e) => {
                const next = [...certifications]
                next[index] = { ...cert, year: e.target.value }
                onChange(next)
              }}
              className="min-w-0 rounded-lg border border-[#e6eeeb] px-3 py-2 text-sm"
            />
          </div>
        </div>
      ))}
    </section>
  )
}
