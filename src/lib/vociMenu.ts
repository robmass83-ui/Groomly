export const VOCE_PRIVACY = 'Privacy e termini'
export const VOCE_ELIMINA = 'Elimina account'
export const VOCE_PIANO = 'Il tuo piano'
export const VOCE_TEAM = 'Team'
export const VOCE_MESSAGGI = 'Messaggi ai clienti'
export const VOCE_STRUMENTI = 'Strumenti'

const SEMPRE = [VOCE_PRIVACY, VOCE_ELIMINA] as const

export function vociMenuPiani(mostraPiani: boolean): string[] {
  if (!mostraPiani) return [...SEMPRE]
  return [VOCE_PIANO, VOCE_TEAM, VOCE_MESSAGGI, VOCE_STRUMENTI, ...SEMPRE]
}

export function hrefVoce(voce: string): string {
  if (voce === VOCE_PRIVACY) return '/impostazioni/privacy'
  if (voce === VOCE_ELIMINA) return '/impostazioni/account/elimina'
  if (voce === VOCE_PIANO) return '/impostazioni/piano'
  if (voce === VOCE_TEAM) return '/impostazioni/team'
  if (voce === VOCE_MESSAGGI) return '/impostazioni/messaggi'
  return '/impostazioni/strumenti'
}
