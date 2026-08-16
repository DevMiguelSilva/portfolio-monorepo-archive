/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOVIE_APP_URL?: string
  readonly VITE_JOB_TRACKER_URL?: string
  readonly VITE_GITHUB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
