import type { InvitoBeta } from './betaInvito'
import type { StatoPiano, TracciaBeta } from './piano'

// A che punto è la beta del salone: decide cosa mostrano card, avvisi, scheda, Abbonamento e feedback.
export type FaseBeta = 'nessuna' | 'invitato' | 'in-corso' | 'finita'

export interface StatoBeta {
  fase: FaseBeta
  invito: InvitoBeta | null
  invitoValido: boolean
  piano: 'pro' | 'salone' | null
  giorniInvito: number | null
  inizio: Date | null
  fine: Date | null
  giorniRimasti: number | null
  giorniTotali: number | null
  revocata: boolean
  domandaFine: boolean
  feedbackVisibile: boolean
  earlyAdopter: boolean
}

export const STATO_BETA_VUOTO: StatoBeta = {
  fase: 'nessuna',
  invito: null,
  invitoValido: false,
  piano: null,
  giorniInvito: null,
  inizio: null,
  fine: null,
  giorniRimasti: null,
  giorniTotali: null,
  revocata: false,
  domandaFine: false,
  feedbackVisibile: false,
  earlyAdopter: false,
}

const GIORNO_MS = 24 * 60 * 60 * 1000
// Come in statoPiano: il telefono può essere indietro di qualche minuto rispetto al server.
const TOLLERANZA_MS = 5 * 60 * 1000
// Dopo la fine la riga «Invia feedback beta» e la domanda finale restano per 30 giorni.
export const GIORNI_DOPO_FINE = 30

function data(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function faseBeta(input: { invito: InvitoBeta | null; stato: StatoPiano; traccia: TracciaBeta; adesso: Date }): StatoBeta {
  const { invito, stato, traccia, adesso } = input
  const ora = adesso.getTime()
  const scadeInvito = data(invito?.scadeInvitoIl)
  const invitoValido = invito?.stato === 'invitato' && scadeInvito !== null && scadeInvito.getTime() > ora
  const inCorso = stato.fonte === 'beta' && stato.livello !== 'base'
  const revocata = invito?.stato === 'revocato'
  const fase: FaseBeta = inCorso ? 'in-corso' : invitoValido ? 'invitato' : traccia.exBeta === true ? 'finita' : 'nessuna'
  const inizio = data(traccia.betaDal)

  let fine: Date | null = null
  if (fase === 'in-corso') fine = stato.scadeIl ?? data(traccia.betaFinoAl)
  if (fase === 'finita') {
    const prevista = data(traccia.betaFinoAl)
    const revoca = revocata ? data(invito?.revocatoIl) : null
    fine = revoca && (!prevista || revoca < prevista) ? revoca : prevista
  }

  const piano = fase === 'in-corso'
    ? (stato.livello === 'salone' ? 'salone' : 'pro')
    : fase === 'invitato' ? invito?.piano ?? null
      : fase === 'finita' ? traccia.betaPiano ?? invito?.piano ?? null : null

  const giorniRimasti = fase === 'in-corso' && fine ? Math.max(0, Math.ceil((fine.getTime() - ora - TOLLERANZA_MS) / GIORNO_MS)) : null
  const giorniTotali = fase === 'in-corso' || fase === 'finita'
    ? inizio && fine ? Math.max(1, Math.round((fine.getTime() - inizio.getTime()) / GIORNO_MS)) : invito?.stato === 'accettato' ? invito.giorni : null
    : null
  const dopoFineRecente = fase === 'finita' && fine !== null && ora - fine.getTime() < GIORNI_DOPO_FINE * GIORNO_MS
  const feedbackVisibile = fase === 'in-corso' || dopoFineRecente
  const domandaFine = !revocata && ((fase === 'in-corso' && giorniRimasti !== null && giorniRimasti <= 1) || dopoFineRecente)

  return {
    fase,
    invito,
    invitoValido,
    piano,
    giorniInvito: invito?.giorni ?? null,
    inizio,
    fine,
    giorniRimasti,
    giorniTotali,
    revocata,
    domandaFine,
    feedbackVisibile,
    earlyAdopter: traccia.earlyAdopter === true,
  }
}
