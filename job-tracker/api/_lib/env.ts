export interface ServerEnv {
  ADZUNA_APP_ID?: string
  ADZUNA_APP_KEY?: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  VITE_GEMINI_API_KEY?: string
  VITE_GEMINI_MODEL?: string
}

export function getGeminiApiKey(env: ServerEnv): string {
  const key = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error(
      'Missing GEMINI_API_KEY. Set it in Vercel env (or .env for local) from https://aistudio.google.com/apikey'
    )
  }
  return key
}

export function getGeminiModel(env: ServerEnv): string {
  return env.GEMINI_MODEL || env.VITE_GEMINI_MODEL || 'gemini-3.5-flash'
}

export function getAdzunaCredentials(env: ServerEnv): { appId: string; appKey: string } {
  const appId = env.ADZUNA_APP_ID
  const appKey = env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    throw new Error(
      'Missing ADZUNA_APP_ID / ADZUNA_APP_KEY. Register at https://developer.adzuna.com/ and add them to env.'
    )
  }
  return { appId, appKey }
}
