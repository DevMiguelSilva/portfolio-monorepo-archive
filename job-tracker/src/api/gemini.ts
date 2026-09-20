import type { MasterCv } from '../types/cv'
import type { JobApplication, ParsedJobPosting, UserProfile } from '../types/job'
import { callGemini } from './client'

export async function parseJobPosting(description: string): Promise<ParsedJobPosting> {
  return callGemini<ParsedJobPosting>({ action: 'parse', description })
}

export async function generateCoverLetter(
  job: JobApplication,
  profile: UserProfile
): Promise<string> {
  return callGemini<string>({ action: 'coverLetter', job, profile })
}

export interface TailorCvResult {
  headline?: string
  summary?: string
  skills?: MasterCv['skills']
  experience?: MasterCv['experience']
  projects?: MasterCv['projects']
  coverLetter?: string
  /** Set by the server when a fallback model wrote the draft. */
  tailorModel?: string
}

export async function tailorMasterCv(
  job: JobApplication,
  masterCv: MasterCv,
  profile: UserProfile
): Promise<TailorCvResult> {
  return callGemini<TailorCvResult>({
    action: 'tailorCv',
    job,
    profile,
    masterCv,
    claimedSkills: job.claimedSkills ?? [],
  })
}

/** Plain definition of one term. High-quota models, separate from resume tailoring. */
export async function explainSkill(skill: string): Promise<string> {
  return callGemini<string>({ action: 'explainSkill', skill })
}

export async function parseResumeText(
  resumeText: string,
  track: 'frontend' | 'powerPlatform'
): Promise<Partial<MasterCv>> {
  return callGemini<Partial<MasterCv>>({
    action: 'parseResume',
    resumeText,
    track,
  })
}
