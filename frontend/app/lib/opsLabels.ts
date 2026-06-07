import type { TranslationKey } from '../../lib/translations'

export function opsKommuneStatusKey(status: string): TranslationKey {
  return `opsKommuneStatus_${status}` as TranslationKey
}

export function opsHealthKey(health: string): TranslationKey {
  return `opsHealth_${health}` as TranslationKey
}
