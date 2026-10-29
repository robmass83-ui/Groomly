import type { IscrittoAttesa, SpecieAttesa, TagliaAttesa } from '../../lib/listaAttesa'
import { readJson, storageKeys, writeJson } from './storage'

/** Chi aspetta un posto. `attivo: false` vuol dire uscito dalla lista (tolto, o già confermato): il documento resta. */
export interface IscrittoAttesaDoc extends IscrittoAttesa {
  attivo: boolean
}

/** La riga che la conferma lascia per il salone: scritta solo dal server, il client la legge. */
export interface AvvisoAttesa {
  id: string
  cane: string
  trattamento: string
  altro: string
  giorno: string
  creatoIl: string
}

export const SPECIE_ATTESA: readonly SpecieAttesa[] = ['cane', 'gatto', 'altro']
export const TAGLIE_ATTESA: readonly TagliaAttesa[] = ['piccola', 'media', 'grande']

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function testo(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function iscrittoDaDoc(key: string, value: unknown): IscrittoAttesaDoc | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' && value.id !== '' ? value.id : key
  if (id === '') return null
  const nomeCane = testo(value.nomeCane)
  if (nomeCane === '') return null
  const specie = SPECIE_ATTESA.find((item) => item === value.specie) ?? 'cane'
  const taglia = TAGLIE_ATTESA.find((item) => item === value.taglia) ?? 'media'
  return {
    id,
    nome: testo(value.nome),
    phone: testo(value.phone),
    email: testo(value.email),
    nomeCane,
    specie,
    taglia,
    servizioId: testo(value.servizioId),
    trattamento: testo(value.trattamento),
    durataMin: typeof value.durataMin === 'number' && Number.isFinite(value.durataMin) ? value.durataMin : 0,
    creatoIl: testo(value.creatoIl),
    attivo: value.attivo !== false,
  }
}

export function avvisoDaDoc(key: string, value: unknown): AvvisoAttesa | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' && value.id !== '' ? value.id : key
  const cane = testo(value.cane)
  const giorno = testo(value.giorno)
  if (id === '' || cane === '' || giorno === '') return null
  return { id, cane, trattamento: testo(value.trattamento), altro: testo(value.altro), giorno, creatoIl: testo(value.creatoIl) }
}

export function ordinaAttesa(items: IscrittoAttesaDoc[]): IscrittoAttesaDoc[] {
  return [...items].sort((a, b) => a.creatoIl.localeCompare(b.creatoIl) || a.id.localeCompare(b.id))
}

export function ordinaAvvisi(items: AvvisoAttesa[]): AvvisoAttesa[] {
  return [...items].sort((a, b) => a.creatoIl.localeCompare(b.creatoIl) || a.id.localeCompare(b.id))
}

function readMap(key: string): Record<string, unknown> {
  const raw = readJson<unknown>(key)
  return isRecord(raw) ? raw : {}
}

export function attesaToLocalMap(items: readonly IscrittoAttesaDoc[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const item of items) map[item.id] = { ...item }
  return map
}

export function avvisiToLocalMap(items: readonly AvvisoAttesa[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const item of items) map[item.id] = { ...item }
  return map
}

export function listAttesa(uid: string): IscrittoAttesaDoc[] {
  const items: IscrittoAttesaDoc[] = []
  for (const [key, value] of Object.entries(readMap(storageKeys.attesa(uid)))) {
    const parsed = iscrittoDaDoc(key, value)
    if (parsed) items.push(parsed)
  }
  return ordinaAttesa(items)
}

export function saveAttesaLocal(uid: string, item: IscrittoAttesaDoc): boolean {
  if (item.id === '' || item.nomeCane.trim() === '') return false
  const map = readMap(storageKeys.attesa(uid))
  map[item.id] = { ...item }
  writeJson(storageKeys.attesa(uid), map)
  return true
}

export function listAvvisiAttesa(uid: string): AvvisoAttesa[] {
  const items: AvvisoAttesa[] = []
  for (const [key, value] of Object.entries(readMap(storageKeys.avvisiAttesa(uid)))) {
    const parsed = avvisoDaDoc(key, value)
    if (parsed) items.push(parsed)
  }
  return ordinaAvvisi(items)
}

/** Solo per chi riempie il mirror locale e per i test: in produzione l'avviso lo scrive la conferma sul server. */
export function saveAvvisoAttesaLocal(uid: string, item: AvvisoAttesa): void {
  const map = readMap(storageKeys.avvisiAttesa(uid))
  map[item.id] = { ...item }
  writeJson(storageKeys.avvisiAttesa(uid), map)
}
