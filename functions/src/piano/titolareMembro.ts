import { normalizeEmail } from '../../../src/lib/salonPath'

export type MembroTitolare = {
  uid: string
  email: string
  role: 'titolare'
  firstName: string
  lastName: string
  status: 'attivo'
}

// Il titolare deve avere il suo documento in members: lo ricrea se manca.
export function membroTitolareMancante(
  salonId: string,
  memberEsiste: boolean,
  account: Record<string, unknown> | undefined,
): MembroTitolare | null {
  if (memberEsiste) return null
  if (!account || account.salonId !== salonId || account.role !== 'titolare') return null
  return {
    uid: salonId,
    email: typeof account.email === 'string' ? normalizeEmail(account.email) : '',
    role: 'titolare',
    firstName: typeof account.firstName === 'string' ? account.firstName : '',
    lastName: typeof account.lastName === 'string' ? account.lastName : '',
    status: 'attivo',
  }
}
