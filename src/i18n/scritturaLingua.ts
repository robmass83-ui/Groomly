import type { Lingua } from './lingua'

export function primoAvvio(input: {
  nuovo: boolean
  telefono: Lingua
  ruolo: 'titolare' | 'socio' | 'collaboratore'
}): { lingua: Lingua; linguaClienti: Lingua | null } {
  return { lingua: input.telefono, linguaClienti: null }
}

export function puoScrivereLinguaClienti(ruolo: string): boolean {
  return ruolo === 'titolare'
}
