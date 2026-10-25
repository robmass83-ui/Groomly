import type { AccountRole } from './salonPath'
import type { SalonAccess } from './salonRoster'

export function accessoSospeso(role: AccountRole | undefined, access: SalonAccess | null, uid: string): boolean {
  if (role !== 'collaboratore' && role !== 'socio') return false
  if (!access || access.enabled) return false
  if (access.members.length === 0) return false
  const me = access.members.find((member) => member.uid === uid && member.status === 'attivo')
  return me?.accessWithoutPro !== true
}
