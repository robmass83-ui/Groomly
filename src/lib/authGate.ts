import { isSharedEmail } from './salonPath'

export type EntryGate = { kind: 'home' } | { kind: 'confirm-email' } | { kind: 'repair-salon' }

export function entryGate(input: {
  firebase: boolean
  email: string
  emailVerified: boolean
  legacy: boolean
  hasAccountDoc: boolean
}): EntryGate {
  if (!input.firebase) return { kind: 'home' }
  if (!input.hasAccountDoc) return isSharedEmail(input.email) ? { kind: 'home' } : { kind: 'repair-salon' }
  if (!input.legacy && !input.emailVerified) return { kind: 'confirm-email' }
  return { kind: 'home' }
}

export const RESEND_WAIT_SECONDS = 60

export function passwordResetMessage(): string {
  return 'Se l’indirizzo è registrato, ti abbiamo inviato un’email per reimpostare la password. Controlla anche lo spam.'
}

export function confirmEmailCopy(): string {
  return 'Controlla la tua email per confermare l’account'
}

export function resendWaitCopy(seconds: number): string {
  return `Puoi inviarne un’altra tra ${seconds} secondi.`
}
