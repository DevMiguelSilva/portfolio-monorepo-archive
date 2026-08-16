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

function variantsFor(skill: string): string[] {
  const n = normalize(skill)
  if (!n) return []
  const group = ALIAS_GROUPS.find((g) => g.some((alias) => alias === n || n.includes(alias) || alias.includes(n)))
  const set = new Set<string>([n, ...(group ?? [])])
  // Compact form without spaces for PowerApps-style tokens
  if (n.includes(' ')) set.add(n.replace(/\s+/g, ''))
  return [...set].filter(Boolean)
}

/** True if skill (or an alias) appears in haystack. */
export function textHasSkill(haystack: string, skill: string): boolean {
  const h = normalize(haystack)
  if (!h) return false

  for (const needle of variantsFor(skill)) {
    if (!needle) continue
    if (needle.length <= 2) {
      const re = new RegExp(`(?:^|\\s)${escapeRegExp(needle)}(?:\\s|$)`)
      if (re.test(h)) return true
      continue
    }
    if (h.includes(needle)) return true
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

/** Score both tracks; bestTrack is the higher coverage (ties → frontend). */
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
    powerPlatform.score > frontend.score ? 'powerPlatform' : 'frontend'
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
  cvTextOrSkills: string | string[]
): {
  coveragePercent: number
  matchedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
} {
  const cvText = Array.isArray(cvTextOrSkills) ? cvTextOrSkills.join('\n') : cvTextOrSkills
  const result = scoreJdCoverage(jobDescription, cvText, extractedSkills, [])

  if (result.targets.length === 0) {
    return {
      coveragePercent: 0,
      matchedKeywords: [],
      missingKeywords: [],
      suggestions: ['Parse the job posting to extract skills for a better gap report.'],
    }
  }

  const suggestions = [
    result.score >= 70
      ? 'Strong overlap with this JD — worth applying with light keyword polish.'
      : result.score >= 45
        ? 'Partial overlap — apply if the missing items are real experience you can phrase honestly.'
        : 'Weak overlap — consider skipping unless you truly have the missing stack.',
    ...result.missing
      .slice(0, 5)
      .map((k) => `Not found in this master CV: "${k}". Only add it if you have real experience.`),
  ]

  return {
    coveragePercent: result.score,
    matchedKeywords: result.matched,
    missingKeywords: result.missing,
    suggestions,
  }
}

export function formatDualTrackScores(dual: DualTrackMatch): string {
  return CV_TRACKS.map((t) => `${CV_TRACK_LABELS[t]} ${dual[t].score}%`).join(' · ')
}
