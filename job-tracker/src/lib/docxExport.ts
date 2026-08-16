import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  LevelFormat,
  Packer,
  Paragraph,
  PositionalTab,
  PositionalTabAlignment,
  PositionalTabLeader,
  PositionalTabRelativeTo,
  TextRun,
  type IBorderOptions,
  type ParagraphChild,
} from 'docx'
import type { MasterCv } from '../types/cv'
import { formatEducationDates } from '../types/cv'

/**
 * ATS-oriented export:
 * - Bierstadt (matches user's Master resume; widely available on Windows/M365)
 * - Standard section titles
 * - Single-column body (no layout tables)
 * - Native Word bullets
 * - Grouped skills + clickable contact links
 */
const FONT = 'Bierstadt'

const SIZE = {
  name: 56, // 28pt
  headline: 28, // 14pt
  section: 22, // 11pt
  body: 20, // 10pt
  contact: 20,
} as const

const MARGIN = 720 // 0.5"
const BULLET_REF = 'resume-bullets'

const sectionBorder: IBorderOptions = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: '000000',
  space: 4,
}

/** Remove illegal path characters; keep spaces. */
function safeNameKeepSpaces(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/** Compact person name for file stems: "Miguel Silva" → "MiguelSilva" */
export function compactPersonName(name: string): string {
  const cleaned = safeNameKeepSpaces(name || 'Candidate').replace(/\s+/g, '')
  return cleaned || 'Candidate'
}

export function tailoredDocFilename(candidateName: string): string {
  return `Resume_${compactPersonName(candidateName)}.docx`
}

export function coverLetterDocFilename(candidateName: string): string {
  return `CoverLetter_${compactPersonName(candidateName)}.docx`
}

/** ZIP / folder named after the company, with spaces (no underscores). */
export function applicationPackFilename(company: string): string {
  return `${safeNameKeepSpaces(company || 'Company')}.zip`
}

export function applicationFolderName(company: string): string {
  return safeNameKeepSpaces(company || 'Company')
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Strip characters that confuse some ATS parsers. */
function atsSafe(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function run(
  text: string,
  opts: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}
): TextRun {
  return new TextRun({
    text: atsSafe(text),
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size ?? SIZE.body,
    font: FONT,
    color: opts.color,
  })
}

function sectionHeading(label: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border: { bottom: sectionBorder },
    children: [run(label.toUpperCase(), { bold: true, size: SIZE.section })],
  })
}

function bodyParagraph(text: string, opts: { after?: number } = {}): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: opts.after ?? 80 },
    children: [run(text)],
  })
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 40 },
    numbering: { reference: BULLET_REF, level: 0 },
    children: [run(text)],
  })
}

/** Right-align date on the same line (PositionalTab lives inside a TextRun in docx v9). */
function lineWithRightDate(
  leftChildren: ParagraphChild[],
  dates: string,
  opts: { before?: number; after?: number } = {}
): Paragraph {
  const dateText = atsSafe(dates)
  const children: ParagraphChild[] = [...leftChildren]
  if (dateText) {
    children.push(
      new TextRun({
        size: SIZE.body,
        font: FONT,
        children: [
          new PositionalTab({
            alignment: PositionalTabAlignment.RIGHT,
            relativeTo: PositionalTabRelativeTo.MARGIN,
            leader: PositionalTabLeader.NONE,
          }),
          dateText,
        ],
      })
    )
  }
  return new Paragraph({
    spacing: { before: opts.before ?? 80, after: opts.after ?? 40 },
    children,
  })
}

function experienceHeader(company: string, title: string, location: string, dates: string): Paragraph {
  const left: ParagraphChild[] = []
  if (company.trim()) {
    left.push(run(company, { bold: true }))
  }
  const rest = [title, location].map(atsSafe).filter(Boolean).join(', ')
  if (rest) {
    left.push(
      new TextRun({
        text: company.trim() ? `, ${rest}` : rest,
        size: SIZE.body,
        font: FONT,
      })
    )
  }
  // Extra space after the header so bullets don't sit flush under it
  return lineWithRightDate(left, dates, { before: 120, after: 160 })
}

/** Bold only the part before the first comma (degree / cert name). */
function educationOrCertHeader(label: string, dates: string, opts?: { before?: number }): Paragraph {
  const clean = atsSafe(label)
  const comma = clean.indexOf(',')
  const left: ParagraphChild[] =
    comma === -1
      ? [run(clean, { bold: true })]
      : [
          run(clean.slice(0, comma), { bold: true }),
          new TextRun({
            text: clean.slice(comma),
            size: SIZE.body,
            font: FONT,
          }),
        ]
  return lineWithRightDate(left, dates, {
    before: opts?.before ?? 80,
    after: 40,
  })
}

