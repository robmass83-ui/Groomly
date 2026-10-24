import { isSharedEmail, normalizeEmail, type AccountRole } from './salonPath'

export const PRO_SEAT_LIMIT = 3
export const INVITE_DAYS = 7
export const INVITE_TEMPLATE_ID = 5
export const INVITE_LINK_ORIGIN = 'https://groomly-3128b.web.app'

const INVITE_MS = INVITE_DAYS * 24 * 60 * 60 * 1000

export type StaffRole = 'socio' | 'collaboratore'

type Denied = { ok: false; message: string }
type Passed = { ok: true; message?: undefined }
type Ok<T extends object> = Passed & T

type SeatMember = { role: AccountRole; status: string; email?: string }
type SeatInvite = { status: string; expiresAt: string }
type Manager = { salonId: string; role: AccountRole }

function denied(message: string): Denied {
  return { ok: false, message }
}

function isStaffRole(role: string): role is StaffRole {
  return role === 'socio' || role === 'collaboratore'
}

function isActiveStaff(member: { role: string; status: string }): boolean {
  return member.status === 'attivo' && isStaffRole(member.role)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isManager(caller: Manager, salonId: string): boolean {
  if (salonId === '' || caller.salonId !== salonId) return false
  return caller.role === 'titolare' || caller.role === 'socio'
}

export function usedSeats(members: SeatMember[], invites: SeatInvite[], now: Date): number {
  const people = members.filter((member) => isActiveStaff(member)).length
  const openInvites = invites.filter((invite) => invite.status === 'aperto' && Date.parse(invite.expiresAt) > now.getTime()).length
  return people + openInvites
}

export function inviteExpiresAt(now: Date): Date {
  return new Date(now.getTime() + INVITE_MS)
}

export function showAssigneePicker(proEnabled: boolean, members: SeatMember[]): boolean {
  return proEnabled && members.some((member) => isActiveStaff(member))
}

export function assigneeOf(appointment: { assigneeUid?: string | null }, ownerUid: string): string {
  if (typeof appointment.assigneeUid === 'string' && appointment.assigneeUid !== '') return appointment.assigneeUid
  return ownerUid
}

export function visibleAppointments<T extends { assigneeUid?: string | null }>(
  appointments: T[],
  viewer: { uid: string; ownerUid: string; role: AccountRole },
): T[] {
  if (viewer.role !== 'collaboratore') return appointments
  return appointments.filter((item) => assigneeOf(item, viewer.ownerUid) === viewer.uid)
}

export function setProDecision(caller: { operator: boolean }, salonId: string): Denied | Passed {
  if (!caller.operator || salonId === '' || salonId.includes('/')) return denied('Accesso negato')
  return { ok: true }
}

export function createInviteDecision(input: {
  caller: Manager
  proEnabled: boolean
  email: string
  role: string
  members: SeatMember[]
  invites: SeatInvite[]
  now: Date
}): Denied | Ok<{ email: string; role: StaffRole }> {
  if (!input.proEnabled) return denied('Pro non è attivo')
  if (!isManager(input.caller, input.caller.salonId)) return denied('Accesso negato')
  const email = normalizeEmail(input.email)
  if (!isValidEmail(email)) return denied('Inserisci un’email valida')
  const role = input.role
  if (!isStaffRole(role)) return denied('Accesso negato')
  if (usedSeats(input.members, input.invites, input.now) >= PRO_SEAT_LIMIT) return denied('Posti esauriti')
  const alreadyThere = isSharedEmail(email) || input.members.some((member) => (
    member.status === 'attivo' && typeof member.email === 'string' && normalizeEmail(member.email) === email
  ))
  if (alreadyThere) return denied('Questa email è già nel salone')
  return { ok: true, email, role }
}

export function acceptInviteDecision(input: {
  invite: { status: string; expiresAt: string; email: string; salonId: string; role: string } | null
  now: Date
  accountEmail: string
  account: { uid: string; salonId: string; role: AccountRole }
  proEnabled: boolean
  activeOthers: number
  personalSalonHasData: boolean
}): Denied | Ok<{ salonId: string; role: StaffRole }> {
  const invite = input.invite
  if (
    invite === null
    || invite.status !== 'aperto'
    || !input.proEnabled
    || invite.salonId === ''
    || invite.salonId.includes('/')
  ) {
    return denied('Invito non valido')
  }
  const expiresAt = Date.parse(invite.expiresAt)
  if (!Number.isFinite(expiresAt)) return denied('Invito non valido')
  if (expiresAt < input.now.getTime()) return denied('Invito scaduto')
  if (normalizeEmail(input.accountEmail) !== normalizeEmail(invite.email)) return denied('Invito non valido')
  const personalOwner = input.account.role === 'titolare' && input.account.salonId === input.account.uid
  if (!personalOwner || input.personalSalonHasData) return denied('Questo account ha già un salone')
  if (input.activeOthers >= PRO_SEAT_LIMIT) return denied('Posti esauriti')
  const role = invite.role
  if (!isStaffRole(role)) return denied('Invito non valido')
  return { ok: true, salonId: invite.salonId, role }
}

export function revokeDecision(input: {
  caller: Manager
  proEnabled: boolean
  salonId: string
  targetUid: string
  targetRole: string
}): Denied | Passed {
  if (input.targetUid === input.salonId || input.targetRole === 'titolare') {
    return denied('Non puoi revocare il titolare')
  }
  if (!input.proEnabled || !isManager(input.caller, input.salonId)) return denied('Accesso negato')
  return { ok: true }
}

export function changeRoleDecision(input: {
  caller: Manager
  proEnabled: boolean
  salonId: string
  targetUid: string
  nextRole: string
}): Denied | Ok<{ role: StaffRole }> {
  const role = input.nextRole
  if (
    !input.proEnabled
    || !isManager(input.caller, input.salonId)
    || input.targetUid === input.salonId
    || !isStaffRole(role)
  ) {
    return denied('Accesso negato')
  }
  return { ok: true, role }
}

export function roleLabel(role: StaffRole): string {
  return role === 'socio' ? 'Socio' : 'Collaboratore'
}

export function inviteLink(token: string): string {
  return `${INVITE_LINK_ORIGIN}/invito/${token}`
}
