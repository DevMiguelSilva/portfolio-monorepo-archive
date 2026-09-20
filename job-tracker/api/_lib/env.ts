export interface ServerEnv {
  ADZUNA_APP_ID?: string
  ADZUNA_APP_KEY?: string
  GEMINI_API_KEY?: string
  /** @deprecated Prefer GEMINI_MODEL_LITE. Not used for tailor. */
  GEMINI_MODEL?: string
  VITE_GEMINI_API_KEY?: string
  VITE_GEMINI_MODEL?: string
  /** High-volume actions: parse JD, parse resume (default: gemini-3.5-flash-lite). Also the last tailor fallback. */
  GEMINI_MODEL_LITE?: string
  /**
   * Optional comma-separated tailor chain. When unset, tailor tries
   * gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash, then GEMINI_MODEL_LITE.
   */
  GEMINI_MODEL_TAILOR_MODELS?: string
  /**
   * Optional comma-separated skill-definition chain. When unset: gemini-3.1-flash-lite,
   * then gemini-3.1-flash-lite-preview. Kept off the tailor chain.
   */
  GEMINI_MODEL_EXPLAIN_MODELS?: string
  /** @deprecated Ignored. Tailor uses GEMINI_MODEL_TAILOR_MODELS or the built-in chain. */
  GEMINI_MODEL_TAILOR?: string
  /** @deprecated Ignored. Tailor uses GEMINI_MODEL_TAILOR_MODELS or the built-in chain. */
  GEMINI_MODEL_TAILOR_FALLBACK?: string
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

/** Legacy single-model override (oldest configs). */
export function getGeminiModel(env: ServerEnv): string {
  return env.GEMINI_MODEL || env.VITE_GEMINI_MODEL || 'gemini-3.5-flash-lite'
}

/** Parse / cover letter / resume import — high RPD. */
export function getGeminiLiteModel(env: ServerEnv): string {
  return env.GEMINI_MODEL_LITE || 'gemini-3.5-flash-lite'
}

/**
 * Short definitions. High daily quota, and none of these are on the tailor chain.
 * 3.1 Flash-Lite is about 500 requests/day; the preview is a separate quota.
 */
const DEFAULT_EXPLAIN_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-preview']

/** Resume + cover letter, strongest first. Flash Lite is appended as the last resort. */
const DEFAULT_TAILOR_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash']

export function getGeminiExplainModels(env: ServerEnv): string[] {
  const configured = env.GEMINI_MODEL_EXPLAIN_MODELS?.split(',')
    .map((model) => model.trim())
    .filter(Boolean)
  const models: string[] = []
  for (const model of configured?.length ? configured : DEFAULT_EXPLAIN_MODELS) {
    if (!models.includes(model)) models.push(model)
  }
  return models
}

export function getGeminiTailorModels(env: ServerEnv): string[] {
  const configured = env.GEMINI_MODEL_TAILOR_MODELS?.split(',')
    .map((model) => model.trim())
    .filter(Boolean)
  const writers = configured?.length ? configured : DEFAULT_TAILOR_MODELS
  const models: string[] = []
  for (const model of [...writers, getGeminiLiteModel(env), 'gemini-3.1-flash-lite']) {
    if (!models.includes(model)) models.push(model)
  }
  return models
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
