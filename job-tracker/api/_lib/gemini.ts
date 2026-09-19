import {
  getGeminiApiKey,
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
  options: { maxOutputTokens?: number; retries?: number; model?: string; failover?: boolean } = {}
): Promise<string> {
  const apiKey = getGeminiApiKey(env)
  const model = options.model || getGeminiLiteModel(env)
  const maxOutputTokens = options.maxOutputTokens ?? 4096
  const retries = options.retries ?? 2
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens },
      }),
    })

    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
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

    const errorBody = await response.text()
    throw new Error(`AI request failed (${response.status}): ${errorBody.slice(0, 400)}`)
  }

  throw lastError ?? new Error('AI request failed')
}

/** High-volume actions: parse, cover letter, resume import. */
export async function generateGeminiLiteText(
  prompt: string,
  env: ServerEnv,
  options: { maxOutputTokens?: number; retries?: number } = {}
): Promise<string> {
  return generateGeminiText(prompt, env, {
    ...options,
    model: getGeminiLiteModel(env),
  })
}

/**
 * Tailor: 3.8, then 3.7, then 3.6, then Flash Lite.
 * Switch immediately on 429, 503, a missing model, or an empty reply.
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

  for (const model of models) {
    try {
      const text = await generateGeminiText(prompt, env, {
        model,
        maxOutputTokens,
        retries: 0,
        failover: true,
      })
      try {
        extractJsonObject(text)
      } catch {
        sawJson = true
        continue
      }
      return { text, model }
    } catch (err) {
      if (!(err instanceof GeminiTryNextModelError)) throw err
      if (err.reason !== 'not_found') sawBusy = true
    }
  }

  if (sawBusy) {
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
