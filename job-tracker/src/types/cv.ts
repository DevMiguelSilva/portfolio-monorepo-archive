export type CvTrack = 'frontend' | 'powerPlatform'

export const CV_TRACKS: CvTrack[] = ['frontend', 'powerPlatform']

export const CV_TRACK_LABELS: Record<CvTrack, string> = {
  frontend: 'React',
  powerPlatform: 'Power Platform',
}

export interface CvContact {
  name: string
  email: string
  phone: string
  location: string
  links: string[]
}

export interface CvSkillGroup {
  id: string
  group: string
  items: string[]
}

export interface CvBullet {
  id: string
  text: string
  tags: string[]
}

export interface CvExperience {
  id: string
  company: string
  title: string
  location: string
  start: string
  end: string
  current: boolean
  bullets: CvBullet[]
}

export interface CvProject {
  id: string
  name: string
  url: string
  bullets: CvBullet[]
}

export interface CvEducation {
  id: string
  school: string
  degree: string
  start: string
  end: string
  /** Legacy single-date field — migrated into start/end on load. */
  year?: string
}

/** Display range for education (and migrate legacy `year` when needed). */
export function formatEducationDates(edu: CvEducation): string {
  const start = (edu.start || '').trim()
  const end = (edu.end || '').trim()
  if (start && end) return `${start} - ${end}`
  if (start) return start
  if (end) return end
  return (edu.year || '').trim()
}

export function normalizeEducationEntry(
  edu: Partial<CvEducation> & { id?: string; year?: string }
): CvEducation {
  let start = (edu.start ?? '').trim()
  let end = (edu.end ?? '').trim()
  const year = (edu.year ?? '').trim()
  if (!start && !end && year) {
    const parts = year.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      start = parts[0]
      end = parts.slice(1).join(' - ')
    } else {
      end = year
    }
  }
  return {
    id: edu.id || crypto.randomUUID(),
    school: edu.school ?? '',
    degree: edu.degree ?? '',
    start,
    end,
  }
}

export interface CvCertification {
  id: string
  /** e.g. Microsoft Certified: Power Platform Fundamentals */
  name: string
  /** e.g. Microsoft · PL-900 */
  issuer: string
  year: string
}

export interface MasterCv {
  contact: CvContact
  headline: string
  summary: string
  skills: CvSkillGroup[]
  experience: CvExperience[]
  projects: CvProject[]
  education: CvEducation[]
  certifications: CvCertification[]
  updatedAt: string
}

/** Stored attachment metadata + extracted text for progressive form editing. */
export interface ResumeAttachment {
  fileName: string
  mimeType: string
  uploadedAt: string
  extractedText: string
}

export interface MasterCvLibrary {
  activeTrack: CvTrack
  cvs: Record<CvTrack, MasterCv>
  attachments: Record<CvTrack, ResumeAttachment | null>
  updatedAt: string
}

export interface GapReport {
  coveragePercent: number
  matchedKeywords: string[]
  /** Missing on Master CV but user confirmed for this job (shown blue). */
  claimedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
}

export interface TailoredDocument {
  id: string
  jobApplicationId: string
  masterCvSnapshot: MasterCv
  tailoredCv: MasterCv
  coverLetter: string
  gapReport: GapReport
  matchScore: number | null
  createdAt: string
  updatedAt: string
}

function id(): string {
  return crypto.randomUUID()
}

export function createEmptyMasterCv(overrides: Partial<MasterCv> = {}): MasterCv {
  const now = new Date().toISOString()
  return {
    contact: {
      name: '',
      email: '',
      phone: '',
      location: 'Canada',
      links: [],
    },
    headline: '',
    summary: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    updatedAt: now,
    ...overrides,
  }
}

/** Ensure older saved CVs without certifications still load cleanly. */
export function normalizeMasterCv(cv: Partial<MasterCv> | null | undefined, fallback?: MasterCv): MasterCv {
  const base = fallback ?? createEmptyMasterCv()
  if (!cv) return base
  return {
    ...base,
    ...cv,
    contact: { ...base.contact, ...(cv.contact ?? {}) },
    skills: Array.isArray(cv.skills) ? cv.skills : base.skills,
    experience: Array.isArray(cv.experience) ? cv.experience : base.experience,
    projects: Array.isArray(cv.projects) ? cv.projects : base.projects,
    education: Array.isArray(cv.education)
      ? cv.education.map((e) => normalizeEducationEntry(e))
      : base.education,
    certifications: Array.isArray(cv.certifications) ? cv.certifications : [],
    updatedAt: typeof cv.updatedAt === 'string' ? cv.updatedAt : base.updatedAt,
  }
}

