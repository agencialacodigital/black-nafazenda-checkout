export interface PublicOffer {
  variant: 'geral' | 'aluno' | 'top'
  headline: string
  text: string
  cta: string
  listPrice: string
  price: string
  installments: string
  badge?: string
  checkoutUrl: string
}

export type LookupData = { status: 'offer'; offer: PublicOffer } | { status: 'review' }

export type LookupResult =
  | { ok: true; data: LookupData }
  | { ok: false; kind: 'validation' | 'rate' | 'temporary'; message: string }

const GENERIC = 'Não foi possível concluir agora. Tente novamente em instantes.'

export async function lookup(email: string): Promise<LookupResult> {
  try {
    const res = await fetch('/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(15000),
    })
    let json: any = null
    try {
      json = await res.json()
    } catch {
      /* resposta sem corpo válido */
    }
    if (res.ok && json && (json.status === 'offer' || json.status === 'review')) return { ok: true, data: json as LookupData }
    // Só usamos a mensagem do servidor para erros conhecidos; qualquer outra coisa vira texto genérico.
    if (json?.error === 'invalid_email') return { ok: false, kind: 'validation', message: json.message }
    if (json?.error === 'rate_limited') return { ok: false, kind: 'rate', message: json.message }
    return { ok: false, kind: 'temporary', message: GENERIC }
  } catch {
    return { ok: false, kind: 'temporary', message: 'Sem conexão no momento. Verifique sua internet e tente novamente.' }
  }
}
