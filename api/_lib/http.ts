import type { IncomingMessage, ServerResponse } from 'node:http'
import { RATE_LIMIT } from './config.js'

type Req = IncomingMessage & { body?: unknown }
type Res = ServerResponse

export function send(res: Res, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(JSON.stringify(body))
}

/** Mensagem genérica: nunca expõe detalhes técnicos. */
export const GENERIC_ERROR = 'Não foi possível concluir agora. Tente novamente em instantes.'

export function clientIp(req: Req): string {
  const h = req.headers
  const v =
    (h['x-real-ip'] as string) ||
    (h['x-vercel-forwarded-for'] as string) ||
    ((h['x-forwarded-for'] as string) || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  return v.trim()
}

/** Aceita só requisições do próprio site (ou de ALLOWED_ORIGINS, separadas por vírgula). */
function originAllowed(req: Req): boolean {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    if (new URL(origin).host === req.headers.host) return true
    const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
    return extra.includes(origin)
  } catch {
    return false
  }
}

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > 4_000) throw new Error('payload_too_large')
    chunks.push(c as Buffer)
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

/** Limite por IP em memória (melhor esforço: cada instância serverless tem o seu contador). */
const hits = new Map<string, { n: number; reset: number }>()
export function rateLimited(ip: string, now = Date.now()): number {
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
  const cur = hits.get(ip)
  if (!cur || cur.reset <= now) {
    hits.set(ip, { n: 1, reset: now + RATE_LIMIT.windowMs })
    return 0
  }
  cur.n += 1
  return cur.n > RATE_LIMIT.max ? Math.ceil((cur.reset - now) / 1000) : 0
}
export const resetRateLimitForTests = () => hits.clear()

export type Handler = (ctx: { res: Res; body: Record<string, unknown>; ip: string }) => Promise<void>

/** Envelope comum: método, origem, corpo JSON limitado e tratamento de erros sem vazar detalhes. */
export function route(handler: Handler) {
  return async (req: Req, res: Res) => {
    try {
      if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST' })
      if (!originAllowed(req)) return send(res, 403, { error: 'forbidden' })
      let body: unknown
      try {
        body = await readBody(req)
      } catch {
        return send(res, 400, { error: 'bad_request' })
      }
      if (typeof body !== 'object' || body === null || Array.isArray(body)) return send(res, 400, { error: 'bad_request' })
      await handler({ res, body: body as Record<string, unknown>, ip: clientIp(req) })
    } catch (e) {
      console.error(`[api] erro nome=${(e as Error)?.name} msg=${(e as Error)?.message}`) // sem dados pessoais
      if (!res.headersSent) send(res, 503, { error: 'temporary', message: GENERIC_ERROR })
    }
  }
}
