import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const source = readFileSync(new URL('../src/lib/errorMessage.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { getErrorMessage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('plain Supabase schema errors retain their useful message', () => {
  const failure = { code: '42703', message: 'column job_applications.not_selected does not exist', details: null }
  assert.equal(getErrorMessage(failure, 'Request failed'), failure.message)
})

test('Error instances and unknown failures use the expected message or fallback', () => {
  assert.equal(getErrorMessage(new Error('Save failed'), 'Fallback'), 'Save failed')
  for (const failure of [null, undefined, 'unexpected', {}, { message: 42 }, { message: '  ' }]) {
    assert.equal(getErrorMessage(failure, 'Fallback'), 'Fallback')
  }
})

test('error messages remain escaped text when rendered by React', () => {
  const message = getErrorMessage({ message: '<img src=x onerror=alert(1)>' }, 'Fallback')
  const markup = renderToStaticMarkup(React.createElement('p', { role: 'alert' }, message))
  assert.ok(markup.includes('&lt;img'))
  assert.ok(!markup.includes('<img'))
})
