import type { Lingua } from '../../i18n/lingua'
import type { MotivoRifiutoBeta } from '../../lib/betaInvito'
import type { it } from '../../i18n/it'
import { codiceErroreServer, fraseErrore } from '../../i18n/errori'
import { leggiLinguaAttiva } from '../../i18n/linguaLocale'

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
export function messaggioErroreBeta(frasi: Frasi, error: unknown): string {
  const server = codiceErroreServer(error)
  return server ? fraseErrore(leggiLinguaAttiva(), server.codice, server.valori) : frasi.betaErrore
}
