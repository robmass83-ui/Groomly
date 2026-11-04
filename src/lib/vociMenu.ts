import type { Chiave } from '../i18n/t'

export const VOCE_PRIVACY: Chiave = 'privacy'
export const VOCE_ELIMINA: Chiave = 'eliminaAccount'
export const VOCE_PIANO: Chiave = 'abbIlTuoPiano'
export const VOCE_TEAM: Chiave = 'team'
export const VOCE_MESSAGGI: Chiave = 'messaggi'
export const VOCE_STRUMENTI: Chiave = 'formStrumenti'

const SEMPRE = [VOCE_STRUMENTI, VOCE_PRIVACY, VOCE_ELIMINA] as const

export function vociMenuPiani(mostraPiani: boolean): Chiave[] {
  if (!mostraPiani) return [...SEMPRE]
  return [VOCE_PIANO, VOCE_TEAM, VOCE_MESSAGGI, ...SEMPRE]
}

export function hrefVoce(voce: Chiave): string {
  if (voce === VOCE_PRIVACY) return '/impostazioni/privacy'
  if (voce === VOCE_ELIMINA) return '/impostazioni/account/elimina'
  if (voce === VOCE_PIANO) return '/impostazioni/piano'
  if (voce === VOCE_TEAM) return '/impostazioni/team'
  if (voce === VOCE_MESSAGGI) return '/impostazioni/messaggi'
  return '/impostazioni/abbonamento'
}
