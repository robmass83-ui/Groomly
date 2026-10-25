const SEMPRE = ['Privacy e termini', 'Elimina account'] as const

export function vociMenuPiani(mostraPiani: boolean): string[] {
  if (!mostraPiani) return [...SEMPRE]
  return ['Il tuo piano', 'Team', 'Messaggi ai clienti', 'Strumenti', ...SEMPRE]
}

export function hrefVoce(voce: string): string {
  if (voce === 'Privacy e termini') return '/impostazioni/privacy'
  if (voce === 'Elimina account') return '/impostazioni/account/elimina'
  if (voce === 'Il tuo piano') return '/impostazioni/piano'
  if (voce === 'Team') return '/impostazioni/team'
  if (voce === 'Messaggi ai clienti') return '/impostazioni/messaggi'
  return '/impostazioni/strumenti'
}
