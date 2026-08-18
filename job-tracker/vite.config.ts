import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { routeApi } from './api/_lib/handlers.js'
import type { ServerEnv } from './api/_lib/env.js'

function localApiPlugin(env: ServerEnv): Plugin {
  return {
    name: 'applytrack-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/') || req.method === 'OPTIONS') {
          if (req.method === 'OPTIONS' && req.url?.startsWith('/api/')) {
            res.statusCode = 204
            res.end()
            return
          }
          return next()
        }

        try {
          const chunks: Buffer[] = []
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
            req.on('end', () => resolve())
            req.on('error', reject)
          })

          let body: unknown = undefined
          const raw = Buffer.concat(chunks).toString('utf8')
          if (raw) {
            try {
              body = JSON.parse(raw)
            } catch {
              body = raw
            }
          }

          const result = await routeApi(req.url, req.method || 'GET', body, env)
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Local API error',
            })
          )
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') as ServerEnv
  return {
    plugins: [react(), localApiPlugin(env)],
  }
})
