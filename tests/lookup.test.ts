import { beforeEach, describe, expect, it } from 'vitest'
import { type BuyerRecord } from '../api/_lib/classify.js'
import { OFFERS } from '../api/_lib/config.js'
import { buildIndex, parseBlack2025Csv } from '../api/_lib/indexing.js'
import { resetRateLimitForTests } from '../api/_lib/http.js'
import { setIndexForTests } from '../api/_lib/index.js'
import lookup from '../api/lookup.js'

process.env.EMAIL_HASH_SECRET = 'segredo-de-teste-segredo-de-teste-0123456789'

/** Dados 100% fictícios (domínio reservado example.com). */
const FIXTURE: BuyerRecord[] = [
  { id: 't1', emails: ['aluno.geral@example.com'], cpfs: ['52998224725'], segmento: 'ALUNO_GERAL', consulta_email: 'APTO_APOS_VERIFICACAO_EMAIL' },
  { id: 't2', emails: ['xr.pec@example.com', 'xr.pec.alt@example.com'], cpfs: ['11144477735'], segmento: 'XR_PEC', consulta_email: 'APTO_APOS_VERIFICACAO_EMAIL' },
  { id: 't3', emails: ['sem.cpf@example.com'], cpfs: [], segmento: 'ALUNO_GERAL', consulta_email: 'APTO_APOS_VERIFICACAO_EMAIL' },
  { id: 't4a', emails: ['duplicado@example.com'], cpfs: ['52998224725'], segmento: 'ALUNO_GERAL', consulta_email: 'REVISAO_MANUAL' },
  { id: 't4b', emails: ['duplicado@example.com'], cpfs: ['39053344705'], segmento: 'XR_PEC', consulta_email: 'REVISAO_MANUAL' },
  { id: 't5', emails: ['revisao@example.com'], cpfs: ['16899535009'], segmento: 'ALUNO_GERAL', consulta_email: 'REVISAO_MANUAL' },
  { id: 't6a', emails: ['dup.sem.flag@example.com'], cpfs: ['12345678909'], segmento: 'ALUNO_GERAL', consulta_email: 'APTO_APOS_VERIFICACAO_EMAIL' },
  { id: 't6b', emails: ['dup.sem.flag@example.com'], cpfs: ['12345678909'], segmento: 'XR_PEC', consulta_email: 'APTO_APOS_VERIFICACAO_EMAIL' },
  { id: 't7', emails: ['dois.cpfs@example.com'], cpfs: ['52998224725', '11144477735'], segmento: 'XR_PEC', consulta_email: 'APTO_APOS_VERIFICACAO_EMAIL' },
  // comprador da Black Friday 2025 que também está na base como aluno
  { id: 't8', emails: ['bf2025.aluno@example.com'], cpfs: ['39053344705'], segmento: 'ALUNO_GERAL', consulta_email: 'APTO_APOS_VERIFICACAO_EMAIL' },
]

/** Compradores pagos da Black Friday 2025 (fictícios): um na base, um fora, um em revisão. */
const BLACK_2025 = ['bf2025.aluno@example.com', 'Bf2025.Fora@Example.com ', 'revisao@example.com']

const buildTestIndex = () => buildIndex(FIXTURE, BLACK_2025, process.env.EMAIL_HASH_SECRET).index

async function call(body: unknown, opts: { method?: string; ip?: string; origin?: string } = {}) {
  const out: { status: number; body: any } = { status: 0, body: null }
  const req: any = {
    method: opts.method ?? 'POST',
    headers: { 'x-real-ip': opts.ip ?? '203.0.113.10', host: 'oferta.test', ...(opts.origin ? { origin: opts.origin } : {}) },
    body,
    socket: {},
  }
  const res: any = {
    statusCode: 200,
    headersSent: false,
    setHeader() {},
    end(p: string) {
      out.status = res.statusCode
      out.body = p ? JSON.parse(p) : null
      res.headersSent = true
    },
  }
  await (lookup as any)(req, res)
  return out
}

beforeEach(() => {
  setIndexForTests(buildTestIndex())
  resetRateLimitForTests()
})

