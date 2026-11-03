import type { IndexCode } from './config.js'
import { INDEX } from '../_data/index.generated.js'

let override: Record<string, IndexCode> | null = null

/** Somente para testes. */
export function setIndexForTests(i: Record<string, IndexCode> | null) {
  override = i
}

export const lookupCode = (key: string): IndexCode | undefined => (override ?? (INDEX as Record<string, IndexCode>))[key]
