/**
 * Valida o JSON privado ANTES de publicar.
 *   npm run data:validate -- caminho/do/novo.json     (padrão: private-data/consulta.json)
 * Sai com código 1 se houver erro estrutural. Não imprime e-mails nem CPFs.
 */
import { readFileSync } from 'node:fs'
import { ELIGIBLE_FLAG, SEGMENT_TO_TIER } from '../api/_lib/config.js'
import { normalizeEmail } from '../api/_lib/identity.js'

function normalizeCpf(raw: unknown): string | null {
  const d = String(raw).replace(/[.\-\s]/g, '')
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return null
  const dv = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]) ? d : null
}

const file = process.argv[2] || 'data-source/consulta_xr_pec_atualizada_privada.json'
const data = JSON.parse(readFileSync(file, 'utf8'))
const errors: string[] = []
const warnings: string[] = []

if (!Array.isArray(data.records)) {
  console.error('ERRO: campo "records" ausente ou inválido')
  process.exit(1)
}

const ids = new Set<string>()
const byEmail = new Map<string, any[]>()
const byCpf = new Map<string, Set<string>>()
const counts = new Map<string, number>()

data.records.forEach((r: any, i: number) => {
  const where = `registro #${i} (id=${r?.id ?? '?'})`
  if (!r || typeof r.id !== 'string' || !r.id) return errors.push(`${where}: id ausente`)
  if (ids.has(r.id)) errors.push(`${where}: id repetido`)
  ids.add(r.id)
  if (!Array.isArray(r.emails) || r.emails.length === 0) errors.push(`${where}: sem e-mails`)
  if (!Array.isArray(r.cpfs)) errors.push(`${where}: "cpfs" deve ser lista`)
  if (!(r.segmento in SEGMENT_TO_TIER)) errors.push(`${where}: segmento desconhecido "${r.segmento}"`)
  if (!['APTO_APOS_VERIFICACAO_EMAIL', 'REVISAO_MANUAL'].includes(r.consulta_email)) errors.push(`${where}: consulta_email desconhecido`)
  for (const e of r.emails ?? []) {
    const n = normalizeEmail(e)
    if (!n) errors.push(`${where}: e-mail com sintaxe inválida`)
    else {
      if (n !== e) warnings.push(`${where}: e-mail fora do padrão (maiúsculas/espaços); a API normaliza, mas convém limpar`)
      byEmail.set(n, [...(byEmail.get(n) ?? []), r])
    }
  }
  for (const c of r.cpfs ?? []) {
    const n = normalizeCpf(c)
    if (!n) warnings.push(`${where}: CPF com dígitos verificadores inválidos`)
    else byCpf.set(n, (byCpf.get(n) ?? new Set()).add(r.id))
  }
  if ((r.cpfs ?? []).length > 1) warnings.push(`${where}: mais de um CPF (cairá em análise)`)
  const key = `${r.segmento} / ${r.consulta_email}`
  counts.set(key, (counts.get(key) ?? 0) + 1)
})

const dupEmails = [...byEmail.values()].filter((v) => v.length > 1)
const notFlagged = dupEmails.filter((v) => v.some((r) => r.consulta_email === ELIGIBLE_FLAG))
const sharedCpfs = [...byCpf.values()].filter((s) => s.size > 1)

console.log(`Arquivo: ${file}`)
console.log(`schema_version=${data.schema_version} status=${data.status}`)
console.log(`Registros: ${data.records.length} | e-mails únicos: ${byEmail.size} | CPFs únicos: ${byCpf.size}`)
console.log('Contagem por categoria:')
for (const [k, v] of [...counts].sort()) console.log(`  ${k}: ${v}`)
console.log(`E-mails em mais de um registro: ${dupEmails.length} (a API envia todos para análise manual)`)
console.log(`  dos quais sem marcação REVISAO_MANUAL em algum registro: ${notFlagged.length}`)
console.log(`CPFs compartilhados por registros diferentes: ${sharedCpfs.length}`)
if (warnings.length) console.log(`Avisos: ${warnings.length} (ex.: ${warnings[0]})`)
if (errors.length) {
  console.error(`\n${errors.length} ERRO(S):`)
  errors.slice(0, 20).forEach((e) => console.error('  - ' + e))
  process.exit(1)
}
console.log('\nEstrutura OK.')
