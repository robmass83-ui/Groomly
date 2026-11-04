import type { Lingua } from '../../i18n/lingua'
import type { MotivoRifiutoBeta } from '../../lib/betaInvito'
import type { it } from '../../i18n/it'

type Frasi = Record<keyof typeof it, string>

// Sostituisce i {{segnaposto}} di una frase già scelta nella lingua dell'app.
export function riempi(testo: string, valori: Record<string, string | number>): string {
  return testo.replace(/\{\{(\w+)\}\}/g, (tutto, nome: string) => (valori[nome] === undefined ? tutto : String(valori[nome])))
}

// Il nome del piano dentro le frasi della beta: «Plus» o «Salon».
export function nomePiano(frasi: Frasi, piano: 'pro' | 'salone' | null): string {
  return piano === 'salone' ? frasi.segnoSalone : frasi.segnoPlus
}

// «4 dicembre», «December 4», «4 de diciembre».
export function dataBeta(lingua: Lingua, data: Date): string {
  return data.toLocaleDateString(lingua, { day: 'numeric', month: 'long' })
}

// L'offerta early adopter nella lingua dell'app; senza traduzione si usa l'italiano.
export function testoOfferta(offerta: Record<Lingua, string>, lingua: Lingua): string {
  return (offerta[lingua] || offerta.it || '').trim()
}

// Il motivo che apre il campo di testo nel «No grazie».
export const MOTIVO_ALTRO: MotivoRifiutoBeta = 'altro'

// I messaggi d'errore del server (failed-precondition) sono in italiano: quelli noti diventano la frase nella lingua dell'app.
const MESSAGGI_SERVER: Record<string, keyof typeof it> = {
  'Solo il titolare può rispondere all’invito': 'betaErrSoloTitolare',
  'Risposta non valida: riprova': 'betaErrRisposta',
  'Questo invito non è più valido': 'betaNonValido',
  'Questo invito è scaduto': 'betaErrScaduto',
  'Hai già il piano Salon omaggio: l’invito non serve': 'betaErrOmaggio',
  'Hai già un piano attivo: l’invito non serve': 'betaErrPianoAttivo',
  'Il feedback lo mandano il titolare o il socio': 'betaErrFeedbackChi',
  'Controlla le risposte e riprova': 'betaErrControlla',
  'Il feedback è per chi ha provato la beta': 'betaErrSoloBeta',
  'Hai già mandato 5 feedback oggi: riprova domani': 'betaErrLimite',
}

export function messaggioErroreBeta(frasi: Frasi, error: unknown): string {
  const testo = error instanceof Error ? error.message.trim() : ''
  if (!testo) return frasi.betaErrore
  const chiave = MESSAGGI_SERVER[testo.replace(/'/g, '’')]
  return chiave ? frasi[chiave] : testo
}
