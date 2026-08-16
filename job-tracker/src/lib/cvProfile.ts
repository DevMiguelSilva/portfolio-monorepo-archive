import type { MasterCv } from '../types/cv'
import { masterCvSkillList } from '../types/cv'
import type { UserProfile } from '../types/job'

/** Build the AI profile payload from a Master CV (replaces the old Profile page). */
export function masterCvToProfile(cv: MasterCv): UserProfile {
  const bulletSample = cv.experience
    .flatMap((e) => e.bullets.map((b) => b.text))
    .filter(Boolean)
    .slice(0, 8)

  return {
    name: cv.contact.name,
    headline: cv.headline,
    skills: masterCvSkillList(cv).join(', '),
    experienceSummary: [cv.summary, ...bulletSample].filter(Boolean).join('\n'),
  }
}

export function isMasterCvReadyForAi(cv: MasterCv): boolean {
  return Boolean(cv.contact.name.trim() && (cv.summary.trim() || cv.experience.length > 0))
}
