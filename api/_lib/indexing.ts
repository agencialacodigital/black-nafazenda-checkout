import { BLACK_2025_OVERRIDES_REVIEW, type IndexCode } from './config.js'
import { classify, toIndexCode, type BuyerRecord } from './classify.js'
import { emailKey, normalizeEmail } from './identity.js'

export interface IndexStats {
  total: number
  counts: Record<IndexCode, number>
  black2025: { listed: number; granted: number; alsoXrPec: number; outsideBase: number; keptInReview: number }
}

/**
 * Monta o índice (HMAC do e-mail → código). Usado pelo `npm run data:build` e pelos testes.
 *  - registros da base: classificação normal (Aluno xR Pec 'X', Aluno geral 'A' ou revisão 'R')
 *  - e-mails da Black Friday 2025: viram 'B' (50%); quem já é 'X' continua 'X'; quem está em revisão continua 'R'
 */
export function buildIndex(records: BuyerRecord[], black2025: Iterable<string>, secret?: string) {
  const byEmail = new Map<string, BuyerRecord[]>()
  for (const r of records) {
    for (const e of r.emails ?? []) {
      const n = normalizeEmail(e)
      if (!n) continue
      const list = byEmail.get(n) ?? []
      if (!list.includes(r)) list.push(r)
      byEmail.set(n, list)
    }
  }

  const codes = new Map<string, IndexCode>()
  for (const [email, recs] of byEmail) {
    const code = toIndexCode(classify(recs))
    if (code) codes.set(email, code)
  }

  const stats: IndexStats = { total: 0, counts: { X: 0, B: 0, A: 0, R: 0 }, black2025: { listed: 0, granted: 0, alsoXrPec: 0, outsideBase: 0, keptInReview: 0 } }
  const bf = new Set<string>()
  for (const raw of black2025) {
    const n = normalizeEmail(raw)
    if (n) bf.add(n)
  }
  for (const email of bf) {
    stats.black2025.listed++
    if (!byEmail.has(email)) stats.black2025.outsideBase++
    if (codes.get(email) === 'R' && !BLACK_2025_OVERRIDES_REVIEW) {
      stats.black2025.keptInReview++
      continue
    }
    stats.black2025.granted++
    if (codes.get(email) === 'X') {
      stats.black2025.alsoXrPec++ // já tem 50% como aluno xR Pec: mantém
      continue
    }
    codes.set(email, 'B')
  }

  const index: Record<string, IndexCode> = {}
  for (const [email, code] of [...codes].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const key = emailKey(email, secret)
    index[key] = index[key] && index[key] !== code ? 'R' : code // colisão improvável: na dúvida, análise
    stats.counts[code]++
  }
  stats.total = codes.size
  return { index, stats }
}

/** Lê o CSV de compradores (separador ;). Só conta linhas com status "Paga". Retorna e-mails. */
export function parseBlack2025Csv(text: string): string[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  const header = lines[0].split(';').map((h) => h.trim().toLowerCase())
  const iEmail = header.indexOf('e-mail')
  const iStatus = header.indexOf('status')
  if (iEmail < 0) throw new Error('CSV sem coluna "E-mail"')
  const out: string[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split(';')
    if (iStatus >= 0 && (cols[iStatus] ?? '').trim().toLowerCase() !== 'paga') continue
    const email = (cols[iEmail] ?? '').trim()
    if (email) out.push(email)
  }
  return out
}
