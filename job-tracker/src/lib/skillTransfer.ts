import { textHasSkill } from './matchScore'

export type TransferDifficulty = 'very-easy' | 'easy' | 'moderate' | 'hard' | 'gap'

export interface TransferSuggestion {
  skill: string
  relatedOwned: string[]
  difficulty: TransferDifficulty
  /** True = worth confirming as a near-match. */
  checkIt: boolean
}

const DIFFICULTY_RANK: Record<TransferDifficulty, number> = {
  'very-easy': 0,
  easy: 1,
  moderate: 2,
  hard: 3,
  gap: 4,
}

interface SkillFamily {
  members: string[]
}

/** Skills in the same family are usually a short hop, not a new career. */
const FAMILIES: SkillFamily[] = [
  {
    members: [
      'sql',
      't-sql',
      'sql server',
      'postgresql',
      'mysql',
      'sqlite',
      'bigquery',
      'snowflake',
      'synapse',
      'microsoft fabric',
      'data modeling',
    ],
  },
  {
    members: [
      'power bi',
      'looker studio',
      'google looker studio',
      'google data studio',
      'tableau',
      'excel',
      'power query',
      'dax',
      'data modeling',
    ],
  },
  {
    members: [
      'power automate',
      'power apps',
      'n8n',
      'zapier',
      'make',
      'integromat',
      'logic apps',
      'copilot studio',
      'power virtual agents',
    ],
  },
  {
    members: [
      'power apps',
      'power pages',
      'dataverse',
      'sharepoint',
      'microsoft graph',
      'spfx',
      'power platform',
    ],
  },
  {
    members: ['rest api', 'rest apis', 'apis', 'graphql', 'microsoft graph', 'web api'],
  },
  {
    members: [
      'python',
      'javascript',
      'typescript',
      'google apps script',
      'apps script',
      'powershell',
      'c#',
    ],
  },
  {
    members: [
      'react',
      'next.js',
      'vue',
      'angular',
      'javascript',
      'typescript',
      'html',
      'css',
      'tailwind',
    ],
  },
  {
    members: ['azure', 'azure functions', 'azure devops', 'aws', 'gcp', 'google cloud'],
  },
]

/** Extra hops that are not the same product family but still learnable. */
const CROSS_LINKS: { missing: string[]; related: string[]; difficulty: TransferDifficulty }[] = [
  {
    missing: ['google apps script', 'apps script'],
    related: ['python', 'javascript', 'typescript', 'rest api', 'power automate'],
    difficulty: 'moderate',
  },
  {
    missing: ['bigquery'],
    related: ['sql', 'data modeling', 'rest api', 'apis'],
    difficulty: 'easy',
  },
  {
    missing: ['looker studio', 'google looker studio', 'google data studio'],
    related: ['power bi', 'excel', 'data modeling'],
    difficulty: 'very-easy',
  },
  {
    missing: ['n8n'],
    related: ['power automate', 'rest api', 'apis', 'python'],
    difficulty: 'easy',
  },
  {
    missing: ['zapier', 'make', 'integromat'],
    related: ['power automate', 'rest api', 'apis'],
    difficulty: 'very-easy',
  },
  {
    missing: ['graphql'],
    related: ['rest api', 'apis', 'javascript', 'typescript'],
    difficulty: 'easy',
  },
  {
    missing: ['spfx', 'sharepoint framework'],
    related: ['react', 'typescript', 'sharepoint', 'javascript'],
    difficulty: 'easy',
  },
  {
    missing: ['power pages'],
    related: ['power apps', 'dataverse', 'html', 'css'],
    difficulty: 'easy',
  },
]

function skillKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const value = raw.trim()
    const key = skillKey(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function relatedOwned(needles: string[], ownedSkills: string[]): string[] {
  const hits: string[] = []
  for (const needle of needles) {
    const found = ownedSkills.find((owned) => textHasSkill(owned, needle) || textHasSkill(needle, owned))
    if (found) hits.push(found)
  }
  return uniqueLabels(hits)
}

function familyRelated(missing: string, ownedSkills: string[]): string[] {
  const hits: string[] = []
  for (const family of FAMILIES) {
    const inFamily = family.members.some((member) => textHasSkill(missing, member) || textHasSkill(member, missing))
    if (!inFamily) continue
    for (const member of family.members) {
      if (textHasSkill(missing, member) || textHasSkill(member, missing)) continue
      hits.push(...relatedOwned([member], ownedSkills))
    }
  }
  return uniqueLabels(hits)
}

function crossRelated(missing: string, ownedSkills: string[]): {
  related: string[]
  difficulty: TransferDifficulty
} | null {
  const rule = CROSS_LINKS.find((row) =>
    row.missing.some((alias) => textHasSkill(missing, alias) || textHasSkill(alias, missing))
  )
  if (!rule) return null
  const related = relatedOwned(rule.related, ownedSkills)
  if (related.length === 0) return null
  return { related, difficulty: rule.difficulty }
}

function difficultyFromFamilyCount(count: number): TransferDifficulty {
  if (count >= 3) return 'very-easy'
  if (count === 2) return 'easy'
  return 'easy'
}

function difficultyFromCrossCount(count: number, rule: TransferDifficulty): TransferDifficulty {
  if (count >= 3) return rule === 'very-easy' ? 'easy' : rule
  if (count === 2) return rule === 'very-easy' || rule === 'easy' ? 'easy' : 'moderate'
  if (rule === 'very-easy') return 'easy'
  if (rule === 'easy') return 'moderate'
  return 'hard'
}

export function transferDifficultyLabel(difficulty: TransferDifficulty): string {
  if (difficulty === 'very-easy') return 'Very easy'
  if (difficulty === 'easy') return 'Easy'
  if (difficulty === 'moderate') return 'Moderate'
  if (difficulty === 'hard') return 'Hard'
  return 'Big gap'
}

export function transferDifficultyClass(difficulty: TransferDifficulty): string {
  if (difficulty === 'very-easy') return 'text-emerald-700 dark:text-emerald-300'
  if (difficulty === 'easy') return 'text-teal-700 dark:text-teal-300'
  if (difficulty === 'moderate') return 'text-amber-700 dark:text-amber-300'
  if (difficulty === 'hard') return 'text-orange-700 dark:text-orange-300'
  return 'font-medium text-rose-700 dark:text-rose-300'
}

export type TransferCheck = 'yes' | 'probably' | 'unlikely' | 'no'

export function transferCheck(difficulty: TransferDifficulty): TransferCheck {
  if (difficulty === 'very-easy' || difficulty === 'easy') return 'yes'
  if (difficulty === 'moderate') return 'probably'
  if (difficulty === 'hard') return 'unlikely'
  return 'no'
}

/**
 * Rank every missing JD skill against the Master CV.
 * 1 Very easy · 2 Easy · 3 Moderate · 4 Hard · 5 Big gap
 */
export function suggestTransferableSkills(
  missingKeywords: string[],
  ownedSkills: string[]
): TransferSuggestion[] {
  const owned = uniqueLabels(ownedSkills)
  if (missingKeywords.length === 0) return []

  const suggestions: TransferSuggestion[] = []

  for (const skill of missingKeywords) {
    const fromFamily = familyRelated(skill, owned)
    const fromCross = crossRelated(skill, owned)

    let relatedOwnedSkills = uniqueLabels([
      ...fromFamily,
      ...(fromCross?.related ?? []),
    ])
    let difficulty: TransferDifficulty

    if (fromFamily.length > 0) {
      difficulty = difficultyFromFamilyCount(fromFamily.length)
      if (fromFamily.length === 1 && fromCross && fromCross.related.length >= 2) {
        difficulty = 'very-easy'
      }
    } else if (fromCross && fromCross.related.length > 0) {
      difficulty = difficultyFromCrossCount(fromCross.related.length, fromCross.difficulty)
    } else {
      difficulty = 'gap'
      relatedOwnedSkills = []
    }

    const check = transferCheck(difficulty)
    suggestions.push({
      skill,
      relatedOwned: relatedOwnedSkills,
      difficulty,
      checkIt: check === 'yes' || check === 'probably',
    })
  }

  return suggestions.sort((a, b) => {
    const diff = DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]
    if (diff !== 0) return diff
    if (a.checkIt !== b.checkIt) return a.checkIt ? -1 : 1
    return b.relatedOwned.length - a.relatedOwned.length
  })
}
