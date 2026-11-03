import { createHmac } from 'node:crypto'

/** Normaliza: remove espaços nas pontas, minúsculas. Retorna null se a sintaxe for inválida. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.normalize('NFKC').trim().toLowerCase()
  if (v.length < 6 || v.length > 254) return null
  if (!/^[^\s@<>()[\],;:"\\]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(v)) return null
  const [local] = v.split('@')
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null
  return v
}

/**
 * Segredo usado para "embaralhar" os e-mails no índice publicado (HMAC-SHA256).
 * Sem ele, o arquivo de índice não permite recuperar nem confirmar e-mails.
 */
export function hashSecret(): string {
  const s = process.env.EMAIL_HASH_SECRET
  if (!s || s.length < 32) throw new Error('EMAIL_HASH_SECRET ausente ou curto (mín. 32 caracteres)')
  return s
}

export function emailKey(email: string, secret = hashSecret()): string {
  return createHmac('sha256', secret).update(`email:${email}`).digest('hex').slice(0, 32)
}
