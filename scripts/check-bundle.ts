/** Falha se algo sensível aparecer no que é publicado ao navegador (dist/). Rode após `npm run build`. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const FORBIDDEN = [/lastlink\.com\/p\//i, /C4EBD51A4|C68D9A50D|C98EBABFE/, /APTO_APOS_VERIFICACAO_EMAIL/, /REVISAO_MANUAL/, /XR_PEC/, /ALUNO_GERAL/, /"records"/, /EMAIL_HASH_SECRET/]
let bad = 0
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
for (const f of walk('dist')) {
  if (/\.(woff2?|png|jpg|ico)$/.test(f)) continue
  if (/consulta.*\.json$/i.test(f)) { console.error('ARQUIVO PRIVADO NO DIST:', f); bad++; continue }
  const txt = readFileSync(f, 'utf8')
  for (const re of FORBIDDEN) if (re.test(txt)) { console.error(`${f}: contém ${re}`); bad++ }
}
if (bad) process.exit(1)
console.log('dist/ limpo: sem checkout, regras, base ou segredos.')
