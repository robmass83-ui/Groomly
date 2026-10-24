import { randomBytes } from 'crypto'
import { INVITE_TEMPLATE_ID, inviteLink, roleLabel, type StaffRole } from '../../src/lib/salonAccess'

export function tokenBytes(): string {
  return randomBytes(32).toString('hex')
}

export async function deliverInvite(send: () => Promise<void>, remove: () => Promise<void>): Promise<void> {
  try {
    await send()
  } catch (error) {
    try {
      await remove()
    } catch {
      // Il rifiuto dell'invio resta l'errore da rilanciare.
    }
    throw error
  }
}

export function shouldRestoreAccount(accountSalonId: string, salonId: string): boolean {
  return accountSalonId !== '' && accountSalonId === salonId
}

export function appendOpenInviteExpiry(current: unknown, expiresAt: string): unknown[] {
  const list = Array.isArray(current) ? current.slice() : []
  list.push(expiresAt)
  return list
}

export function removeOneOpenInviteExpiry(current: unknown, expiresAt: string): unknown[] | null {
  if (!Array.isArray(current)) return null
  const index = current.indexOf(expiresAt)
  if (index < 0) return null
  const next = current.slice()
  next.splice(index, 1)
  return next
}

export function inviteMail(token: string, salonName: string, role: StaffRole): {
  templateId: number
  params: { link: string; salonName: string; roleLabel: string }
} {
  return {
    templateId: INVITE_TEMPLATE_ID,
    params: {
      link: inviteLink(token),
      salonName,
      roleLabel: roleLabel(role),
    },
  }
}
