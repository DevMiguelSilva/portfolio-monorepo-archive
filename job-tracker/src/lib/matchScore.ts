import type { CvTrack, MasterCv } from '../types/cv'
import { CV_TRACK_LABELS, CV_TRACKS, masterCvSearchText, masterCvSkillList } from '../types/cv'

export interface MatchResult {
  score: number
  matched: string[]
  missing: string[]
  reasons: string[]
  /** JD keywords used as the denominator for coverage. */
  targets: string[]
}

export interface DualTrackMatch {
  frontend: MatchResult
  powerPlatform: MatchResult
  bestTrack: CvTrack
  bestScore: number
}

/** Alias groups — any variant counts as the same skill for presence checks. */
const ALIAS_GROUPS: string[][] = [
  ['power apps', 'powerapps', 'power app'],
  ['power automate', 'powerautomate'],
  ['power bi', 'powerbi'],
  ['power pages', 'powerpages'],
  ['copilot studio', 'copilotstudio', 'power virtual agents', 'pva'],
  ['dataverse', 'common data service', 'cds'],
  ['sharepoint', 'share point'],
  ['javascript', 'js'],
  ['typescript', 'ts'],
  ['c#', 'csharp', 'c sharp'],
  ['rest api', 'rest apis', 'restful api', 'restful apis', 'restful'],
  ['graph api', 'microsoft graph', 'microsoft graph api'],
  ['azure devops', 'azdo', 'ado'],
  ['visual testing', 'ui testing'],
  ['ci/cd', 'cicd', 'ci cd'],
  ['react.js', 'reactjs', 'react'],
  ['node.js', 'nodejs', 'node'],
  ['sql server', 'mssql', 't-sql', 'tsql'],
  ['spfx', 'sharepoint framework'],
  ['power shell', 'powershell'],
  [
    'agile',
    'scrum',
    'agile methodologies',
    'agile methodology',
    'agile/scrum',
    'agile scrum',
    'agile/scrum methodology',
    'agile/scrum methodologies',
    'scrum methodology',
    'scrum methodologies',
  ],
]

/** Extra lexicon so inbox can mine JD keywords even when AI extract is empty. */
const COMMON_JD_KEYWORDS = [
  'React',
  'TypeScript',
  'JavaScript',
  'HTML',
  'CSS',
  'Node.js',
  'REST API',
  'GraphQL',
  'Git',
  'Azure',
  'Azure DevOps',
  'C#',
  'SQL',
  'Power Apps',
  'Power Automate',
  'Power BI',
  'Dataverse',
  'SharePoint',
  'Copilot Studio',
  'SPFx',
  'PowerShell',
  'Microsoft Graph',
  'VS Code',
  'Visual Studio',
  'Agile',
  'Scrum',
]

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const FILLER_WORDS = /\b(methodolog(?:y|ies)|methods?)\b/g

function stripFiller(value: string): string {
  return value.replace(FILLER_WORDS, ' ').replace(/[/\s]+/g, ' ').trim()
}

