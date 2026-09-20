import { createEmptyMasterCv, type MasterCvLibrary, type TailoredDocument } from '../types/cv'
import type { InboxJob, JobApplication, SavedSearch } from '../types/job'

export function cvLabel(library: MasterCvLibrary, id: string): string {
  return library.names[id] ?? 'Archived CV template'
}

export function addCvTemplate(library: MasterCvLibrary, name: string, copyFrom?: string): MasterCvLibrary {
  if (!name.trim()) throw new Error('Enter a name for the CV template.')
  if (copyFrom && !library.cvs[copyFrom]) throw new Error('The source template no longer exists.')
  const id = `cv-${crypto.randomUUID()}`
  return {
    ...library, activeTrack: id,
    names: { ...library.names, [id]: name.trim() },
    cvs: { ...library.cvs, [id]: copyFrom ? structuredClone(library.cvs[copyFrom]) : createEmptyMasterCv() },
    attachments: { ...library.attachments, [id]: copyFrom ? structuredClone(library.attachments[copyFrom] ?? null) : null },
  }
}

export function resolveJobCv(library: MasterCvLibrary, job: JobApplication, doc?: TailoredDocument) {
  if (job.status !== 'saved') return doc?.masterCvSnapshot ?? null
  return library.cvs[job.cvTrack ?? library.activeTrack] ?? null
}

export function templateReferences(library: MasterCvLibrary, id: string, jobs: JobApplication[], searches: SavedSearch[]) {
  return {
    jobs: jobs.filter((job) => job.status === 'saved' && (job.cvTrack ?? library.activeTrack) === id),
    searches: searches.filter((search) => search.track === id),
  }
}

export function removeCvTemplate(library: MasterCvLibrary, id: string, replacement: string | undefined,
  jobs: JobApplication[], searches: SavedSearch[], inbox: InboxJob[]) {
  const ids = Object.keys(library.cvs)
  if (!ids.includes(id)) throw new Error('This template no longer exists.')
  if (ids.length <= 1) throw new Error('Keep at least one CV template.')
  const refs = templateReferences(library, id, jobs, searches)
  if ((refs.jobs.length || refs.searches.length) && !replacement) throw new Error('Choose a replacement for the affected jobs and searches.')
  const nextId = replacement ?? ids.find((key) => key !== id)!
  if (nextId === id || !library.cvs[nextId]) throw new Error('Choose an existing replacement template.')
  const nextLibrary = structuredClone(library)
  nextLibrary.updatedAt = new Date().toISOString()
  delete nextLibrary.cvs[id]
  delete nextLibrary.names[id]
  delete nextLibrary.attachments[id]
  if (nextLibrary.activeTrack === id) nextLibrary.activeTrack = nextId
  return {
    library: nextLibrary,
    jobs: jobs.map((job) => refs.jobs.some((ref) => ref.id === job.id)
      ? { ...job, cvTrack: nextId, needsRescore: true, matchScore: null } : job),
    searches: searches.map((search) => search.track === id ? { ...search, track: nextId } : search),
    inbox: inbox.map((item) => item.matchedTrack === id
      ? { ...item, matchedTrack: nextId, matchScore: 0, matchReasons: [] } : item),
  }
}

const keys = ['applytrack-master-cv', 'job-tracker-applications', 'applytrack-saved-searches', 'applytrack-inbox']
const journalKey = 'applytrack-cv-library-transaction'

/** Recover a partially written local deletion after a failed write or reload. */
export function recoverCvTransaction(storage: Storage) {
  const raw = storage.getItem(journalKey)
  if (!raw) return
  const backup = JSON.parse(raw) as (string | null)[]
  keys.forEach((key, index) => backup[index] === null
    ? storage.removeItem(key) : storage.setItem(key, backup[index]!))
  storage.removeItem(journalKey)
}

export function deleteLocalCv(storage: Storage, library: MasterCvLibrary, id: string, replacement?: string) {
  recoverCvTransaction(storage)
  const backup = keys.map((key) => storage.getItem(key))
  if (backup[0] && JSON.stringify(JSON.parse(backup[0])) !== JSON.stringify(library)) {
    throw new Error('Your CV library changed in another tab. Reload before deleting.')
  }
  const next = removeCvTemplate(library, id, replacement,
    JSON.parse(backup[1] ?? '[]'), JSON.parse(backup[2] ?? '[]'), JSON.parse(backup[3] ?? '[]'))
  storage.setItem(journalKey, JSON.stringify(backup))
  try {
    [next.library, next.jobs, next.searches, next.inbox].forEach((value, index) => storage.setItem(keys[index], JSON.stringify(value)))
    storage.removeItem(journalKey)
  } catch (error) {
    recoverCvTransaction(storage)
    throw error
  }
  return next.library
}

export const CV_LIBRARY_EVENT = 'applytrack-cv-library-changed'
