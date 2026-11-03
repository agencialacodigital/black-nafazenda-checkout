import { decide, publicOffer } from './_lib/classify.js'
import { route, send, rateLimited } from './_lib/http.js'
import { emailKey, normalizeEmail } from './_lib/identity.js'
import { lookupCode } from './_lib/index.js'

/**
 * Recebe o e-mail e devolve a condição (e o link de checkout) decidida pelo servidor.
 * Sem banco de dados: consulta um índice estático com e-mails em hash (HMAC).
 */
export default route(async ({ res, body, ip }) => {
  const email = normalizeEmail(body.email)
  if (!email) return send(res, 400, { error: 'invalid_email', message: 'Confira o e-mail digitado e tente novamente.' })

  const wait = rateLimited(ip)
  if (wait) {
    return send(res, 429, { error: 'rate_limited', message: 'Muitas consultas seguidas. Aguarde alguns minutos e tente novamente.' }, { 'Retry-After': String(wait) })
  }

  const outcome = decide(lookupCode(emailKey(email)))
  if (outcome.kind === 'review') return send(res, 200, { status: 'review' })
  send(res, 200, { status: 'offer', offer: publicOffer(outcome.offer) })
})
