export const LAURA_EMAIL = 'laura.masala@tiscali.it'
export const SHARED_SALON_ID = 'shared'

export type AccountRole = 'titolare'

export interface CloudAccount {
  firstName: string
  lastName: string
  email: string
  salonId: string
  role: AccountRole
  legacy: boolean
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isLauraEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email ?? '') === LAURA_EMAIL
}

export function salonCollection(salonId: string): string[] {
  if (salonId === SHARED_SALON_ID) return ['salon', 'shared']
  return ['salons', salonId]
}

export function newOwnerAccount(uid: string, input: { firstName: string; lastName: string; email: string }): CloudAccount {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: normalizeEmail(input.email),
    salonId: uid,
    role: 'titolare',
    legacy: false,
  }
}

export function lauraAccount(email: string): CloudAccount {
  return {
    firstName: '',
    lastName: '',
    email: normalizeEmail(email),
    salonId: SHARED_SALON_ID,
    role: 'titolare',
    legacy: true,
  }
}

export function accountCreateAllowed(uid: string, email: string, data: CloudAccount): boolean {
  if (data.role !== 'titolare') return false
  if (isLauraEmail(email) && data.legacy && data.salonId === SHARED_SALON_ID) return true
  return data.legacy === false && data.salonId === uid && data.salonId !== SHARED_SALON_ID
}

export function canReadSalon(email: string, account: CloudAccount | null, salonId: string): boolean {
  if (salonId === SHARED_SALON_ID && isLauraEmail(email)) return true
  return account?.salonId === salonId
}
