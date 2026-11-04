// Invito alla beta Plus/Salone: un documento per salone in betaInviti/{salonId}, scritto solo dalle functions.
export type StatoInvitoBeta = 'invitato' | 'accettato' | 'rifiutato' | 'scaduto' | 'revocato'
export type MotivoRifiutoBeta = 'non-serve' | 'complicato' | 'non-pagherei' | 'altro'

export interface InvitoBeta {
  salonId: string
  piano: 'pro' | 'salone'
  giorni: number
  messaggio: string | null
  stato: StatoInvitoBeta
  invitatoIl: string
  scadeInvitoIl: string
  rispostoIl: string | null
  motivoRifiuto: MotivoRifiutoBeta | null
  altroRifiuto: string | null
  revocatoIl: string | null
  invitatoDa: string
  aggiornatoIl: string
}

export const STATI_INVITO_BETA: readonly StatoInvitoBeta[] = ['invitato', 'accettato', 'rifiutato', 'scaduto', 'revocato']
export const MOTIVI_RIFIUTO_BETA: readonly MotivoRifiutoBeta[] = ['non-serve', 'complicato', 'non-pagherei', 'altro']
export const GIORNI_SCADENZA_INVITO = 14
export const GIORNI_BETA_MAX = 365
export const MESSAGGIO_INVITO_MAX = 500
export const ALTRO_RIFIUTO_MAX = 300

const PASSI: Record<StatoInvitoBeta, readonly StatoInvitoBeta[]> = {
  invitato: ['accettato', 'rifiutato', 'scaduto', 'revocato'],
  accettato: ['revocato'],
  rifiutato: [],
  scaduto: [],
  revocato: [],
}

export function transizioneInvito(da: StatoInvitoBeta, a: StatoInvitoBeta): boolean {
  return PASSI[da].includes(a)
}

function testo(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function invitoBetaDi(doc: unknown): InvitoBeta | null {
  if (!doc || typeof doc !== 'object') return null
  const d = doc as Record<string, unknown>
  const stato = STATI_INVITO_BETA.find((s) => s === d.stato)
  const piano = d.piano === 'pro' || d.piano === 'salone' ? d.piano : null
  const giorni = typeof d.giorni === 'number' && Number.isInteger(d.giorni) && d.giorni >= 1 && d.giorni <= GIORNI_BETA_MAX ? d.giorni : null
  const salonId = testo(d.salonId)
  const invitatoIl = testo(d.invitatoIl)
  const scadeInvitoIl = testo(d.scadeInvitoIl)
  if (!stato || !piano || giorni === null || !salonId || !invitatoIl || !scadeInvitoIl) return null
  return {
    salonId,
    piano,
    giorni,
    messaggio: testo(d.messaggio),
    stato,
    invitatoIl,
    scadeInvitoIl,
    rispostoIl: testo(d.rispostoIl),
    motivoRifiuto: MOTIVI_RIFIUTO_BETA.find((m) => m === d.motivoRifiuto) ?? null,
    altroRifiuto: testo(d.altroRifiuto),
    revocatoIl: testo(d.revocatoIl),
    invitatoDa: testo(d.invitatoDa) ?? '',
    aggiornatoIl: testo(d.aggiornatoIl) ?? invitatoIl,
  }
}
