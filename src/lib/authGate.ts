import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
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

export function passwordResetMessage(lingua: Lingua = 'it'): string {
  return t(lingua, 'authReset')
}

export function confirmEmailCopy(lingua: Lingua = 'it'): string {
  return t(lingua, 'authConfirmCopy')
}

export function resendWaitCopy(seconds: number, lingua: Lingua = 'it'): string {
  return t(lingua, 'authResend', { secondi: seconds })
}
