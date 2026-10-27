export type PassoSalone = 'logo' | 'sede' | 'listino' | 'backup' | 'email' | 'fiscale'

export function passiCompletamento(input: {
  logo: boolean
  indirizzo: boolean
  orari: boolean
  listino: boolean
  backup: boolean
  email: boolean
  /** Basta la partita IVA oppure il codice fiscale. */
  fiscale: boolean
}): { id: PassoSalone; fatto: boolean }[] {
  return [
    { id: 'logo', fatto: input.logo },
    { id: 'sede', fatto: input.indirizzo && input.orari },
    { id: 'listino', fatto: input.listino },
    { id: 'backup', fatto: input.backup },
    { id: 'email', fatto: input.email },
    { id: 'fiscale', fatto: input.fiscale },
  ]
}

export function avanzamentoSalone(passi: readonly { fatto: boolean }[]): { fatti: number; tutti: number; completo: boolean } {
  const fatti = passi.filter((passo) => passo.fatto).length
  const tutti = passi.length
  return { fatti, tutti, completo: tutti > 0 && fatti === tutti }
}
