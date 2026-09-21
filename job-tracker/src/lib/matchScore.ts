import type { CvTrack, MasterCv } from '../types/cv'
import { CV_TRACK_LABELS, masterCvSearchText, masterCvSkillList } from '../types/cv'

export interface MatchResult {
  score: number
  matched: string[]
  missing: string[]
  reasons: string[]
  /** JD keywords used as the denominator for coverage. */
  targets: string[]
}

export interface DualTrackMatch {
  scores: Record<CvTrack, MatchResult>
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
  ['microsoft word', 'ms word', 'ms-word', 'msword', 'word'],
  ['microsoft excel', 'ms excel', 'excel'],
  ['powerpoint', 'power point', 'ms powerpoint'],
  ['microsoft office', 'ms office', 'office 365', 'microsoft 365', 'm365', 'ms365'],
  ['jira', 'atlassian jira'],
  ['asana'],
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

const variantCache = new Map<string, string[]>()
const needleCache = new Map<string, RegExp>()
const CACHE_LIMIT = 512

function variantsFor(skill: string): string[] {
  const n = normalize(skill)
  if (!n) return []
  const cached = variantCache.get(n)
  if (cached) return cached
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

  const variants = [...set].filter(Boolean)
  if (variantCache.size >= CACHE_LIMIT) variantCache.delete(variantCache.keys().next().value!)
  variantCache.set(n, variants)
  return variants
}

function haystackHasNeedle(haystack: string, needle: string): boolean {
  if (needle.length <= 2 || !needle.includes(' ')) {
    let re = needleCache.get(needle)
    if (!re) {
      re = new RegExp(`(?:^|[^a-z0-9+#])${escapeRegExp(needle)}(?:[^a-z0-9+#]|$)`)
      if (needleCache.size >= CACHE_LIMIT) needleCache.delete(needleCache.keys().next().value!)
      needleCache.set(needle, re)
    }
    return re.test(haystack)
  }
  return haystack.includes(needle)
}

/** True if skill (or an alias) appears in haystack. */
export function textHasSkill(haystack: string, skill: string): boolean {
  return normalizedTextHasSkill(normalize(haystack), skill)
}

function normalizedTextHasSkill(h: string, skill: string): boolean {
  if (!h) return false

  for (const needle of variantsFor(skill)) {
    if (!needle) continue
    if (haystackHasNeedle(h, needle)) return true
  }
  return false
}

function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>()
  const seenVariants = new Set<string>()
  const out: string[] = []
  for (const raw of skills) {
    const s = raw.trim()
    if (s.length < 2) continue
    const key = normalize(s)
    if (!key || seen.has(key)) continue
    // Dedupe alias siblings to one label (prefer first-seen / JD wording)
    const variants = variantsFor(s)
    if (variants.some((variant) => seenVariants.has(variant))) continue
    seen.add(key)
    for (const variant of variants) seenVariants.add(variant)
    out.push(s)
  }
  return out
}

const SPOKEN_LANGUAGES: { label: string; pattern: RegExp }[] = [
  { label: 'French', pattern: /\b(?:french|français|francais|francophone)\b/i },
  { label: 'Spanish', pattern: /\b(?:spanish|español|espanol)\b/i },
  { label: 'German', pattern: /\b(?:german|deutsch)\b/i },
  { label: 'Mandarin', pattern: /\bmandarin\b/i },
  { label: 'Cantonese', pattern: /\bcantonese\b/i },
  { label: 'Portuguese', pattern: /\bportuguese\b/i },
  { label: 'Italian', pattern: /\bitalian\b/i },
  { label: 'Arabic', pattern: /\barabic\b/i },
]

const ARCHITECT_ROLES: { label: string; pattern: RegExp }[] = [
  { label: 'Power Platform architect', pattern: /\bpower platform architect\b/i },
  { label: 'Solution architect', pattern: /\bsolution architect\b/i },
  { label: 'Enterprise architect', pattern: /\benterprise architect\b/i },
  { label: 'Technical architect', pattern: /\btechnical architect\b/i },
  { label: 'Software architect', pattern: /\bsoftware architect\b/i },
  { label: 'Cloud architect', pattern: /\bcloud architect\b/i },
  { label: 'Data architect', pattern: /\bdata architect\b/i },
  { label: 'Security architect', pattern: /\bsecurity architect\b/i },
]

function architectLabel(text: string): string | null {
  const specific = ARCHITECT_ROLES.find((role) => role.pattern.test(text))
  if (specific) return specific.label
  if (/\barchitect\b/i.test(text)) return 'Architect'
  return null
}

/**
 * Requirements the technical skill list often drops: spoken languages, and being
 * an architect. These are not assumed — if the posting asks and the CV does not
 * say it, the gap stays visible.
 */