function splitCompounds(value: string): string[] {
  return value
    .split(/\s*(?:\/|&|\band\b)\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
}

function aliasesFor(value: string): string[] {
  return ALIAS_GROUPS.filter((group) =>
    group.some((alias) => alias === value || value.includes(alias) || alias.includes(value))
  ).flat()
}

function variantsFor(skill: string): string[] {
  const n = normalize(skill)
  if (!n) return []
  const set = new Set<string>()

  const add = (raw: string) => {
    const v = normalize(raw)
    if (!v) return
    set.add(v)
    if (v.includes(' ')) set.add(v.replace(/\s+/g, ''))
    for (const alias of aliasesFor(v)) {
      if (alias) set.add(alias)
    }
  }

  add(n)
  const stripped = stripFiller(n)
  if (stripped) add(stripped)
  for (const part of splitCompounds(n)) {
    add(part)
    const partStripped = stripFiller(part)
    if (partStripped) add(partStripped)
  }

  return [...set].filter(Boolean)
}

function haystackHasNeedle(haystack: string, needle: string): boolean {
  if (needle.length <= 2 || !needle.includes(' ')) {
    const re = new RegExp(`(?:^|[^a-z0-9+#])${escapeRegExp(needle)}(?:[^a-z0-9+#]|$)`)
    return re.test(haystack)
  }
  return haystack.includes(needle)
}

/** True if skill (or an alias) appears in haystack. */
export function textHasSkill(haystack: string, skill: string): boolean {
  const h = normalize(haystack)
  if (!h) return false

  for (const needle of variantsFor(skill)) {
    if (!needle) continue
    if (haystackHasNeedle(h, needle)) return true
  }
  return false
}

function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of skills) {
    const s = raw.trim()
    if (s.length < 2) continue
    const key = normalize(s)
    if (!key || seen.has(key)) continue
    // Dedupe alias siblings to one label (prefer first-seen / JD wording)
    const already = out.some((o) => variantsFor(o).some((v) => variantsFor(s).includes(v)))
    if (already) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

/**
 * Keywords that appear in the JD — preferred extracted skills, else lexicon hits.
 * Denominator for honest coverage: what the posting asks for.
 */
export function deriveJdKeywords(
  jobText: string,
  extractedSkills: string[] = [],
  seedSkills: string[] = []
): string[] {
  const extracted = uniqueSkills(extractedSkills)
  if (extracted.length > 0) return extracted

  const lexicon = uniqueSkills([...seedSkills, ...COMMON_JD_KEYWORDS])
  return lexicon.filter((k) => textHasSkill(jobText, k)).slice(0, 40)
}

/**
 * Honest coverage: % of JD keywords found in the candidate CV text.
 * No title boosts — useful for deciding whether an application is worth your time.
 */
export function scoreJdCoverage(
  jobText: string,
  cvText: string,
  extractedSkills: string[] = [],
  seedSkills: string[] = []
): MatchResult {
  const targets = deriveJdKeywords(jobText, extractedSkills, seedSkills)

  if (targets.length === 0) {
    return {
      score: 0,
      matched: [],
      missing: [],
      targets: [],
      reasons: ['No clear skill keywords found in the JD yet — parse the posting or add more CV skills.'],
    }
  }

  if (!cvText.trim()) {
    return {
      score: 0,
      matched: [],
      missing: targets,
      targets,
      reasons: ['Master CV looks empty for this track — fill summary, skills, or experience.'],
    }
  }

  const matched: string[] = []
  const missing: string[] = []
  for (const skill of targets) {
    if (textHasSkill(cvText, skill)) matched.push(skill)
    else missing.push(skill)
  }

  const score = Math.round((matched.length / targets.length) * 100)
  const reasons = [
    ...matched.slice(0, 6).map((s) => `CV covers ${s}`),
    ...missing.slice(0, 4).map((s) => `JD asks for ${s} — not found in CV text`),
  ]

  return { score, matched, missing, targets, reasons }
}

/** Score one Master CV against a job (full CV text). */
export function scoreMasterCvAgainstJob(
  jobText: string,
  cv: MasterCv,
  extractedSkills: string[] = []
): MatchResult {
  return scoreJdCoverage(
    jobText,
    masterCvSearchText(cv),
    extractedSkills,
    masterCvSkillList(cv)
  )
}

/** Score both tracks; bestTrack prefers Power Platform when scores tie. */
export function scoreDualTracks(
  jobText: string,
  cvs: Record<CvTrack, MasterCv>,
  extractedSkills: string[] = []
): DualTrackMatch {
  const seed = uniqueSkills([
    ...masterCvSkillList(cvs.frontend),
    ...masterCvSkillList(cvs.powerPlatform),
  ])
  const targets = deriveJdKeywords(jobText, extractedSkills, seed)

  const frontend = scoreJdCoverage(
    jobText,
    masterCvSearchText(cvs.frontend),
    targets,
    seed
  )
  const powerPlatform = scoreJdCoverage(
    jobText,
    masterCvSearchText(cvs.powerPlatform),
    targets,
    seed
  )

  const bestTrack: CvTrack =
    frontend.score > powerPlatform.score ? 'frontend' : 'powerPlatform'
  const bestScore = Math.max(frontend.score, powerPlatform.score)

  return { frontend, powerPlatform, bestTrack, bestScore }
}

export function dualTrackReasonLine(dual: DualTrackMatch): string {
  return `Scores: ${CV_TRACK_LABELS.frontend} ${dual.frontend.score}% · ${CV_TRACK_LABELS.powerPlatform} ${dual.powerPlatform.score}%`
}

export function parseDualTrackReason(reasons: string[]): { frontend: number; powerPlatform: number } | null {
  const line = reasons.find((r) => r.startsWith('Scores:'))
  if (!line) return null
  const fe = line.match(/React\s+(\d+)%/i)
  const pp = line.match(/Power Platform\s+(\d+)%/i)
  if (!fe || !pp) return null
  return { frontend: Number(fe[1]), powerPlatform: Number(pp[1]) }
}

/**
 * @deprecated Prefer scoreMasterCvAgainstJob / scoreJdCoverage.
 * Kept for call sites that still pass a skill list — treats skills as JD targets if they appear in jobText.
 */
export function scoreJobMatch(
  jobText: string,
  candidateSkills: string[],
  _roleHint = '',
  cvText = ''
): MatchResult {
  // If cvText provided: honest JD→CV coverage using skills found in JD
  if (cvText.trim()) {
    return scoreJdCoverage(jobText, cvText, [], candidateSkills)
  }
  // Legacy fallback: % of candidate skills mentioned in JD (less honest for apply decisions)
  const targets = uniqueSkills(candidateSkills).filter((s) => textHasSkill(jobText, s))
  if (targets.length === 0) {
    return scoreJdCoverage(jobText, candidateSkills.join('\n'), [], candidateSkills)
  }
  return {
    score: Math.round((targets.length / Math.max(candidateSkills.length, 1)) * 100),
    matched: targets,
    missing: uniqueSkills(candidateSkills).filter((s) => !textHasSkill(jobText, s)).slice(0, 12),
    targets,
    reasons: targets.slice(0, 6).map((s) => `JD mentions ${s}`),
  }
}

/** ATS-style gap report: JD skills vs full master CV text (+ aliases). */
export function buildGapReport(
  jobDescription: string,
  extractedSkills: string[],
  cvTextOrSkills: string | string[],
  claimedSkills: string[] = []
): {
  coveragePercent: number
  matchedKeywords: string[]
  claimedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
} {
  const cvText = Array.isArray(cvTextOrSkills) ? cvTextOrSkills.join('\n') : cvTextOrSkills
  const result = scoreJdCoverage(jobDescription, cvText, extractedSkills, [])

  if (result.targets.length === 0) {
    return {
      coveragePercent: 0,
      matchedKeywords: [],
      claimedKeywords: [],
      missingKeywords: [],
      suggestions: ['Parse the job posting to extract skills for a better gap report.'],
    }
  }

  const claimedKeys = new Set(
    claimedSkills.map((s) => s.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean)
  )
  const isClaimed = (skill: string) => {
    const key = skill.trim().toLowerCase().replace(/\s+/g, ' ')
    if (claimedKeys.has(key)) return true
    return claimedSkills.some(
      (c) => textHasSkill(c, skill) || textHasSkill(skill, c)
    )
  }

  const matchedKeywords = result.matched
  const claimedKeywords = result.missing.filter(isClaimed)
  const missingKeywords = result.missing.filter((s) => !isClaimed(s))
  const coveragePercent = Math.round(
    ((matchedKeywords.length + claimedKeywords.length) / result.targets.length) * 100
  )

  const suggestions = [
    coveragePercent >= 70
      ? 'Strong overlap with this JD — worth applying with light keyword polish.'
      : coveragePercent >= 45
        ? 'Partial overlap — apply if the missing items are real experience you can phrase honestly.'
        : 'Weak overlap — consider skipping unless you truly have the missing stack.',
    ...(claimedKeywords.length > 0
      ? [
          `You confirmed ${claimedKeywords.length} skill(s) for this job — they’ll be included when you tailor.`,
        ]
      : []),
    ...(missingKeywords.length > 0
      ? [
          'Amber chips are not on this master CV. Click one if you already know it, or use the transferable list when a missing skill is a short hop from skills you have.',
        ]
      : []),
  ]

  return {
    coveragePercent,
    matchedKeywords,
    claimedKeywords,
    missingKeywords,
    suggestions,
  }
}

export function formatDualTrackScores(dual: DualTrackMatch): string {
  return CV_TRACKS.map((t) => `${CV_TRACK_LABELS[t]} ${dual[t].score}%`).join(' · ')
}
