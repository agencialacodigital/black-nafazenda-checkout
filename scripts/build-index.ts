/**
 * Gera api/_data/index.generated.ts a partir do JSON de origem.
 *   npm run data:build [-- caminho/do/origem.json]
 * Requer EMAIL_HASH_SECRET (no .env local). O mesmo valor precisa estar na Vercel.
 * O índice guarda só HMAC(e-mail) → código (X/A/R). Nenhum e-mail, CPF ou id vai para o repositório.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { classify, toIndexCode, type BuyerRecord } from '../api/_lib/classify.js'
import { emailKey, hashSecret, normalizeEmail } from '../api/_lib/identity.js'

const source = process.argv[2] || 'data-source/consulta_xr_pec_atualizada_privada.json'
const data = JSON.parse(readFileSync(source, 'utf8')) as { records: BuyerRecord[] }
if (!Array.isArray(data.records)) throw new Error('Origem inválida: "records" ausente')

const secret = hashSecret()
const byEmail = new Map<string, BuyerRecord[]>()
for (const r of data.records) {
  for (const e of r.emails ?? []) {
    const n = normalizeEmail(e)
    if (!n) continue
    const list = byEmail.get(n) ?? []
    if (!list.includes(r)) list.push(r)
    byEmail.set(n, list)
  }
}

const index: Record<string, string> = {}
const counts: Record<string, number> = { X: 0, A: 0, R: 0 }
for (const [email, recs] of [...byEmail].sort()) {
  const code = toIndexCode(classify(recs))
  if (!code) continue
  const key = emailKey(email, secret)
  if (index[key] && index[key] !== code) index[key] = 'R' // colisão improvável: na dúvida, análise
  else index[key] = code
  counts[code]++
}

const ordered = Object.fromEntries(Object.entries(index).sort(([a], [b]) => (a < b ? -1 : 1)))
writeFileSync(
  'api/_data/index.generated.ts',
  `// Arquivo gerado por \`npm run data:build\`. Não edite à mão.\n// Contém apenas HMAC dos e-mails (sem dados pessoais legíveis).\nexport const INDEX: Record<string, 'X' | 'A' | 'R'> = ${JSON.stringify(ordered)}\n`,
)

console.log(`Origem: ${source}`)
console.log(`E-mails na base: ${byEmail.size} | Aluno xR Pec (X): ${counts.X} | Aluno geral (A): ${counts.A} | Análise (R): ${counts.R}`)
console.log('Índice gravado em api/_data/index.generated.ts')
