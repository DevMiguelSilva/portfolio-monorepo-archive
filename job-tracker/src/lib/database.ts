import type { JobApplication, UserProfile } from '../types/job'

export interface JobRow {
  id: string
  user_id: string
  company: string
  role: string
  location: string
  job_url: string
  salary: string
  status: JobApplication['status']
  applied_date: string
  notes: string
  job_description: string
  extracted_skills: string[]
  extracted_requirements: string[]
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  name: string
  headline: string
  skills: string
  experience_summary: string
  updated_at: string
}

export function rowToJob(row: JobRow): JobApplication {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    jobUrl: row.job_url,
    salary: row.salary,
    status: row.status,
    appliedDate: row.applied_date,
    notes: row.notes,
    jobDescription: row.job_description,
    extractedSkills: row.extracted_skills ?? [],
    extractedRequirements: row.extracted_requirements ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function jobToRow(job: JobApplication, userId: string): Omit<JobRow, 'created_at' | 'updated_at'> {
  return {
    id: job.id,
    user_id: userId,
    company: job.company,
    role: job.role,
    location: job.location,
    job_url: job.jobUrl,
    salary: job.salary,
    status: job.status,
    applied_date: job.appliedDate,
    notes: job.notes,
    job_description: job.jobDescription,
    extracted_skills: job.extractedSkills,
    extracted_requirements: job.extractedRequirements,
  }
}

export function rowToProfile(row: ProfileRow): UserProfile {
  return {
    name: row.name,
    headline: row.headline,
    skills: row.skills,
    experienceSummary: row.experience_summary,
  }
}

export function profileToRow(profile: UserProfile, userId: string) {
  return {
    id: userId,
    name: profile.name,
    headline: profile.headline,
    skills: profile.skills,
    experience_summary: profile.experienceSummary,
    updated_at: new Date().toISOString(),
  }
}
