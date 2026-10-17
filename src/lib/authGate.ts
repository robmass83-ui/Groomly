import { isLauraEmail } from './salonPath'

export type EntryGate = { kind: 'home' } | { kind: 'confirm-email' } | { kind: 'repair-salon' }

export function entryGate(input: {
  firebase: boolean
  email: string
  emailVerified: boolean
  legacy: boolean
  hasAccountDoc: boolean
}): EntryGate {
  if (!input.firebase) return { kind: 'home' }
  if (!input.hasAccountDoc) return isLauraEmail(input.email) ? { kind: 'home' } : { kind: 'repair-salon' }
  if (!input.legacy && !input.emailVerified) return { kind: 'confirm-email' }
  return { kind: 'home' }
}

export function passwordResetMessage(): string {
  return 'Se questo indirizzo è un account Groomly, ti arriva un’email per scegliere una nuova password. Poi torna su Entra.'
}

export function confirmEmailCopy(email: string): string {
  return `Ti abbiamo scritto a ${email}. Apri il messaggio e tocca il link, poi torna qui.`
}
