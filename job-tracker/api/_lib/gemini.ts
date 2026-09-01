import {
  getGeminiApiKey,
  getGeminiLiteModel,
  getGeminiTailorFallbackModel,
  getGeminiTailorModel,
  type ServerEnv,
} from './env.js'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class GeminiRateLimitError extends Error {
  constructor(message = 'Gemini rate limit reached. Wait a minute and try again, or check quota at https://ai.dev/rate-limit') {
    super(message)
    this.name = 'GeminiRateLimitError'
  }
}

export async function generateGeminiText(
  prompt: string,
  env: ServerEnv,
  options: { maxOutputTokens?: number; retries?: number; model?: string } = {}
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
      if (!text) throw new Error('AI returned an empty response')
      return text.trim()
    }

    const errorBody = await response.text()
    if (response.status === 404) {
      throw new Error(
        `Model "${model}" not found. Set GEMINI_MODEL_LITE / GEMINI_MODEL_TAILOR (e.g. gemini-3.5-flash-lite, gemini-3.6-flash).`
      )
    }
    if (response.status === 429) {
      lastError = new GeminiRateLimitError()
      if (attempt < retries) {
        await sleep(800 * (attempt + 1))
        continue
      }
      throw lastError
    }
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
 * Tailor: try strongest model first, then fallback when quota/rate-limited.
 * Uses fewer intra-model retries so we can switch models sooner.
 */
export async function generateGeminiTailorText(
  prompt: string,
  env: ServerEnv,
  options: { maxOutputTokens?: number } = {}
): Promise<string> {
  const primary = getGeminiTailorModel(env)
  const fallback = getGeminiTailorFallbackModel(env)
  const maxOutputTokens = options.maxOutputTokens ?? 8192

  try {
    return await generateGeminiText(prompt, env, {
      model: primary,
      maxOutputTokens,
      retries: 1,
    })
  } catch (err) {
    if (!(err instanceof GeminiRateLimitError)) throw err
    if (fallback === primary) throw err
    try {
      return await generateGeminiText(prompt, env, {
        model: fallback,
        maxOutputTokens,
        retries: 1,
      })
    } catch (fallbackErr) {
      if (fallbackErr instanceof GeminiRateLimitError) {
        throw new GeminiRateLimitError(
          `Tailor rate limit on ${primary} and ${fallback}. Try again tomorrow or check quota at https://ai.dev/rate-limit`
        )
      }
      throw fallbackErr
    }
  }
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
