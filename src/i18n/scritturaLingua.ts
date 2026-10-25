import type { Lingua } from './lingua'

export function primoAvvio(input: {
  nuovo: boolean
  telefono: Lingua
  ruolo: 'titolare' | 'socio' | 'collaboratore'
}): { lingua: Lingua; linguaClienti: Lingua | null } {
  const linguaClienti = input.nuovo && input.ruolo === 'titolare' ? input.telefono : null
  return { lingua: input.telefono, linguaClienti }
}

export function puoScrivereLinguaClienti(ruolo: string): boolean {
  return ruolo === 'titolare'
}
