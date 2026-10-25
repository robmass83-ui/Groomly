export const BREVO_TEMPLATE = {
  confermaAccount: 3,
  resetPassword: 4,
  invito: 5,
  ricevuta: 6,
  confermata: 7,
  proposta: 8,
  rifiutata: 9,
  scaduta: 10,
  disdetta: 11,
  promemoria: 12,
} as const

export const TETTO_EMAIL_GIORNO = 300

export type VocePromemoria = { id: string; email: string; giorno: string }

export function chiavePromemoria(id: string, giorno: string): string {
  return `${id}:${giorno}`
}

export function selezionaPromemoria(
  voci: readonly VocePromemoria[],
  gia: ReadonlySet<string>,
  emailOggi: number,
  tetto = TETTO_EMAIL_GIORNO,
): { invio: VocePromemoria[]; inCoda: VocePromemoria[] } {
  const nuovi = voci.filter((voce) => voce.email.includes('@') && !gia.has(chiavePromemoria(voce.id, voce.giorno)))
  const posti = Math.max(0, tetto - emailOggi)
  return { invio: nuovi.slice(0, posti), inCoda: nuovi.slice(posti) }
}
