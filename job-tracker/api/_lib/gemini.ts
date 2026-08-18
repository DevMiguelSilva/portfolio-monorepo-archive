import { getGeminiApiKey, getGeminiModel, type ServerEnv } from './env.js'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function generateGeminiText(
  prompt: string,
  env: ServerEnv,
  options: { maxOutputTokens?: number; retries?: number } = {}
): Promise<string> {
  const apiKey = getGeminiApiKey(env)
  const model = getGeminiModel(env)
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
        `Model "${model}" not found. Set GEMINI_MODEL=gemini-3.5-flash (or try gemini-2.0-flash).`
      )
    }
    if (response.status === 429) {
      lastError = new Error(
        'Gemini rate limit reached. Wait a minute and try again, or check quota at https://ai.dev/rate-limit'
      )
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
