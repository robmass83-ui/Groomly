import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https'
import { codiceDaMessaggio, fraseErrore, type CodiceErrore, type ValoriErrore } from '../../src/i18n/errori'

/** La frase italiana del codice: resta in `message` per le APK già installate, che non conoscono i codici. */
export function messaggioServer(codice: CodiceErrore, valori?: ValoriErrore): string {
  return fraseErrore('it', codice, valori)
}

/** L'unico punto che crea un `HttpsError`: il client traduce `details.codice`. */
export function erroreServer(tipo: FunctionsErrorCode, codice: CodiceErrore, valori?: ValoriErrore): HttpsError {
  return new HttpsError(tipo, messaggioServer(codice, valori), valori ? { codice, valori } : { codice })
}

/** Per le decisioni che rispondono `{ ok: false, message }`: il testo resta com'è e accanto va il suo codice. */
export function erroreDaMessaggio(tipo: FunctionsErrorCode, messaggio: string): HttpsError {
  const codice = codiceDaMessaggio(messaggio)
  return new HttpsError(tipo, messaggio, codice ? { codice } : undefined)
}
