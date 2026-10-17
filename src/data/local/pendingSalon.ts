export type PendingSalon = {
  firstName: string
  lastName: string
  salonName: string
  vatNumber: string
  address: string
}

// Il profilo di chi si sta registrando resta sul telefono finché il salone non è scritto:
// dopo un errore o un riavvio l'utente Firebase esiste già, e solo questi dati permettono a Riprova di finire.
// Non contiene la password. Non è un file JSON dei dati locali, quindi non conta come dato illeggibile.
const PREFIX = 'groomly.pendingSalon.'

function keyFor(email: string): string {
  return `${PREFIX}${email.trim().toLowerCase()}`
}

export function writePendingSalon(email: string, profile: PendingSalon): void {
  try {
    const { firstName, lastName, salonName, vatNumber, address } = profile
    localStorage.setItem(keyFor(email), JSON.stringify({ firstName, lastName, salonName, vatNumber, address }))
  } catch {
    return
  }
}

export function readPendingSalon(email: string): PendingSalon | null {
  try {
    const raw = localStorage.getItem(keyFor(email))
    if (!raw) return null
    const value = JSON.parse(raw) as Record<string, unknown> | null
    if (!value) return null
    const { firstName, lastName, salonName, vatNumber, address } = value
    if (
      typeof firstName !== 'string' || typeof lastName !== 'string' || typeof salonName !== 'string'
      || typeof vatNumber !== 'string' || typeof address !== 'string'
    ) return null
    return { firstName, lastName, salonName, vatNumber, address }
  } catch {
    return null
  }
}

export function clearPendingSalon(email: string): void {
  try {
    localStorage.removeItem(keyFor(email))
  } catch {
    return
  }
}
