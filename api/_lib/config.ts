/**
 * Configuração central da oferta.
 * Preços, parcelas e links de checkout ficam SOMENTE aqui (servidor).
 * O front-end nunca escolhe a condição: ele só exibe o que o servidor devolve.
 */

export type Tier = 'PUBLICO_GERAL' | 'ALUNO_GERAL' | 'ALUNO_XR_PEC' | 'ALUNO_BLACK_2025'

export interface Offer {
  tier: Tier
  /** Maior número = maior prioridade. Aluno xR Pec > Aluno geral > Público geral. */
  priority: number
  headline: string
  text: string
  cta: string
  listPrice: string
  price: string
  installments: string
  badge?: string
  checkoutUrl: string
}

const LIST_PRICE = 'R$ 3.947,00'

export const OFFERS: Record<Tier, Offer> = {
  PUBLICO_GERAL: {
    tier: 'PUBLICO_GERAL',
    priority: 1,
    headline: 'SUA OFERTA DE BLACK FRIDAY ESTÁ DISPONÍVEL!',
    text: 'Essa é a sua oportunidade de participar do xR Pec com uma condição especial de Black Friday.',
    cta: 'QUERO GARANTIR MINHA OFERTA',
    listPrice: LIST_PRICE,
    price: 'R$ 3.447,00',
    installments: '12x de R$ 367,07',
    checkoutUrl: 'https://lastlink.com/p/C4EBD51A4/checkout-payment/',
  },
  ALUNO_GERAL: {
    tier: 'ALUNO_GERAL',
    priority: 2,
    headline: 'VOCÊ JÁ É ALUNO NAFazenda. E TEM UMA CONDIÇÃO ESPECIAL!',
    text: 'Por já fazer parte da nossa comunidade de alunos, preparamos uma condição exclusiva para você avançar ainda mais na pecuária.',
    cta: 'QUERO APROVEITAR MINHA CONDIÇÃO',
    listPrice: LIST_PRICE,
    price: 'R$ 2.947,00',
    installments: '12x de R$ 313,86',
    checkoutUrl: 'https://lastlink.com/p/C68D9A50D/checkout-payment/',
  },
  // 50% para quem é aluno xR Pec (mesmo preço e checkout da Black Friday 2025; muda só o texto).
  ALUNO_XR_PEC: {
    tier: 'ALUNO_XR_PEC',
    priority: 3,
    headline: 'VOCÊ DESBLOQUEOU A CONDIÇÃO MAIS ESPECIAL DA BLACK FRIDAY!',
    text: 'Por já fazer parte do xR Pec, você tem acesso a uma condição exclusiva de 50% de desconto.',
    cta: 'QUERO GARANTIR MEUS 50% DE DESCONTO',
    listPrice: LIST_PRICE,
    price: 'R$ 1.973,50',
    installments: '12x de R$ 210,16',
    badge: '50% DE DESCONTO',
    checkoutUrl: 'https://lastlink.com/p/C98EBABFE/checkout-payment/',
  },
  // 50% para quem comprou na Black Friday 2025.
  ALUNO_BLACK_2025: {
    tier: 'ALUNO_BLACK_2025',
    priority: 3,
    headline: 'VOCÊ DESBLOQUEOU A CONDIÇÃO MAIS ESPECIAL DA BLACK FRIDAY!',
    text: 'Por ter participado da Black Friday NaFazenda do ano passado, você tem acesso a uma condição exclusiva de 50% de desconto.',
    cta: 'QUERO GARANTIR MEUS 50% DE DESCONTO',
    listPrice: LIST_PRICE,
    price: 'R$ 1.973,50',
    installments: '12x de R$ 210,16',
    badge: '50% DE DESCONTO',
    checkoutUrl: 'https://lastlink.com/p/C98EBABFE/checkout-payment/',
  },
}

/** Valores do campo `segmento` do JSON de origem → condição. */
export const SEGMENT_TO_TIER: Record<string, Tier> = {
  XR_PEC: 'ALUNO_XR_PEC',
  ALUNO_GERAL: 'ALUNO_GERAL',
}

/**
 * Comprador da Black Friday 2025 cujo e-mail está em "revisão" na base (duplicado, CPFs em conflito):
 * false = continua indo para a tela de conferência (mais seguro); true = recebe os 50% mesmo assim.
 */
export const BLACK_2025_OVERRIDES_REVIEW = false

/** Único valor de `consulta_email` que libera uma condição automática. */
export const ELIGIBLE_FLAG = 'APTO_APOS_VERIFICACAO_EMAIL'

/** Códigos gravados no índice publicado. E-mail ausente do índice = Público geral. */
export type IndexCode = 'X' | 'B' | 'A' | 'R'

/** Limite simples por IP (em memória, por instância). O limite "de verdade" é o Firewall da Vercel. */
export const RATE_LIMIT = { max: 30, windowMs: 10 * 60 * 1000 }
