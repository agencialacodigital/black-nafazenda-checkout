import { ELIGIBLE_FLAG, OFFERS, SEGMENT_TO_TIER, type IndexCode, type Offer } from './config.js'

export interface BuyerRecord {
  id: string
  emails: string[]
  cpfs: string[]
  segmento: string
  consulta_email: string
}

export type Classification = { kind: 'offer'; offer: Offer } | { kind: 'review'; reason: string }

/**
 * Regra única de classificação, aplicada na GERAÇÃO do índice (npm run data:build).
 * A ordem importa:
 *  1. Sem registro            → Público geral
 *  2. Mais de um registro     → revisão (duplicidade / possível conflito de e-mail ou CPF)
 *  3. Marcado p/ revisão ou sem flag de elegibilidade → revisão
 *  4. Mais de um CPF ou segmento desconhecido → revisão
 *  5. XR_PEC → Aluno xR Pec (50%); ALUNO_GERAL → Aluno geral
 * Quem comprou na Black Friday 2025 também recebe os 50%: isso é aplicado depois, em indexing.ts, a partir da planilha.
 * Em qualquer dúvida de identidade nunca concedemos condição superior automaticamente.
 */
export function classify(records: BuyerRecord[]): Classification {
  if (records.length === 0) return { kind: 'offer', offer: OFFERS.PUBLICO_GERAL }
  if (records.length > 1) return { kind: 'review', reason: 'duplicate_records' }
  const [r] = records
  if (r.consulta_email !== ELIGIBLE_FLAG) return { kind: 'review', reason: 'flagged_for_review' }
  if (!Array.isArray(r.cpfs) || r.cpfs.length > 1) return { kind: 'review', reason: 'conflicting_cpf' }
  const tier = SEGMENT_TO_TIER[r.segmento]
  if (!tier) return { kind: 'review', reason: 'unknown_segment' }
  return { kind: 'offer', offer: OFFERS[tier] }
}

export function toIndexCode(c: Classification): IndexCode | null {
  if (c.kind === 'review') return 'R'
  if (c.offer.tier === 'ALUNO_XR_PEC') return 'X'
  if (c.offer.tier === 'ALUNO_BLACK_2025') return 'B'
  if (c.offer.tier === 'ALUNO_GERAL') return 'A'
  return null
}

/** Decisão em tempo de consulta a partir do código do índice (ausente = Público geral). */
export function decide(code: IndexCode | undefined): Classification {
  if (code === 'R') return { kind: 'review', reason: 'index_review' }
  if (code === 'X') return { kind: 'offer', offer: OFFERS.ALUNO_XR_PEC }
  if (code === 'B') return { kind: 'offer', offer: OFFERS.ALUNO_BLACK_2025 }
  if (code === 'A') return { kind: 'offer', offer: OFFERS.ALUNO_GERAL }
  return { kind: 'offer', offer: OFFERS.PUBLICO_GERAL }
}

/** O que o cliente recebe: nunca expõe regra, segmento ou id interno. */
export function publicOffer(o: Offer) {
  const { priority: _p, tier: _t, ...rest } = o
  return { ...rest, variant: o.tier === 'ALUNO_BLACK_2025' || o.tier === 'ALUNO_XR_PEC' ? 'top' : o.tier === 'ALUNO_GERAL' ? 'aluno' : 'geral' }
}
