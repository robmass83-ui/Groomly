import { createHash } from 'node:crypto'

export type AccountAllineato = {
  uid: string
  email: string
  firstName: string
  lastName: string
  salonId: string
  role: 'titolare' | 'socio'
  legacy: boolean
}

export type MembroAllineato = {
  uid: string
  email: string
  firstName: string
  lastName: string
  role: 'titolare' | 'socio'
  status: 'attivo'
  accessWithoutPro?: true
}

export type AllineaAccount = {
  lauraUid: string
  robertoUid: string
  lauraVerified: boolean
  robertoVerified: boolean
  laura: { firstName: string; lastName: string; email: string }
  roberto: { firstName: string; lastName: string; email: string }
}

export type ElencoCancellazione = {
  authUids: { uid: string; email: string }[]
  salonIds: string[]
  lauraUid: string
  robertoUid: string
  troddioniUid: string
  troddioniSalonId: string
  troddioniOk: boolean
}

export type ElencoPronto = {
  uids: string[]
  salonIds: string[]
  fingerprint: string
}

const SEGMENTI_BLOCCO = new Set(['dogs', 'appointments', 'files'])

function normalizzaEmail(email: string): string {
  return email.trim().toLowerCase()
}

function trimTesto(testo: string): string {
  return testo.trim()
}

function relativi(percorsi: string[]): string[] {
  return percorsi
    .map((p) => p.split('/').slice(2).join('/'))
    .sort()
}

export function copiaBloccata(percorsiDestinazione: string[]): boolean {
  return percorsiDestinazione.some((percorso) =>
    percorso.split('/').some((segmento) => SEGMENTI_BLOCCO.has(segmento)),
  )
}

export function percorsiUguali(origine: string[], destinazione: string[]): boolean {
  const a = relativi(origine)
  const b = relativi(destinazione)
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export function legacyAllineato(emailConfermata: boolean): boolean {
  return !emailConfermata
}

export function scrittureAccount(input: AllineaAccount): {
  laura: AccountAllineato
  roberto: AccountAllineato
  membroLaura: MembroAllineato
  membroRoberto: MembroAllineato
  pro: { enabled: true; seats: 3 }
} {
  const lauraEmail = normalizzaEmail(input.laura.email)
  const robertoEmail = normalizzaEmail(input.roberto.email)
  const lauraFirst = trimTesto(input.laura.firstName)
  const lauraLast = trimTesto(input.laura.lastName)
  const robertoFirst = trimTesto(input.roberto.firstName)
  const robertoLast = trimTesto(input.roberto.lastName)

  const laura: AccountAllineato = {
    uid: input.lauraUid,
    email: lauraEmail,
    firstName: lauraFirst,
    lastName: lauraLast,
    salonId: 'laura',
    role: 'titolare',
    legacy: legacyAllineato(input.lauraVerified),
  }

  const roberto: AccountAllineato = {
    uid: input.robertoUid,
    email: robertoEmail,
    firstName: robertoFirst,
    lastName: robertoLast,
    salonId: 'laura',
    role: 'socio',
    legacy: legacyAllineato(input.robertoVerified),
  }

  const membroLaura: MembroAllineato = {
    uid: input.lauraUid,
    email: lauraEmail,
    firstName: lauraFirst,
    lastName: lauraLast,
    role: 'titolare',
    status: 'attivo',
  }

  const membroRoberto: MembroAllineato = {
    uid: input.robertoUid,
    email: robertoEmail,
    firstName: robertoFirst,
    lastName: robertoLast,
    role: 'socio',
    status: 'attivo',
    accessWithoutPro: true,
  }

  return {
    laura,
    roberto,
    membroLaura,
    membroRoberto,
    pro: { enabled: true, seats: 3 },
  }
}

export function troddioniValido(input: {
  salonId: string
  lauraUid: string
  businessName: string
}): boolean {
  const { salonId, lauraUid, businessName } = input
  if (!salonId || salonId === 'shared' || salonId === lauraUid) {
    return false
  }
  return businessName.trim().toLowerCase() === 'troddioni'
}

export function impronta(uids: string[]): string {
  const body = [...uids].sort().join('\n')
  return createHash('sha256').update(body).digest('hex')
}

export function insiemeCancellazione(input: ElencoCancellazione): ElencoPronto | null {
  if (!input.troddioniOk) {
    return null
  }

  const uids = input.authUids
    .map((a) => a.uid)
    .filter(
      (uid) =>
        uid !== input.lauraUid &&
        uid !== input.robertoUid &&
        uid !== input.troddioniUid,
    )

  const salonIds = input.salonIds.filter(
    (id) =>
      id !== input.lauraUid &&
      id !== input.troddioniSalonId &&
      id !== 'shared',
  )

  return {
    uids,
    salonIds,
    fingerprint: impronta(uids),
  }
}
