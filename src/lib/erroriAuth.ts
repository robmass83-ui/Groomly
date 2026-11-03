import { t, type Chiave } from '../i18n/t'
import type { Lingua } from '../i18n/lingua'

const PER_CODICE: Record<string, Chiave> = {
  'auth/wrong-password': 'authPasswordSbagliata',
  'auth/invalid-credential': 'authPasswordSbagliata',
  'auth/too-many-requests': 'authTroppiTentativi',
  'auth/email-already-in-use': 'authEmailUsata',
  'auth/invalid-email': 'authEmailNonValida',
  'auth/requires-recent-login': 'authRientra',
  'auth/weak-password': 'authPasswordDebole',
  'auth/network-request-failed': 'authRete',
  'auth/user-not-found': 'authUtenteAssente',
  // Gli errori dell'app, quando Firebase non c'è o li ha già tradotti.
  auth_invalid: 'authPasswordSbagliata',
  auth_offline: 'authRete',
  auth_email_taken: 'authEmailUsata',
}

/** La frase per chi usa l'app: il testo grezzo di Firebase non si mostra mai. */
export function messaggioAuth(lingua: Lingua, errore: unknown): string {
  const codice = typeof errore === 'object' && errore !== null ? (errore as { code?: unknown }).code : undefined
  const chiave = typeof codice === 'string' ? PER_CODICE[codice] : undefined
  return t(lingua, chiave ?? 'operazioneKo')
}
