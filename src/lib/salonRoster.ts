import type { AccountRole } from './salonPath'
import { showAssigneePicker } from './salonAccess'

export type SalonMember = {
  uid: string
  email: string
  role: AccountRole
  firstName: string
  lastName: string
  status: 'attivo' | 'revocato'
  accessWithoutPro?: boolean
}

export type SalonAccess = {
  enabled: boolean
  members: SalonMember[]
  openInviteExpiries: string[]
  seats?: number
  elencoNegato?: boolean
}

const ROLE_RANK: Record<AccountRole, number> = {
  titolare: 0,
  socio: 1,
  collaboratore: 2,
}

export function rosterLabel(member: { firstName: string; lastName: string; email: string }): string {
  const name = [member.firstName, member.lastName].map((part) => part.trim()).filter((part) => part !== '').join(' ')
  return name || member.email.trim()
}

export function pickerMembers(access: SalonAccess): SalonMember[] {
  if (!showAssigneePicker(access.enabled, access.members)) return []
  return access.members
    .filter((member) => member.status === 'attivo')
    .sort((left, right) => {
      const byRole = ROLE_RANK[left.role] - ROLE_RANK[right.role]
      if (byRole !== 0) return byRole
      return rosterLabel(left).localeCompare(rosterLabel(right), 'it')
    })
}