/** Grouped skill lines — space after colon + trailing period. */
function skillsParagraphs(cv: MasterCv): Paragraph[] {
  const groups = cv.skills.filter((g) => g.items.some((i) => i.trim()) || g.group.trim())
  if (groups.length === 0) return []

  if (groups.length === 1 && !groups[0].group.trim()) {
    const items = [...new Set(groups[0].items.map((i) => atsSafe(i)).filter(Boolean))]
    const line = items.join(', ')
    return [bodyParagraph(line.endsWith('.') ? line : `${line}.`, { after: 120 })]
  }

  return groups.map((g, index) => {
    const items = [...new Set(g.items.map((i) => atsSafe(i)).filter(Boolean))]
    const label = atsSafe(g.group) || 'Skills'
    const list = items.join(', ')
    const withPeriod = list.endsWith('.') ? list : `${list}.`
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: index === groups.length - 1 ? 120 : 40 },
      children: [
        run(`${label}:`, { bold: true }),
        // Leading space must not go through atsSafe().trim()
        new TextRun({
          text: ` ${withPeriod}`,
          size: SIZE.body,
          font: FONT,
        }),
      ],
    })
  })
}

function skillsLinesForHtml(cv: MasterCv): string {
  const groups = cv.skills.filter((g) => g.items.some((i) => i.trim()) || g.group.trim())
  if (groups.length === 0) return ''
  if (groups.length === 1 && !groups[0].group.trim()) {
    const items = [...new Set(groups[0].items.map((i) => atsSafe(i)).filter(Boolean))].join(', ')
    return items.endsWith('.') ? items : `${items}.`
  }
  return groups
    .map((g) => {
      const items = [...new Set(g.items.map((i) => atsSafe(i)).filter(Boolean))].join(', ')
      const list = items.endsWith('.') ? items : `${items}.`
      return `${atsSafe(g.group) || 'Skills'}: ${list}`
    })
    .join('\n')
}

/** Clickable links only for LinkedIn (not email or other URLs). */
function linkedInHref(raw: string): string | null {
  const value = atsSafe(raw)
  if (!value || !/linkedin\.com/i.test(value)) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value.replace(/^\/+/, '')}`
}

function contactChildren(cv: MasterCv): ParagraphChild[] {
  const parts: { text: string; href: string | null }[] = [
    { text: cv.contact.email, href: null },
    { text: cv.contact.phone, href: null },
    { text: cv.contact.location, href: null },
    ...cv.contact.links.map((link) => ({ text: link, href: linkedInHref(link) })),
  ].filter((p) => atsSafe(p.text))

  const children: ParagraphChild[] = []
  parts.forEach((part, index) => {
    // Do not use run()/atsSafe here — trim() would collapse " | " to "|"
    if (index > 0) {
      children.push(
        new TextRun({
          text: ' | ',
          bold: true,
          size: SIZE.contact,
          font: FONT,
        })
      )
    }
    const label = atsSafe(part.text)
    if (part.href) {
      children.push(
        new ExternalHyperlink({
          link: part.href,
          children: [
            new TextRun({
              text: label,
              bold: true,
              size: SIZE.contact,
              font: FONT,
              color: '0563C1',
              underline: {},
            }),
          ],
        })
      )
    } else {
      children.push(run(label, { bold: true, size: SIZE.contact }))
    }
  })
  return children
}

export async function buildCvDocxBlob(cv: MasterCv): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [run(cv.contact.name || 'Resume', { bold: true, size: SIZE.name })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [run(cv.headline || 'Software Engineer', { bold: true, size: SIZE.headline })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: contactChildren(cv),
    }),
  ]

  const skillParas = skillsParagraphs(cv)
  if (skillParas.length > 0) {
    children.push(sectionHeading('Skills'), ...skillParas)
  }

  if (cv.summary.trim()) {
    children.push(sectionHeading('Summary'), bodyParagraph(cv.summary.trim(), { after: 120 }))
  }

  if (cv.experience.length > 0) {
    children.push(sectionHeading('Experience'))
    for (const exp of cv.experience) {
      const dates = [exp.start, exp.current ? 'Present' : exp.end].filter(Boolean).join(' - ')
      const bullets = exp.bullets.filter((b) => b.text.trim()).slice(0, 6)
      children.push(
        experienceHeader(exp.company, exp.title, exp.location, dates),
        ...bullets.map((b) => bulletParagraph(b.text.trim()))
      )
    }
  }

  if (cv.projects.length > 0) {
    children.push(sectionHeading('Projects'))
    for (const project of cv.projects) {
      const projectChildren: ParagraphChild[] = [run(project.name || 'Project', { bold: true })]
      if (project.url.trim()) {
        projectChildren.push(
          new TextRun({
            text: ` | ${atsSafe(project.url)}`,
            size: SIZE.body,
            font: FONT,
          })
        )
      }
      const bullets = project.bullets.filter((b) => b.text.trim()).slice(0, 4)
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: projectChildren,
        }),
        ...bullets.map((b) => bulletParagraph(b.text.trim()))
      )
    }
  }

  if (cv.education.length > 0) {
    children.push(sectionHeading('Education'))
    for (const edu of cv.education) {
      const label = [edu.degree, edu.school].filter(Boolean).join(', ')
      children.push(educationOrCertHeader(label, formatEducationDates(edu)))
    }
  }

  const certifications = cv.certifications ?? []
  if (certifications.length > 0) {
    children.push(sectionHeading('Certifications'))
    for (const cert of certifications) {
      const label = [cert.name, cert.issuer].filter(Boolean).join(', ')
      children.push(educationOrCertHeader(label, cert.year || ''))
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: SIZE.body,
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: BULLET_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '-',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

export async function downloadCvDocx(cv: MasterCv, filename: string): Promise<void> {
  const blob = await buildCvDocxBlob(cv)
  triggerDownload(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`)
}

