/**
 * Servidor local que expõe /api/* com os mesmos handlers da Vercel.
 *   npm run dev:api   (porta 3001; o Vite faz proxy de /api para cá)
 */
import { createServer } from 'node:http'

process.env.NODE_ENV ??= 'development'

const routes: Record<string, () => Promise<{ default: (req: any, res: any) => Promise<void> }>> = {
  '/api/lookup': () => import('../api/lookup.js'),
}

createServer(async (req, res) => {
  const load = routes[(req.url ?? '').split('?')[0]]
  if (!load) {
    res.statusCode = 404
    return res.end()
  }
  const mod = await load()
  await mod.default(req, res)
}).listen(3001, () => console.log('API local em http://localhost:3001'))
