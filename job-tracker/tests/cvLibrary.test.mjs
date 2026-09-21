import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function moduleUrl(path, replacements = {}) {
  let source = readFileSync(new URL(path, import.meta.url), 'utf8')
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to)
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}
const typesUrl = moduleUrl('../src/types/cv.ts')
const { createDefaultLibrary, createEmptyMasterCv, normalizeLibrary } = await import(typesUrl)
const { addCvTemplate, removeCvTemplate, deleteLocalCv, resolveJobCv, recoverCvTransaction } = await import(moduleUrl('../src/lib/cvLibrary.ts', { '../types/cv': typesUrl }))
const { scoreDualTracks, createCvMatcher, textHasSkill } = await import(moduleUrl('../src/lib/matchScore.ts', { '../types/cv': typesUrl }))

test('legacy and dynamic libraries retain CV content, IDs, names and attachments', () => {
  const legacy = createDefaultLibrary()
  delete legacy.version
  delete legacy.names
  legacy.activeTrack = 'frontend'
  legacy.attachments.frontend = { fileName: 'old.docx', extractedText: 'original' }
  const migrated = normalizeLibrary(legacy)
  assert.equal(migrated.activeTrack, 'frontend')
  assert.equal(migrated.names.frontend, 'React')
  assert.equal(migrated.attachments.frontend.extractedText, 'original')
  const copied = addCvTemplate(migrated, 'Data analyst', 'frontend')
  copied.cvs[copied.activeTrack].contact.name = 'Different'
  assert.notEqual(copied.cvs.frontend.contact.name, 'Different')
  assert.deepEqual(normalizeLibrary(copied), copied)
  assert.equal(normalizeLibrary(migrated.cvs.frontend).cvs.frontend.contact.name, migrated.cvs.frontend.contact.name)
})

test('deletion reassigns Saved references only and preserves historical documents', () => {
  const library = createDefaultLibrary()
  const jobs = [{ id: 'saved', status: 'saved', cvTrack: null }, { id: 'submitted', status: 'applied', cvTrack: 'powerPlatform' }]
  const searches = [{ id: 'search', track: 'powerPlatform' }, { id: 'auto', track: 'auto' }]
  const inbox = [{ id: 'inbox', matchedTrack: 'powerPlatform', matchScore: 90 }]
  assert.throws(() => removeCvTemplate(library, 'powerPlatform', undefined, jobs, searches, inbox), /replacement/)
  const next = removeCvTemplate(library, 'powerPlatform', 'frontend', jobs, searches, inbox)
  assert.equal(next.jobs[0].cvTrack, 'frontend')
  assert.equal(next.jobs[0].needsRescore, true)
  assert.equal(next.jobs[0].matchScore, null)
  assert.deepEqual(next.jobs[1], jobs[1])
  assert.equal(next.searches[0].track, 'frontend')
  assert.equal(next.searches[1].track, 'auto')
  assert.equal(next.inbox[0].matchedTrack, 'frontend')
  assert.throws(() => removeCvTemplate(next.library, 'frontend', undefined, [], [], []), /at least one/)
  const snapshot = createEmptyMasterCv({ summary: 'Submitted original' })
  assert.equal(resolveJobCv(next.library, jobs[1], { masterCvSnapshot: snapshot }), snapshot)
  assert.equal(resolveJobCv(next.library, jobs[1]), null)
  assert.equal(resolveJobCv(next.library, next.jobs[0]), next.library.cvs.frontend)
})

test('Auto scores every current template and keeps legacy tie preference', () => {
  const blank = createEmptyMasterCv()
  assert.equal(scoreDualTracks('', { frontend: blank, powerPlatform: blank, custom: blank }).bestTrack, 'powerPlatform')
  const custom = createEmptyMasterCv({ skills: [{ id: 'skills', group: 'Data', items: ['Python', 'SQL'] }] })
  const match = scoreDualTracks('Python SQL developer', { frontend: blank, custom })
  assert.equal(match.bestTrack, 'custom')
  assert.deepEqual(Object.keys(match.scores), ['frontend', 'custom'])
})

test('prepared batch matching preserves aliases, boundaries, requirements and live CV changes', () => {
  const library = createDefaultLibrary()
  const score = createCvMatcher(library.cvs)
  const job = 'Developer\nReact.js, TS, RESTful APIs, French and bilingual communication.'
  assert.deepEqual(score(job), scoreDualTracks(job, library.cvs))
  assert.ok(score(job).scores.frontend.targets.includes('French'))
  assert.ok(score(job).scores.frontend.missing.includes('French'))
  assert.equal(textHasSkill('React.js and TS with RESTful APIs', 'React'), true)
  assert.equal(textHasSkill('React.js and TS with RESTful APIs', 'TypeScript'), true)
  assert.equal(textHasSkill('classical typography', 'CSS'), false)
  const changed = {...library.cvs, frontend:{...library.cvs.frontend, summary:'French bilingual communicator'}}
  assert.ok(createCvMatcher(changed)(job).scores.frontend.matched.includes('French'))
  assert.ok(score(job).scores.frontend.missing.includes('French'))
})

test('local deletion rolls back every record after a write failure and recovers interrupted writes', () => {
  const library = createDefaultLibrary()
  const values = new Map([['applytrack-master-cv', JSON.stringify(library)], ['job-tracker-applications', JSON.stringify([{ id: 'saved', status: 'saved', cvTrack: 'powerPlatform' }])], ['applytrack-saved-searches', '[]'], ['applytrack-inbox', '[]']])
  const before = new Map(values)
  let fail = true
  const storage = { getItem: (key) => values.get(key) ?? null, removeItem: (key) => values.delete(key), setItem: (key, value) => {
    if (key === 'applytrack-saved-searches' && fail) { fail = false; throw new Error('Disk full') }
    values.set(key, value)
  } }
  assert.throws(() => deleteLocalCv(storage, library, 'powerPlatform', 'frontend'), /Disk full/)
  assert.deepEqual(values, before)
  storage.setItem('applytrack-cv-library-transaction', JSON.stringify([...before.values()]))
  storage.setItem('applytrack-master-cv', '{}')
  recoverCvTransaction(storage)
  assert.deepEqual(values, before)
  assert.equal(deleteLocalCv(storage, library, 'powerPlatform', 'frontend').activeTrack, 'frontend')
})
