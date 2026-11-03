import { beforeEach, describe, expect, it } from 'vitest'
import { emailKey } from '../api/_lib/identity.js'
import { classify, toIndexCode, type BuyerRecord } from '../api/_lib/classify.js'
import { OFFERS } from '../api/_lib/config.js'
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
]

/** Mesmo procedimento do `npm run data:build`, em memória. */
function buildIndex(records: BuyerRecord[]) {
  const byEmail = new Map<string, BuyerRecord[]>()
  for (const r of records) for (const e of r.emails) byEmail.set(e, [...(byEmail.get(e) ?? []), r])
  const idx: Record<string, 'X' | 'A' | 'R'> = {}
  for (const [email, recs] of byEmail) {
    const c = toIndexCode(classify(recs))
    if (c) idx[emailKey(email)] = c
  }
  return idx
}

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
  setIndexForTests(buildIndex(FIXTURE))
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

  it('3. xR Pec / Elite / Advisor (segmento XR_PEC) → Aluno xR Pec com 50%', async () => {
    const r = await call({ email: 'xr.pec@example.com' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_XR_PEC.checkoutUrl)
    expect(r.body.offer.price).toBe('R$ 1.973,50')
    expect(r.body.offer.badge).toBe('50% DE DESCONTO')
  })

  it('4. prioridade xR Pec > Aluno geral > Público geral; segundo e-mail do mesmo registro também vale', async () => {
    expect(OFFERS.ALUNO_XR_PEC.priority).toBeGreaterThan(OFFERS.ALUNO_GERAL.priority)
    expect(OFFERS.ALUNO_GERAL.priority).toBeGreaterThan(OFFERS.PUBLICO_GERAL.priority)
    const r = await call({ email: 'xr.pec.alt@example.com' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_XR_PEC.checkoutUrl)
  })

  it('5. registro sem CPF continua válido', async () => {
    const r = await call({ email: 'sem.cpf@example.com' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_GERAL.checkoutUrl)
  })

  it('6. maiúsculas são normalizadas', async () => {
    const r = await call({ email: 'XR.Pec@Example.COM' })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.ALUNO_XR_PEC.checkoutUrl)
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
      tier: 'ALUNO_XR_PEC',
      segmento: 'XR_PEC',
      checkoutUrl: OFFERS.ALUNO_XR_PEC.checkoutUrl,
      offer: OFFERS.ALUNO_XR_PEC,
    })
    expect(r.body.offer.checkoutUrl).toBe(OFFERS.PUBLICO_GERAL.checkoutUrl)
  })

  it('11. a resposta não vaza regra interna, segmento, id ou prioridade', async () => {
    const r = await call({ email: 'xr.pec@example.com' })
    expect(JSON.stringify(r.body)).not.toMatch(/priority|tier|segmento|XR_PEC|ALUNO_GERAL|t2|REVISAO/)
  })

  it('12. o índice publicado não contém e-mails nem CPFs legíveis', () => {
    const idx = JSON.stringify(buildIndex(FIXTURE))
    expect(idx).not.toMatch(/example\.com|@|52998224725/)
    for (const k of Object.keys(buildIndex(FIXTURE))) expect(k).toMatch(/^[0-9a-f]{32}$/)
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
