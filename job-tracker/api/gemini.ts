import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleGemini } from './_lib/handlers.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const result = await handleGemini(req.body, process.env)
  return res.status(result.status).json(result.body)
}
