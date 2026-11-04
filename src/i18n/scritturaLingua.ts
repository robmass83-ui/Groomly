import type { Lingua } from './lingua'

/** Solo il titolare di un salone nuovo riceve la lingua dei clienti: i saloni che esistono già restano in italiano. */
export function primoAvvio(input: {
  nuovo: boolean
  lingua: Lingua
  ruolo: 'titolare' | 'socio' | 'collaboratore'
}): { lingua: Lingua; linguaClienti: Lingua | null } {
  return { lingua: input.lingua, linguaClienti: input.nuovo && puoScrivereLinguaClienti(input.ruolo) ? input.lingua : null }
}

export function puoScrivereLinguaClienti(ruolo: string): boolean {
  return ruolo === 'titolare'
}
