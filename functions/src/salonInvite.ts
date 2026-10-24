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