export function createDefaultFrontendCv(): MasterCv {
  return createEmptyMasterCv({
    contact: {
      name: 'Miguel Silva',
      email: '',
      phone: '',
      location: 'Canada',
      links: [],
    },
    headline: 'Front-end Software Engineer | React · TypeScript · JavaScript',
    summary:
      'Front-end Software Engineer with 5+ years of experience crafting responsive, performant web applications using React, TypeScript, JavaScript, and modern UI frameworks.',
    skills: [
      {
        id: id(),
        group: 'Frontend',
        items: ['React', 'TypeScript', 'JavaScript', 'Accessible UI', 'Responsive Design'],
      },
      {
        id: id(),
        group: 'Platform',
        items: ['REST APIs', 'CI/CD', 'Agile'],
      },
    ],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  })
}

export function createDefaultPowerPlatformCv(): MasterCv {
  return createEmptyMasterCv({
    contact: {
      name: 'Miguel Silva',
      email: '',
      phone: '',
      location: 'Canada',
      links: [],
    },
    headline: 'Power Platform Developer | Power Apps · Power Automate · Dataverse',
    summary:
      'Power Platform developer with hands-on experience building Power Apps, Power Automate flows, and Dataverse solutions for business workflows.',
    skills: [
      {
        id: id(),
        group: 'Power Platform',
        items: ['Power Apps', 'Power Automate', 'Dataverse', 'Power BI', 'SharePoint'],
      },
      {
        id: id(),
        group: 'Related',
        items: ['Microsoft 365', 'REST APIs', 'Agile'],
      },
    ],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  })
}

/** @deprecated use createDefaultFrontendCv */
export function createDefaultMasterCv(): MasterCv {
  return createDefaultFrontendCv()
}

export function createDefaultLibrary(): MasterCvLibrary {
  const now = new Date().toISOString()
  return {
    activeTrack: 'frontend',
    cvs: {
      frontend: createDefaultFrontendCv(),
      powerPlatform: createDefaultPowerPlatformCv(),
    },
    attachments: {
      frontend: null,
      powerPlatform: null,
    },
    updatedAt: now,
  }
}

/** Migrate legacy single MasterCv blob → library. */
export function normalizeLibrary(raw: unknown): MasterCvLibrary {
  const base = createDefaultLibrary()
  if (!raw || typeof raw !== 'object') return base

  const obj = raw as Record<string, unknown>

  // Already a library
  if (obj.cvs && typeof obj.cvs === 'object') {
    const cvs = obj.cvs as Partial<Record<CvTrack, MasterCv>>
    const attachments = (obj.attachments ?? {}) as Partial<Record<CvTrack, ResumeAttachment | null>>
    return {
      activeTrack: obj.activeTrack === 'powerPlatform' ? 'powerPlatform' : 'frontend',
      cvs: {
        frontend: normalizeMasterCv(cvs.frontend, base.cvs.frontend),
        powerPlatform: normalizeMasterCv(cvs.powerPlatform, base.cvs.powerPlatform),
      },
      attachments: {
        frontend: attachments.frontend ?? null,
        powerPlatform: attachments.powerPlatform ?? null,
      },
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : base.updatedAt,
    }
  }

  // Legacy single CV → frontend track
  if ('contact' in obj || 'headline' in obj || 'skills' in obj) {
    return {
      ...base,
      cvs: {
        frontend: normalizeMasterCv(obj as unknown as MasterCv, base.cvs.frontend),
        powerPlatform: base.cvs.powerPlatform,
      },
    }
  }

  return base
}

export function masterCvSkillList(cv: MasterCv): string[] {
  const fromGroups = cv.skills.flatMap((g) => g.items)
  const fromTags = [
    ...cv.experience.flatMap((e) => e.bullets.flatMap((b) => b.tags)),
    ...cv.projects.flatMap((p) => p.bullets.flatMap((b) => b.tags)),
  ]
  return [...new Set([...fromGroups, ...fromTags].map((s) => s.trim()).filter(Boolean))]
}

function normalizeSkillLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Keep Master CV skill group ids/labels/order; only reorder (and optionally
 * prefer JD spellings) for skills that already exist on the master CV.
 * Unknown AI skills are dropped. Master skills missing from the AI list are demoted to the end.
 */
export function lockSkillGroupsToMaster(
  master: CvSkillGroup[],
  tailored: CvSkillGroup[] | null | undefined
): CvSkillGroup[] {
  if (!master.length) return []
  if (!tailored?.length) return master.map((g) => ({ ...g, items: [...g.items] }))

  const home = new Map<string, { groupIndex: number; canonical: string }>()
  for (let gi = 0; gi < master.length; gi++) {
    for (const item of master[gi].items) {
      const key = normalizeSkillLabel(item)
      if (key && !home.has(key)) home.set(key, { groupIndex: gi, canonical: item })
    }
  }

  const ordered: string[][] = master.map(() => [])
  const used = new Set<string>()

  for (const group of tailored) {
    for (const raw of group.items ?? []) {
      const key = normalizeSkillLabel(raw)
      const hit = key ? home.get(key) : undefined
      if (!hit || used.has(key)) continue
      used.add(key)
      const spelling = raw.trim() || hit.canonical
      ordered[hit.groupIndex].push(spelling)
    }
  }

  return master.map((group, gi) => {
    const items = [...ordered[gi]]
    for (const item of group.items) {
      const key = normalizeSkillLabel(item)
      if (!key || used.has(key)) continue
      used.add(key)
      items.push(item)
    }
    return { id: group.id, group: group.group, items }
  })
}

/** Prepend user-confirmed skills onto the first skill group (or create one). */
export function mergeClaimedSkillsIntoGroups(
  groups: CvSkillGroup[],
  claimed: string[]
): CvSkillGroup[] {
  const toAdd = uniqueTrimmedSkills(claimed)
  if (toAdd.length === 0) return groups.map((g) => ({ ...g, items: [...g.items] }))

  if (groups.length === 0) {
    return [{ id: crypto.randomUUID(), group: 'Skills', items: toAdd }]
  }

  const existing = new Set(
    groups.flatMap((g) => g.items.map((item) => normalizeSkillLabel(item))).filter(Boolean)
  )
  const fresh = toAdd.filter((s) => !existing.has(normalizeSkillLabel(s)))
  if (fresh.length === 0) return groups.map((g) => ({ ...g, items: [...g.items] }))

  return groups.map((g, i) =>
    i === 0 ? { ...g, items: [...fresh, ...g.items] } : { ...g, items: [...g.items] }
  )
}

function uniqueTrimmedSkills(skills: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of skills) {
    const value = raw.trim()
    const key = normalizeSkillLabel(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

/** Full master CV text used for honest JD coverage (summary + skills + bullets). */
export function masterCvSearchText(cv: MasterCv): string {
  const parts = [
    cv.headline,
    cv.summary,
    ...cv.skills.flatMap((g) => [g.group, ...g.items]),
    ...cv.experience.flatMap((e) => [
      e.company,
      e.title,
      e.location,
      ...e.bullets.flatMap((b) => [b.text, ...b.tags]),
    ]),
    ...cv.projects.flatMap((p) => [
      p.name,
      p.url,
      ...p.bullets.flatMap((b) => [b.text, ...b.tags]),
    ]),
    ...cv.education.flatMap((e) => [e.school, e.degree, e.start, e.end, e.year ?? '']),
    ...(cv.certifications ?? []).flatMap((c) => [c.name, c.issuer, c.year]),
  ]
  return parts.map((p) => (p || '').trim()).filter(Boolean).join('\n')
}

export function isMasterCvSparse(cv: MasterCv): boolean {
  return !cv.summary.trim() && cv.skills.length === 0 && cv.experience.length === 0
}

export const EMPTY_GAP_REPORT: GapReport = {
  coveragePercent: 0,
  matchedKeywords: [],
  claimedKeywords: [],
  missingKeywords: [],
  suggestions: [],
}