describe('consulta direta por e-mail', () => {
  it('1. e-mail fora da base → Público geral', async () => {
    const r = await call({ email: 'ninguem@example.com' })
    expect(r.body.status).toBe('offer')
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.PUBLICO_GERAL.checkoutUrl)
    expect(r.body.offer.price).toBe('R$ 3.447,00')
    expect(r.body.offer.badge).toBeUndefined()
  })

  it('2. comprador de e-book/planilha/outro curso (segmento ALUNO_GERAL) → Aluno geral', async () => {
    const r = await call({ email: 'aluno.geral@example.com' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_GERAL.checkoutUrl)
    expect(r.body.offer.price).toBe('R$ 2.947,00')
    expect(r.body.offer.installments).toBe('12x de R$ 313,86')
  })

  it('3. comprador da Black Friday 2025 → 50% de desconto', async () => {
    const r = await call({ email: 'bf2025.aluno@example.com' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_BLACK_2025.checkoutUrl)
    expect(r.body.offer.price).toBe('R$ 1.973,50')
    expect(r.body.offer.installments).toBe('12x de R$ 210,16')
    expect(r.body.offer.badge).toBe('50% DE DESCONTO')
    expect(r.body.offer.text).toMatch(/Black Friday NaFazenda do ano passado/)
  })

  it('3b. comprador da Black Friday 2025 que não está na base de alunos também recebe os 50% (e-mail normalizado)', async () => {
    const r = await call({ email: 'bf2025.fora@example.com' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_BLACK_2025.checkoutUrl)
  })

  it('3c. aluno xR Pec (segmento XR_PEC) também tem os 50%, com o texto de xR Pec', async () => {
    for (const email of ['xr.pec@example.com', 'xr.pec.alt@example.com']) {
      const r = await call({ email })
      expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_XR_PEC.checkoutUrl)
      expect(r.body.offer.price).toBe('R$ 1.973,50')
      expect(r.body.offer.badge).toBe('50% DE DESCONTO')
      expect(r.body.offer.text).toMatch(/Por já fazer parte do xR Pec/)
    }
  })

  it('3d. quem é xR Pec e também comprou a Black Friday 2025 continua com os 50% (uma vez só)', async () => {
    const { index, stats } = buildIndex(FIXTURE, [...BLACK_2025, 'xr.pec@example.com'], process.env.EMAIL_HASH_SECRET)
    setIndexForTests(index)
    expect(stats.black2025.alsoXrPec).toBe(1)
    const r = await call({ email: 'xr.pec@example.com' })
    expect(r.body.offer.price).toBe('R$ 1.973,50')
    expect(OFFERS.ALUNO_XR_PEC.checkoutUrl).toBe(OFFERS.ALUNO_BLACK_2025.checkoutUrl)
    expect(OFFERS.ALUNO_XR_PEC.price).toBe(OFFERS.ALUNO_BLACK_2025.price)
  })

  it('4. prioridade: 50% (xR Pec / Black Friday 2025) > Aluno geral > Público geral', async () => {
    expect(OFFERS.ALUNO_XR_PEC.priority).toBeGreaterThan(OFFERS.ALUNO_GERAL.priority)
    expect(OFFERS.ALUNO_BLACK_2025.priority).toBeGreaterThan(OFFERS.ALUNO_GERAL.priority)
    expect(OFFERS.ALUNO_GERAL.priority).toBeGreaterThan(OFFERS.PUBLICO_GERAL.priority)
  })

  it('4b. comprador da Black Friday 2025 que está em revisão na base vai para conferência (não ganha 50% automático)', async () => {
    const r = await call({ email: 'revisao@example.com' })
    expect(r.body.status).toBe('review')
  })

  it('4c. leitura do CSV: só linhas pagas, e-mail limpo, aceita BOM e CRLF', () => {
    const csv = '\uFEFFNome;E-mail;Produto;Status\r\nA;a@x.com;BF;Paga\r\nB;b@x.com;BF;Reembolsada\r\nC; C@X.com ;BF;paga\r\n'
    expect(parseBlack2025Csv(csv)).toEqual(['a@x.com', 'C@X.com'])
  })

  it('5. registro sem CPF continua válido', async () => {
    const r = await call({ email: 'sem.cpf@example.com' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_GERAL.checkoutUrl)
  })

  it('6. maiúsculas são normalizadas', async () => {
    const r = await call({ email: 'BF2025.Aluno@Example.COM' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_BLACK_2025.checkoutUrl)
  })

  it('7. espaços nas pontas são removidos; espaço no meio é inválido', async () => {
    const ok = await call({ email: '  aluno.geral@example.com  ' })
    expect(ok.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_GERAL.checkoutUrl)
    const bad = await call({ email: 'aluno geral@example.com' })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toBe('invalid_email')
  })

  it('8. registro duplicado (com ou sem marcação) → análise, sem desconto automático', async () => {
    for (const email of ['duplicado@example.com', 'dup.sem.flag@example.com']) {
      const r = await call({ email })
      expect(r.body.status).toBe('review')
      expect(JSON.stringify(r.body)).not.toMatch(/lastlink|R\$|offer/)
    }
  })

  it('9. CPFs conflitantes / marcado para revisão → análise', async () => {
    for (const email of ['revisao@example.com', 'dois.cpfs@example.com']) {
      const r = await call({ email })
      expect(r.body.status).toBe('review')
      expect(JSON.stringify(r.body)).not.toMatch(/lastlink|R\$|offer/)
    }
  })
})

describe('segurança', () => {
  it('10. manipulação de checkout: campos extras enviados pelo cliente são ignorados', async () => {
    const r = await call({
      email: 'ninguem@example.com',
      tier: 'ALUNO_BLACK_2025',
      segmento: 'XR_PEC',
      checkoutUrl: OFFERS.ALUNO_BLACK_2025.checkoutUrl,
      offer: OFFERS.ALUNO_BLACK_2025,
    })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.PUBLICO_GERAL.checkoutUrl)
  })

  it('11. a resposta não vaza regra interna, segmento, id ou prioridade', async () => {
    const r = await call({ email: 'bf2025.aluno@example.com' })
    expect(JSON.stringify(r.body)).not.toMatch(/priority|tier|segmento|XR_PEC|ALUNO_GERAL|ALUNO_BLACK|\"t8\"|REVISAO/)
  })

  it('12. o índice publicado não contém e-mails nem CPFs legíveis', () => {
    const idx = JSON.stringify(buildTestIndex())
    expect(idx).not.toMatch(/example\.com|@|52998224725/)
    for (const k of Object.keys(buildTestIndex())) expect(k).toMatch(/^[0-9a-f]{32}$/)
  })

  it('13. sem EMAIL_HASH_SECRET a API falha de forma genérica (sem detalhe técnico)', async () => {
    const keep = process.env.EMAIL_HASH_SECRET
    delete process.env.EMAIL_HASH_SECRET
    const r = await call({ email: 'xr.pec@example.com' })
    process.env.EMAIL_HASH_SECRET = keep
    expect(r.status).toBe(503)
    expect(r.body.error).toBe('temporary')
    expect(JSON.stringify(r.body)).not.toMatch(/EMAIL_HASH_SECRET|stack/i)
  })

  it('14. limite por IP (429) e por janela; outros IPs não são afetados', async () => {
    let last: any
    for (let i = 0; i < 31; i++) last = await call({ email: `lote${i}@example.com` }, { ip: '192.0.2.77' })
    expect(last.status).toBe(429)
    expect(last.body.error).toBe('rate_limited')
    expect((await call({ email: 'ninguem@example.com' }, { ip: '192.0.2.78' })).status).toBe(200)
  })

  it('15. método e origem inválidos; corpo inválido', async () => {
    expect((await call({}, { method: 'GET' })).status).toBe(405)
    expect((await call({ email: 'a@example.com' }, { origin: 'https://evil.example' })).status).toBe(403)
    expect((await call('texto')).status).toBe(400)
    expect((await call({ email: 123 })).status).toBe(400)
  })
})
