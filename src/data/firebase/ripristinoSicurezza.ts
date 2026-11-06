import { getApp } from 'firebase/app'
import { Bytes, deleteDoc, doc, getDoc, getFirestore, writeBatch } from 'firebase/firestore'
import type { BackupBundle } from '../../lib/backupDoc'
import type { CodiciCaneDoc } from '../../lib/codiceCane'
import type { FileRipristino } from '../../lib/leggiRipristino'
import { loadCloudBackup, readSalonDoc, transactionSalon } from './client'
import type { FirestoreApi } from './files'
import { applicaFileRipristino, eliminaFileRipristino, leggiFileAttuali } from './ripristinoFile'
import { salonRootPath } from './salonRoot'
import { frase } from '../../i18n/frase'

const LIMITE_JSON = 900000
const LIMITE_BYTE = 80 * 1024 * 1024
// La Privacy promette 30 giorni: la cancellazione vera la fa il giro della notte sul server.
const GIORNI_COPIA = 30

type CopiaCloud = {
  bundle: BackupBundle
  codici: CodiciCaneDoc | null
  file: FileRipristino[]
  assenti: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function strumenti(): { fs: FirestoreApi; db: ReturnType<typeof getFirestore> } {
  return {
    fs: { doc, getDoc, writeBatch, Bytes },
    db: getFirestore(getApp()),
  }
}

export function copiaScaduta(copia: Record<string, unknown>, adesso = new Date()): boolean {
  if (typeof copia.scadeIl !== 'string') return false
  const scade = Date.parse(copia.scadeIl)
  return Number.isFinite(scade) && scade <= adesso.getTime()
}

function stringhe(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function codiciDa(value: Record<string, unknown> | null): CodiciCaneDoc | null {
  if (value === null) return null
  const { next, cartella, byId } = value
  if (typeof next !== 'number' || !Number.isInteger(next) || next < 1) throw new Error(frase('errCopiaSicurezza'))
  if (cartella !== 'cani' && cartella !== 'animali') throw new Error(frase('errCopiaSicurezza'))
  if (!isRecord(byId)) throw new Error(frase('errCopiaSicurezza'))
  const codes: Record<string, string> = {}
  for (const [id, code] of Object.entries(byId)) {
    if (typeof code !== 'string' || code.length === 0) throw new Error(frase('errCopiaSicurezza'))
    codes[id] = code
  }
  return { next, cartella, byId: codes }
}

export async function salvaCopiaCloud(uid: string, ids: readonly string[]): Promise<void> {
  const bundle = await loadCloudBackup(uid)
  const codici = codiciDa(await readSalonDoc('meta', 'codici-cani'))
  const { fs, db } = strumenti()
  const letti = await leggiFileAttuali(ids, fs, db)
  let totale = 0
  for (const file of letti.presenti) totale += file.byteSize
  if (totale > LIMITE_BYTE) throw new Error(frase('errCopiaSicurezza'))
  const precedente = await readSalonDoc('meta', 'ripristino-sicurezza')
  const nuovi = letti.presenti.map((file) => file.id)
  const scadeIl = new Date(Date.now() + GIORNI_COPIA * 86_400_000).toISOString()
  const documento = { bundle, codici, assenti: letti.assenti, presenti: nuovi, scadeIl }
  if (JSON.stringify(documento).length > LIMITE_JSON) throw new Error(frase('errCopiaSicurezza'))
  await applicaFileRipristino(letti.presenti, fs, db, 'sicurezza')
  await transactionSalon(async (tx) => {
    tx.set('meta', 'ripristino-sicurezza', documento)
  })
  const vecchi = stringhe(precedente?.presenti).filter((id) => !nuovi.includes(id))
  if (vecchi.length > 0) await eliminaFileRipristino(vecchi, fs, db, 'sicurezza')
}

export async function esisteCopiaCloud(): Promise<boolean> {
  const saved = await readSalonDoc('meta', 'ripristino-sicurezza')
  return saved !== null && !copiaScaduta(saved)
}

export async function leggiCopiaCloud(): Promise<CopiaCloud | null> {
  const saved = await readSalonDoc('meta', 'ripristino-sicurezza')
  if (!saved || copiaScaduta(saved)) return null
  const richiesti = stringhe(saved.presenti)
  const { fs, db } = strumenti()
  const letti = await leggiFileAttuali(richiesti, fs, db, 'sicurezza')
  if (richiesti.some((id) => letti.assenti.includes(id))) throw new Error(frase('errCopiaSicurezza'))
  return {
    bundle: saved.bundle as BackupBundle,
    codici: (saved.codici ?? null) as CodiciCaneDoc | null,
    file: letti.presenti,
    assenti: stringhe(saved.assenti),
  }
}

export async function cancellaCopiaCloud(): Promise<void> {
  const saved = await readSalonDoc('meta', 'ripristino-sicurezza')
  if (!saved) return
  const { fs, db } = strumenti()
  await eliminaFileRipristino(stringhe(saved.presenti), fs, db, 'sicurezza')
  const [head, ...tail] = salonRootPath()
  await deleteDoc(doc(db, head, ...tail, 'meta', 'ripristino-sicurezza'))
}
