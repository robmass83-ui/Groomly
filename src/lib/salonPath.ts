export const LAURA_EMAIL = 'laura.masala@tiscali.it'
export const ROBERTO_EMAIL = 'masala.roberto@hotmail.it'
export const SHARED_SALON_ID = 'shared'

export type AccountRole = 'titolare' | 'socio' | 'collaboratore'

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

export function isSharedEmail(email: string | null | undefined): boolean {
  const value = normalizeEmail(email ?? '')
  return value === LAURA_EMAIL || value === ROBERTO_EMAIL
}

/** Un'email condivisa che non è Laura entra in shared senza portarvi i dati locali del telefono. */
export function isSharedNonLauraEmail(email: string | null | undefined): boolean {
  return isSharedEmail(email) && !isLauraEmail(email)
}

/** Dentro shared, chi non è Laura legge e scrive solo il cloud: niente semi, fusioni o segni di cancellazione locali. */
export function usesOnlyCloudData(email: string | null | undefined, salonId: string | null | undefined): boolean {
  return salonId === SHARED_SALON_ID && isSharedNonLauraEmail(email)
}

export function isOperator(email: string | null | undefined): boolean {
  return isSharedEmail(email)
}

/** Come le regole Firestore: claim admin, oppure Laura o Roberto con l’email già verificata. */
export function operatoreAutorizzato(input: {
  email: string | null | undefined
  emailVerified?: boolean
  admin?: boolean
}): boolean {
  if (input.admin === true) return true
  return input.emailVerified === true && isOperator(input.email)
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

export function sharedMemberAccount(email: string, existing?: { firstName?: string; lastName?: string } | null): CloudAccount {
  return {
    firstName: (existing?.firstName ?? '').trim(),
    lastName: (existing?.lastName ?? '').trim(),
    email: normalizeEmail(email),
    salonId: SHARED_SALON_ID,
    role: 'titolare',
    legacy: true,
  }
}

export function lauraAccount(email: string): CloudAccount {
  return sharedMemberAccount(email)
}

export function accountCreateAllowed(uid: string, email: string, data: CloudAccount): boolean {
  if (data.role !== 'titolare') return false
  if (isSharedEmail(email) && data.legacy && data.salonId === SHARED_SALON_ID) return true
  return data.legacy === false && data.salonId === uid && data.salonId !== SHARED_SALON_ID
}

export function canReadSalon(email: string, account: CloudAccount | null, salonId: string): boolean {
  if (salonId === SHARED_SALON_ID && isSharedEmail(email)) return true
  return account?.salonId === salonId
}
