import mammoth from 'mammoth'
import type { CvCertification, CvEducation, MasterCv } from '../types/cv'
import { createEmptyMasterCv, formatEducationDates, normalizeEducationEntry } from '../types/cv'

/** Heuristic: Microsoft/vendor certs that were stored under Education. */
function looksLikeCertification(degree: string, school: string): boolean {
  const blob = `${degree} ${school}`.toLowerCase()
  return /certif|pl-?\s?900|pl-?\s?100|pl-?\s?200|associate|fundamentals|azure\s|aws\s|scrum/.test(
    blob
  )
}

export function splitEducationAndCerts(
  education: CvEducation[],
  certifications: CvCertification[]
): { education: CvEducation[]; certifications: CvCertification[] } {
  const edu: CvEducation[] = []
  const certs = [...certifications]
  for (const item of education) {
    const normalized = normalizeEducationEntry(item)
    if (looksLikeCertification(normalized.degree, normalized.school)) {
      certs.push({
        id: normalized.id,
        name: normalized.degree || normalized.school,
        issuer: normalized.degree && normalized.school ? normalized.school : '',
        year: formatEducationDates(normalized) || normalized.end || normalized.start,
      })
    } else {
      edu.push(normalized)
    }
  }
  return { education: edu, certifications: certs }
}

const MAX_CHARS = 80_000

export async function extractTextFromResumeFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.txt') || file.type === 'text/plain') {
    const text = await file.text()
    return text.slice(0, MAX_CHARS)
  }

  if (
    name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const buffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    return (result.value || '').slice(0, MAX_CHARS)
  }

  if (name.endsWith('.doc')) {
    throw new Error('Legacy .doc is not supported. Save as .docx or .txt and try again.')
  }

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    throw new Error(
      'PDF upload is not supported yet. Save/export as .docx or .txt, or paste the resume text below.'
    )
  }

  throw new Error('Unsupported file type. Use .docx or .txt')
}

/** Lightweight fallback if AI parse is unavailable — put raw text into summary. */
export function sparseCvFromText(text: string, existing?: MasterCv): MasterCv {
  const base = existing ?? createEmptyMasterCv()
  return {
    ...base,
    summary: text.slice(0, 4000),
    updatedAt: new Date().toISOString(),
  }
}

export function mergeParsedCv(existing: MasterCv, parsed: Partial<MasterCv>): MasterCv {
  const parsedCerts = parsed.certifications?.length ? parsed.certifications : []
  const parsedEdu = parsed.education?.length ? parsed.education : null
  const split = parsedEdu
    ? splitEducationAndCerts(parsedEdu, parsedCerts)
    : {
        education: existing.education,
        certifications: parsedCerts.length ? parsedCerts : existing.certifications ?? [],
      }

  return {
    ...existing,
    contact: {
      ...existing.contact,
      ...(parsed.contact ?? {}),
      links: parsed.contact?.links?.length ? parsed.contact.links : existing.contact.links,
    },
    headline: parsed.headline?.trim() || existing.headline,
    summary: parsed.summary?.trim() || existing.summary,
    skills: parsed.skills?.length ? parsed.skills : existing.skills,
    experience: parsed.experience?.length ? parsed.experience : existing.experience,
    projects: parsed.projects?.length ? parsed.projects : existing.projects,
    education: split.education,
    certifications: split.certifications,
    updatedAt: new Date().toISOString(),
  }
}