export function requirementSignals(jobText: string): string[] {
  const found: string[] = []
  const add = (label: string) => {
    if (!found.some((item) => normalize(item) === normalize(label))) found.push(label)
  }

  for (const language of SPOKEN_LANGUAGES) {
    if (language.pattern.test(jobText)) add(language.label)
  }
  if (/\bbilingual\b|\bbilingue\b/i.test(jobText)) add('Bilingual')

  const [title = '', ...rest] = jobText.split('\n')
  const fromTitle = architectLabel(title)
  if (fromTitle) add(fromTitle)

  const body = rest.join('\n')
  const candidateIsArchitect =
    /\b(?:you(?:'|’)ll be|you will be|as an?|must be|required to be|experience as an?|background as an?|this role is|the role is)\s+(?:an?\s+|the\s+)?(?:senior\s+|lead\s+|principal\s+)?(?:power platform\s+|solution\s+|enterprise\s+|technical\s+|software\s+|cloud\s+|data\s+|security\s+)?architect\b/i
  const hiringAnArchitect =
    /\b(?:seeking|looking for|hiring)\s+(?:an?\s+)?(?:senior\s+|lead\s+|principal\s+)?(?:power platform\s+|solution\s+|enterprise\s+|technical\s+|software\s+|cloud\s+|data\s+|security\s+)?architect\b/i
  if (candidateIsArchitect.test(body) || hiringAnArchitect.test(body)) {
    const fromBody = architectLabel(body)
    if (fromBody) add(fromBody)
  }

  return found
}

/** Extracted skills plus languages and role-level requirements found in the posting. */
export function withRequirementSignals(jobText: string, skills: string[]): string[] {
  return uniqueSkills([...skills, ...requirementSignals(jobText)])
}

/**
 * Keywords that appear in the JD — extracted skills, plus languages and role
 * requirements the extractor often skips. Lexicon hits only when nothing else was found.
 */
export function deriveJdKeywords(
  jobText: string,
  extractedSkills: string[] = [],
  seedSkills: string[] = []
): string[] {
  const extracted = withRequirementSignals(jobText, extractedSkills)
  if (extracted.length > 0) return extracted

  const lexicon = uniqueSkills([...seedSkills, ...COMMON_JD_KEYWORDS])
  const normalizedJob = normalize(jobText)
  return lexicon.filter((k) => normalizedTextHasSkill(normalizedJob, k)).slice(0, 40)
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
  return scoreTargets(cvText, targets)
}

function scoreTargets(cvText: string, targets: string[]): MatchResult {

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
  const normalizedCv = normalize(cvText)
  for (const skill of targets) {
    if (normalizedTextHasSkill(normalizedCv, skill)) matched.push(skill)
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

/** Compare every current template, retaining the legacy Power Platform tie preference. */
export function scoreDualTracks(
  jobText: string,
  cvs: Record<CvTrack, MasterCv>,
  extractedSkills: string[] = []
): DualTrackMatch {
  return createCvMatcher(cvs)(jobText, extractedSkills)
}

/** Prepare CV text and the keyword lexicon once for a batch of inbox jobs. */
export function createCvMatcher(cvs: Record<CvTrack, MasterCv>) {
  const ids = Object.keys(cvs)
  if (!ids.length) throw new Error('Add at least one CV template before matching jobs.')
  const seed = uniqueSkills(ids.flatMap((id) => masterCvSkillList(cvs[id])))
  const lexicon = uniqueSkills([...seed, ...COMMON_JD_KEYWORDS])
  const texts = Object.fromEntries(ids.map((id) => [id, masterCvSearchText(cvs[id])]))
  return (jobText: string, extractedSkills: string[] = []): DualTrackMatch => {
    const extracted = withRequirementSignals(jobText, extractedSkills)
    const normalizedJob = normalize(jobText)
    const targets = extracted.length ? extracted
      : lexicon.filter((keyword) => normalizedTextHasSkill(normalizedJob, keyword)).slice(0, 40)
    const scores = Object.fromEntries(ids.map((id) => [id, scoreTargets(texts[id], targets)]))
    let bestTrack = ids.includes('powerPlatform') ? 'powerPlatform' : ids[0]
    for (const id of ids) if (scores[id].score > scores[bestTrack].score) bestTrack = id
    return { scores, bestTrack, bestScore: scores[bestTrack].score }
  }
}

export function dualTrackReasonLine(dual: DualTrackMatch, names: Record<string, string> = CV_TRACK_LABELS): string {
  return `Scores: ${formatDualTrackScores(dual, names)}`
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
  skills: { skill: string; state: 'have' | 'added' | 'missing' }[]
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
      skills: [],
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
  const matchedKeys = new Set(matchedKeywords.map((skill) => skill.trim().toLowerCase().replace(/\s+/g, ' ')))
  const skills = result.targets.map((skill) => {
    const key = skill.trim().toLowerCase().replace(/\s+/g, ' ')
    const state = matchedKeys.has(key) ? 'have' : isClaimed(skill) ? 'added' : 'missing'
    return { skill, state } as const
  })
  const coveragePercent = Math.round(
    ((matchedKeywords.length + claimedKeywords.length) / result.targets.length) * 100
  )

  const suggestions = [
    coveragePercent >= 70
      ? 'Strong overlap with this JD — worth applying with light keyword polish.'
      : coveragePercent >= 45
        ? 'Partial overlap — apply if the missing items are real experience you can phrase honestly.'
        : 'Weak overlap — consider skipping unless you truly have the missing stack.',
  ]

  return {
    coveragePercent,
    matchedKeywords,
    claimedKeywords,
    missingKeywords,
    skills,
    suggestions,
  }
}

export function formatDualTrackScores(dual: DualTrackMatch, names: Record<string, string> = CV_TRACK_LABELS): string {
  return Object.keys(dual.scores).map((id) => `${names[id] ?? id} ${dual.scores[id].score}%`).join(' · ')
}
