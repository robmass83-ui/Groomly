import { isLauraEmail, SHARED_SALON_ID } from './salonPath'

export function accountNonEliminabile(input: { email?: string | null; salonId?: string | null; vip?: boolean; uid?: string | null }): boolean {
  if (isLauraEmail(input.email)) return true
  if (input.salonId === SHARED_SALON_ID) return true
  if (input.vip === true && input.uid && input.salonId === input.uid) return true
  return false
}
