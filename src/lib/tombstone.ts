import { appointmentKind } from './personal'

export const TOMBSTONE_KEY = 'groomly.deleted'

export function chiaveEliminazioni(uid: string): string {
  return `${TOMBSTONE_KEY}.${uid}`
}

let accountEliminazioni: string | null = null

/** Da qui in poi la lista delle eliminazioni è quella dell'account (null: nessuna lista, non si scrive). */
export function impostaAccountEliminazioni(uid: string | null): void {
  accountEliminazioni = uid
  if (!uid) return
  migraCancellazioniInSospeso(uid)
  try {
    const vecchia = localStorage.getItem(TOMBSTONE_KEY)
    if (vecchia === null) return
    const propria = localStorage.getItem(chiaveEliminazioni(uid))
    const unita = mergeTombstone(
      propria ? readTombstone(JSON.parse(propria) as unknown) : emptyTombstone(),
      readTombstone(JSON.parse(vecchia) as unknown),
    )
    localStorage.setItem(chiaveEliminazioni(uid), JSON.stringify(unita))
    localStorage.removeItem(TOMBSTONE_KEY)
  } catch {
    // Migrazione best effort: la vecchia lista resta dov'è.
  }
}

export function dimenticaEliminazioni(uid: string): void {
  try {
    localStorage.removeItem(chiaveEliminazioni(uid))
    localStorage.removeItem(chiaveCancellazioniInSospeso(uid))
  } catch {
    // niente da togliere
  }
}

export type Tombstone = { ids: string[]; appointmentIds: string[]; storicoIds: string[] }

export function emptyTombstone(): Tombstone {
  return { ids: [], appointmentIds: [], storicoIds: [] }
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function readTombstone(raw: unknown): Tombstone {
  if (!raw || typeof raw !== 'object') return emptyTombstone()
  const record = raw as { ids?: unknown; appointmentIds?: unknown; storicoIds?: unknown }
  return { ids: strings(record.ids), appointmentIds: strings(record.appointmentIds), storicoIds: strings(record.storicoIds) }
}

function union(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])]
}

export function mergeTombstone(left: Tombstone, right: Tombstone): Tombstone {
  return {
    ids: union(left.ids, right.ids),
    appointmentIds: union(left.appointmentIds, right.appointmentIds),
    storicoIds: union(left.storicoIds, right.storicoIds),
  }
}

export function tombstoneRejectsDog(stone: Tombstone, id: string): boolean {
  return stone.ids.includes(id)
}

export function tombstoneRejectsAppointment(stone: Tombstone, id: string, dogId: string, personal = false): boolean {
  if (personal) return stone.appointmentIds.includes(id)
  return stone.appointmentIds.includes(id) || (stone.ids.includes(dogId) && !stone.storicoIds.includes(dogId))
}

export function filterDogs<T extends { id: string }>(dogs: T[], stone: Tombstone): T[] {
  return dogs.filter((dog) => !tombstoneRejectsDog(stone, dog.id))
}

export function filterAppointments<T extends { id: string; dogId: string; kind?: 'pelosetto' | 'personale' }>(items: T[], stone: Tombstone): T[] {
  return items.filter((item) => !tombstoneRejectsAppointment(stone, item.id, item.dogId, appointmentKind(item) === 'personale'))
}

export function readDeletion(): Tombstone {
  try {
    if (!accountEliminazioni) return emptyTombstone()
    const raw = localStorage.getItem(chiaveEliminazioni(accountEliminazioni))
    return raw ? readTombstone(JSON.parse(raw) as unknown) : emptyTombstone()
  } catch {
    return emptyTombstone()
  }
}

export function rememberDeletion(patch: Partial<Tombstone>): Tombstone {
  const next = mergeTombstone(readDeletion(), {
    ids: patch.ids ?? [],
    appointmentIds: patch.appointmentIds ?? [],
    storicoIds: patch.storicoIds ?? [],
  })
  if (accountEliminazioni) localStorage.setItem(chiaveEliminazioni(accountEliminazioni), JSON.stringify(next))
  return next
}

