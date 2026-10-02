import {
  getGeminiApiKey,
  getGeminiExplainModels,
  getGeminiLiteModel,
  getGeminiTailorModels,
  type ServerEnv,
} from './env.js'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** A failed attempt that should move on to the next model in a chain. */
export class GeminiTryNextModelError extends Error {
  readonly reason: 'rate_limit' | 'unavailable' | 'not_found' | 'empty'

  constructor(reason: GeminiTryNextModelError['reason'], message: string) {
    super(message)
    this.name = 'GeminiTryNextModelError'
    this.reason = reason
  }
}

const UNAVAILABLE_STATUSES = new Set([500, 502, 503, 504])

export async function generateGeminiText(
  prompt: string,
  env: ServerEnv,
  options: {
    maxOutputTokens?: number
    retries?: number
    model?: string
    failover?: boolean
    timeoutMs?: number
    /** Flash models spend the output budget on hidden thinking unless this is set. */
    disableThinking?: boolean
    /** Ask Gemini to return a JSON object. Used for the resume. */
    jsonMode?: boolean
  } = {}
): Promise<string> {
  const apiKey = getGeminiApiKey(env)
  const model = options.model || getGeminiLiteModel(env)
  const maxOutputTokens = options.maxOutputTokens ?? 4096
  const retries = options.retries ?? 2
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens,
            ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
            ...(options.disableThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      })

      if (response.ok) {
        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        }
        const parts = data.candidates?.[0]?.content?.parts ?? []
        const text = parts.map((part) => part.text ?? '').join('').trim()
        if (!text) {
          const empty = new GeminiTryNextModelError('empty', 'AI returned an empty response')
          if (options.failover) throw empty
          throw new Error(empty.message)
        }
        return text.trim()
      }

      if (response.status === 404) {
        await response.text().catch(() => '')
        const missing = new GeminiTryNextModelError('not_found', `Model "${model}" was not found.`)
        if (options.failover) throw missing
        throw new Error(missing.message)
      }

      if (response.status === 429 || UNAVAILABLE_STATUSES.has(response.status)) {
        await response.text().catch(() => '')
        lastError = new GeminiTryNextModelError(
          response.status === 429 ? 'rate_limit' : 'unavailable',
          response.status === 429
            ? 'Gemini rate limit reached. Wait a minute and try again.'
            : 'This model is busy right now.'
        )
        if (attempt < retries) {
          await sleep(800 * (attempt + 1))
          continue
        }
        if (options.failover) throw lastError
        throw new Error(
          response.status === 429
            ? 'Gemini rate limit reached. Wait a minute and try again, or check quota at https://ai.dev/rate-limit'
            : 'The AI model is busy right now. Wait a minute and try again.'
        )
      }

      if (response.status === 400 && (options.disableThinking || options.jsonMode)) {
        await response.text().catch(() => '')
        return generateGeminiText(prompt, env, {
          ...options,
          disableThinking: false,
          jsonMode: false,
          retries: 0,
        })
      }

      const errorBody = await response.text()
      throw new Error(`AI request failed (${response.status}): ${errorBody.slice(0, 400)}`)
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        const timedOut = new GeminiTryNextModelError('unavailable', 'That model took too long.')
        if (options.failover) throw timedOut
        throw new Error('That took too long. Try again.')
      }
      throw err
    }
  }

  throw lastError ?? new Error('AI request failed')
}

/** High-volume actions: parse, cover letter, resume import. */
export async function generateGeminiLiteText(
  prompt: string,
  env: ServerEnv,
  options: { maxOutputTokens?: number; retries?: number; timeoutMs?: number } = {}
): Promise<string> {
  return generateGeminiText(prompt, env, {
    ...options,
    model: getGeminiLiteModel(env),
  })
}

/**
 * Skill definitions: high-quota Flash-Lite models, not the tailor chain.
 * A busy or slow model is skipped. The call fails only after every model fails.
 */
export async function generateGeminiExplainText(prompt: string, env: ServerEnv): Promise<string> {
  const models = getGeminiExplainModels(env)
  // Try the primary model once more at the end. These lite models often 503 for a moment, then answer.
  const attempts = models[0] ? [...models, models[0]] : models
  let sawBusy = false

  for (const model of attempts) {
    try {
      return await generateGeminiText(prompt, env, {
        model,
        maxOutputTokens: 200,
        retries: 0,
        failover: true,
        timeoutMs: 20000,
      })
    } catch (err) {
      if (!(err instanceof GeminiTryNextModelError)) throw err
      if (err.reason !== 'not_found') sawBusy = true
    }
  }

  if (sawBusy) {
    throw new Error('The AI model is busy right now. Wait a minute and try again.')
  }
  throw new Error(`None of the definition models are available (${models.join(', ')}).`)
}

/**
 * Tailor: 3.8, then 3.7, then 3.6, then Flash Lite, then 3.1 Flash-Lite.
 * A busy or hung model is skipped. If the whole chain is busy, try the two
 * models that usually have capacity one more time.
 */
export async function generateGeminiTailorText(
  prompt: string,
  env: ServerEnv,
  options: { maxOutputTokens?: number } = {}
): Promise<{ text: string; model: string }> {
  const models = getGeminiTailorModels(env)
  const maxOutputTokens = options.maxOutputTokens ?? 8192
  let sawBusy = false
  let sawJson = false

  const attempt = async (model: string) => {
    const text = await generateGeminiText(prompt, env, {
      model,
      maxOutputTokens,
      retries: 0,
      failover: true,
      timeoutMs: 20000,
      disableThinking: !model.includes('lite'),
      jsonMode: true,
    })
    extractJsonObject(text)
    return text
  }

  const run = async (model: string) => {
    try {
      const text = await attempt(model)
      return { text, model }
    } catch (err) {
      if (err instanceof GeminiTryNextModelError) {
        if (err.reason !== 'not_found') sawBusy = true
        return null
      }
      if (err instanceof SyntaxError || (err instanceof Error && /JSON/i.test(err.message))) {
        sawJson = true
        return null
      }
      throw err
    }
  }

  for (const model of models) {
    const result = await run(model)
    if (result) return result
  }

  if (sawBusy) {
    await sleep(1500)
    for (const model of ['gemini-3.6-flash', 'gemini-3.1-flash-lite']) {
      const result = await run(model)
      if (result) return result
    }
    throw new Error('The writing models are busy right now. Wait a minute and try Tailor again.')
  }
  if (sawJson) {
    throw new Error('The models returned an unreadable resume. Wait a minute and try Tailor again.')
  }
  throw new Error(`None of the tailor models are available (${models.join(', ')}).`)
}

export function extractJsonObject<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI response did not contain valid JSON')
  return JSON.parse(match[0]) as T
}

export function extractJsonArray<T>(text: string): T {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('AI response did not contain a valid array')
  return JSON.parse(match[0]) as T
}
