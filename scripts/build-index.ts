/**
 * Gera api/_data/index.generated.ts a partir dos arquivos de origem (pasta data-source/, fora do Git).
 *   npm run data:build [-- base.json compradores-black-2025.csv]
 * Requer EMAIL_HASH_SECRET (no .env local). O mesmo valor precisa estar na Vercel.
 * O índice guarda só HMAC(e-mail) → código (B/A/R). Nenhum e-mail, CPF ou nome vai para o repositório.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import type { BuyerRecord } from '../api/_lib/classify.js'
import { hashSecret } from '../api/_lib/identity.js'
import { buildIndex, parseBlack2025Csv } from '../api/_lib/indexing.js'

const jsonPath = process.argv[2] || 'data-source/consulta_xr_pec_atualizada_privada.json'
const csvPath = process.argv[3] || 'data-source/compradores_black_friday_2025_nafazenda.csv'

const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as { records: BuyerRecord[] }
if (!Array.isArray(data.records)) throw new Error('Origem inválida: "records" ausente')
const bf = parseBlack2025Csv(readFileSync(csvPath, 'utf8'))

const { index, stats } = buildIndex(data.records, bf, hashSecret())

writeFileSync(
  'api/_data/index.generated.ts',
  `// Arquivo gerado por \`npm run data:build\`. Não edite à mão.\n// Contém apenas HMAC dos e-mails (sem dados pessoais legíveis).\nexport const INDEX: Record<string, 'X' | 'B' | 'A' | 'R'> = ${JSON.stringify(index)}\n`,
)

console.log(`Base: ${jsonPath}\nBlack Friday 2025: ${csvPath}`)
console.log(`E-mails no índice: ${stats.total} | Aluno xR Pec (X, 50%): ${stats.counts.X} | Black 2025 (B, 50%): ${stats.counts.B} | Aluno geral (A): ${stats.counts.A} | Conferência (R): ${stats.counts.R}`)
console.log(`Black Friday 2025: ${stats.black2025.listed} e-mails pagos | ${stats.black2025.granted} com 50% (${stats.black2025.alsoXrPec} já eram xR Pec) | ${stats.black2025.keptInReview} mantidos em conferência | ${stats.black2025.outsideBase} fora da base de alunos`)
console.log('Índice gravado em api/_data/index.generated.ts')