// Vive solo nella sessione di pagina. Roberto non filtra la pietra storica del telefono,
// ma una cancellazione appena fatta non deve rientrare dal prossimo snapshot.
const sessionAppointmentIds = new Set<string>()

export function noteSessionAppointmentDeletion(ids: Iterable<string>): void {
  for (const id of ids) if (id) sessionAppointmentIds.add(id)
}

export function sessionHidesAppointment(id: string): boolean {
  return sessionAppointmentIds.has(id)
}

export function sessionDeletedAppointmentIds(): string[] {
  return [...sessionAppointmentIds]
}

export function resetSessionAppointmentDeletions(): void {
  sessionAppointmentIds.clear()
}

/** Vecchia lista unica del telefono; senza account (modalità locale) resta quella in uso. */
export const PENDING_DELETE_KEY = 'groomly.deleted.pending'

/** Le cancellazioni in sospeso sono dell'account: chi entra dopo non deve ripetere quelle di un altro salone. */
export function chiaveCancellazioniInSospeso(uid: string): string {
  return `${PENDING_DELETE_KEY}.${uid}`
}

function chiaveInSospesoCorrente(): string {
  return accountEliminazioni ? chiaveCancellazioniInSospeso(accountEliminazioni) : PENDING_DELETE_KEY
}

function leggiInSospeso(key: string): PendingDogDeletion[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) as unknown : []
    if (!Array.isArray(parsed)) return []
    const found: PendingDogDeletion[] = []
    for (const item of parsed) {
      if (typeof item === 'string') found.push({ id: item, visitIds: [] })
      else if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
        const record = item as { id: string; visitIds?: unknown; sourceDocId?: unknown }
        const entry: PendingDogDeletion = { id: record.id, visitIds: strings(record.visitIds) }
        if (typeof record.sourceDocId === 'string' && record.sourceDocId.length > 0) entry.sourceDocId = record.sourceDocId
        found.push(entry)
      }
    }
    return found
  } catch {
    return []
  }
}

function migraCancellazioniInSospeso(uid: string): void {
  try {
    if (localStorage.getItem(PENDING_DELETE_KEY) === null) return
    const proprie = leggiInSospeso(chiaveCancellazioniInSospeso(uid))
    const vecchie = leggiInSospeso(PENDING_DELETE_KEY).filter((item) => !proprie.some((own) => own.id === item.id))
    const unite = [...proprie, ...vecchie]
    if (unite.length > 0) localStorage.setItem(chiaveCancellazioniInSospeso(uid), JSON.stringify(unite))
    localStorage.removeItem(PENDING_DELETE_KEY)
  } catch {
    // Migrazione best effort: la vecchia lista resta dov'è.
  }
}

const sessionDogIds = new Set<string>()

export function noteSessionDogDeletion(id: string): void {
  if (id) sessionDogIds.add(id)
}

export function sessionHidesDog(id: string): boolean {
  return sessionDogIds.has(id)
}

export function resetSessionDogDeletions(): void {
  sessionDogIds.clear()
}

export type PendingDogDeletion = { id: string; visitIds: string[]; sourceDocId?: string }

export function readPendingDogDeletions(): PendingDogDeletion[] {
  return leggiInSospeso(chiaveInSospesoCorrente())
}

export function rememberPendingDogDeletion(id: string, visitIds: string[], sourceDocId?: string): void {
  if (!id) return
  const entry: PendingDogDeletion = sourceDocId ? { id, visitIds, sourceDocId } : { id, visitIds }
  const next = [...readPendingDogDeletions().filter((item) => item.id !== id), entry]
  localStorage.setItem(chiaveInSospesoCorrente(), JSON.stringify(next))
}

export function forgetPendingDogDeletion(id: string): void {
  const key = chiaveInSospesoCorrente()
  const next = readPendingDogDeletions().filter((item) => item.id !== id)
  if (next.length === 0) localStorage.removeItem(key)
  else localStorage.setItem(key, JSON.stringify(next))
}

export function dogHiddenNow(id: string): boolean {
  return id.length > 0 && (sessionDogIds.has(id) || readPendingDogDeletions().some((item) => item.id === id))
}
