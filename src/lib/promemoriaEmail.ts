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

/**
 * Il tetto di Brevo è dell’account, non del salone. Ogni salone con le email accese ha una quota sua
 * (il tetto diviso tra i saloni accesi). Un salone può andare oltre la sua quota, ma non toccare
 * la parte di quota che gli altri saloni accesi non hanno ancora usato.
 */
export function postiEmailSalone(input: {
  salonId: string
  totale: number
  perSalone: Readonly<Record<string, number>>
  accesi: readonly string[]
  tetto?: number
}): number {
  const tetto = input.tetto ?? TETTO_EMAIL_GIORNO
  const accesi = new Set([...input.accesi, input.salonId])
  const quota = Math.floor(tetto / accesi.size)
  let riservate = 0
  for (const id of accesi) {
    if (id === input.salonId) continue
    riservate += Math.max(0, quota - (input.perSalone[id] ?? 0))
  }
  const usate = Math.max(input.totale, Object.values(input.perSalone).reduce((somma, n) => somma + n, 0))
  return Math.max(0, tetto - usate - riservate)
}