function coverLetterParagraphs(letter: string): Paragraph[] {
  if (!letter.trim()) {
    return [bodyParagraph('(Empty cover letter)', { after: 120 })]
  }

  return letter.replace(/\r\n/g, '\n').split('\n').map((line) => {
    const text = atsSafe(line)
    return new Paragraph({
      spacing: { after: text ? 120 : 80 },
      children: text
        ? [run(text)]
        : [new TextRun({ text: '', size: SIZE.body, font: FONT })],
    })
  })
}

export async function buildCoverLetterDocxBlob(
  letter: string,
  meta: { company: string; role: string; candidateName?: string }
): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [run(meta.candidateName || 'Cover Letter', { bold: true, size: SIZE.name })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        run(`${atsSafe(meta.role) || 'Role'} - ${atsSafe(meta.company) || 'Company'}`, {
          bold: true,
          size: SIZE.headline,
        }),
      ],
    }),
    ...coverLetterParagraphs(letter),
  ]

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: SIZE.body,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

export async function downloadCoverLetterDocx(
  letter: string,
  meta: { company: string; role: string; candidateName?: string },
  filename?: string
): Promise<void> {
  const blob = await buildCoverLetterDocxBlob(letter, meta)
  triggerDownload(
    blob,
    filename || coverLetterDocFilename(meta.candidateName || 'Candidate')
  )
}

/**
 * Downloads a ZIP that expands to a company-named folder (spaces kept):
 *   Boardwalk REIT/
 *     Resume_MiguelSilva.docx
 *     CoverLetter_MiguelSilva.docx  (if letter provided)
 */
export async function downloadApplicationPack(options: {
  company: string
  role: string
  tailoredCv: MasterCv
  coverLetter?: string
}): Promise<void> {
  const JSZip = (await import('jszip')).default
  const person = options.tailoredCv.contact.name || 'Candidate'
  const folderName = applicationFolderName(options.company)
  const zip = new JSZip()
  const folder = zip.folder(folderName)
  if (!folder) throw new Error('Could not create application folder')

  const resumeBlob = await buildCvDocxBlob(options.tailoredCv)
  folder.file(tailoredDocFilename(person), resumeBlob)

  const letter = (options.coverLetter || '').trim()
  if (letter) {
    const letterBlob = await buildCoverLetterDocxBlob(letter, {
      company: options.company,
      role: options.role,
      candidateName: person,
    })
    folder.file(coverLetterDocFilename(person), letterBlob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(zipBlob, applicationPackFilename(options.company))
}

export function openCvPrintWindow(cv: MasterCv, title: string): void {
  const skills = skillsLinesForHtml(cv)
  const expHtml = cv.experience
    .map((exp) => {
      const dates = [exp.start, exp.current ? 'Present' : exp.end]
        .filter(Boolean)
        .map(atsSafe)
        .join(' - ')
      const company = atsSafe(exp.company)
      const rest = [exp.title, exp.location].map(atsSafe).filter(Boolean).join(', ')
      const bullets = exp.bullets
        .filter((b) => b.text.trim())
        .slice(0, 6)
        .map((b) => `<li>${escapeHtml(atsSafe(b.text))}</li>`)
        .join('')
      return `<div class="job">
        <div class="job-head">
          <span><strong>${escapeHtml(company)}</strong>${rest ? `, ${escapeHtml(rest)}` : ''}</span>
          <span class="dates">${escapeHtml(dates)}</span>
        </div>
        <ul>${bullets}</ul>
      </div>`
    })
    .join('')

  const projectsHtml = cv.projects
    .map((p) => {
      const bullets = p.bullets
        .filter((b) => b.text.trim())
        .slice(0, 4)
        .map((b) => `<li>${escapeHtml(atsSafe(b.text))}</li>`)
        .join('')
      const urlHtml = p.url.trim() ? ` | ${escapeHtml(atsSafe(p.url))}` : ''
      return `<div class="job"><div class="job-head"><span><strong>${escapeHtml(atsSafe(p.name))}</strong>${urlHtml}</span></div><ul>${bullets}</ul></div>`
    })
    .join('')

  const formatEduCertLabel = (label: string) => {
    const clean = atsSafe(label)
    const comma = clean.indexOf(',')
    if (comma === -1) return `<strong>${escapeHtml(clean)}</strong>`
    return `<strong>${escapeHtml(clean.slice(0, comma))}</strong>${escapeHtml(clean.slice(comma))}`
  }

  const eduHtml = cv.education
    .map((edu) => {
      const label = [edu.degree, edu.school].filter(Boolean).map(atsSafe).join(', ')
      return `<div class="job-head"><span>${formatEduCertLabel(label)}</span><span class="dates">${escapeHtml(atsSafe(formatEducationDates(edu)))}</span></div>`
    })
    .join('')

  const certHtml = (cv.certifications ?? [])
    .map((cert) => {
      const label = [cert.name, cert.issuer].filter(Boolean).map(atsSafe).join(', ')
      return `<div class="job-head"><span>${formatEduCertLabel(label)}</span><span class="dates">${escapeHtml(atsSafe(cert.year || ''))}</span></div>`
    })
    .join('')

  const contactParts = [
    { text: cv.contact.email, href: null as string | null },
    { text: cv.contact.phone, href: null as string | null },
    { text: cv.contact.location, href: null as string | null },
    ...cv.contact.links.map((link) => ({ text: link, href: linkedInHref(link) })),
  ]
    .filter((p) => atsSafe(p.text))
    .map((p) => {
      const label = escapeHtml(atsSafe(p.text))
      return p.href ? `<a href="${escapeHtml(p.href)}">${label}</a>` : label
    })
    .join(' | ')

  const skillsHtml = skills
    ? skills
        .split('\n')
        .map((line) => {
          const idx = line.indexOf(': ')
          if (idx === -1) return `<p>${escapeHtml(line)}</p>`
          const label = line.slice(0, idx)
          const rest = line.slice(idx + 2)
          return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(rest)}</p>`
        })
        .join('')
    : ''

  const html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 0.5in; }
      body {
        font-family: Bierstadt, Calibri, Arial, sans-serif;
        font-size: 10pt;
        color: #000;
        line-height: 1.35;
        max-width: 7.5in;
        margin: 0.5in auto;
      }
      h1 { font-size: 28pt; font-weight: 700; margin: 0 0 2px; }
      .headline { font-size: 14pt; font-weight: 700; margin: 0 0 4px; }
      .contact { font-size: 10pt; font-weight: 700; margin: 0 0 12px; }
      .contact a { color: #0563C1; }
      h2 {
        font-size: 11pt;
        font-weight: 700;
        text-transform: uppercase;
        border-bottom: 1px solid #000;
        margin: 14px 0 8px;
        padding-bottom: 2px;
      }
      p { margin: 0 0 6px; text-align: left; }
      .job { margin-bottom: 6px; }
      .job-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 8px 0 10px;
      }
      .job-head .dates { font-weight: 400; white-space: nowrap; }
      ul { margin: 0 0 4px 1.2em; padding: 0; }
      li { margin: 0 0 2px; text-align: left; }
      a { color: #0563C1; }
      @media print { body { margin: 0; max-width: none; } }
    </style></head><body>
      <h1>${escapeHtml(atsSafe(cv.contact.name))}</h1>
      <p class="headline">${escapeHtml(atsSafe(cv.headline || 'Software Engineer'))}</p>
      <p class="contact">${contactParts}</p>
      ${skillsHtml ? `<h2>Skills</h2>${skillsHtml}` : ''}
      ${cv.summary.trim() ? `<h2>Summary</h2><p>${escapeHtml(atsSafe(cv.summary))}</p>` : ''}
      ${expHtml ? `<h2>Experience</h2>${expHtml}` : ''}
      ${projectsHtml ? `<h2>Projects</h2>${projectsHtml}` : ''}
      ${eduHtml ? `<h2>Education</h2>${eduHtml}` : ''}
      ${certHtml ? `<h2>Certifications</h2>${certHtml}` : ''}
    </body></html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000')
  if (!win) throw new Error('Pop-up blocked — allow pop-ups to print/PDF')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 250)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
