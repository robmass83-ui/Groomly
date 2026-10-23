import { getApp } from 'firebase/app'
import { Bytes, deleteDoc, doc, getDoc, getFirestore, writeBatch } from 'firebase/firestore'
import type { BackupBundle } from '../../lib/backupDoc'
import type { CodiciCaneDoc } from '../../lib/codiceCane'
import type { FileRipristino } from '../../lib/leggiRipristino'
import { loadCloudBackup, readSalonDoc, transactionSalon } from './client'
import type { FirestoreApi } from './files'
import { applicaFileRipristino, eliminaFileRipristino, leggiFileAttuali } from './ripristinoFile'
import { salonRootPath } from './salonRoot'

const ERRORE = 'Copia di sicurezza non riuscita'
const LIMITE_JSON = 900000
const LIMITE_BYTE = 80 * 1024 * 1024

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

function stringhe(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function codiciDa(value: Record<string, unknown> | null): CodiciCaneDoc | null {
  if (value === null) return null
  const { next, cartella, byId } = value
  if (typeof next !== 'number' || !Number.isInteger(next) || next < 1) throw new Error(ERRORE)
  if (cartella !== 'cani' && cartella !== 'animali') throw new Error(ERRORE)
  if (!isRecord(byId)) throw new Error(ERRORE)
  const codes: Record<string, string> = {}
  for (const [id, code] of Object.entries(byId)) {
    if (typeof code !== 'string' || code.length === 0) throw new Error(ERRORE)
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
  if (totale > LIMITE_BYTE) throw new Error(ERRORE)
  const precedente = await readSalonDoc('meta', 'ripristino-sicurezza')
  const nuovi = letti.presenti.map((file) => file.id)
  const documento = { bundle, codici, assenti: letti.assenti, presenti: nuovi }
  if (JSON.stringify(documento).length > LIMITE_JSON) throw new Error(ERRORE)
  await applicaFileRipristino(letti.presenti, fs, db, 'sicurezza')
  await transactionSalon(async (tx) => {
    tx.set('meta', 'ripristino-sicurezza', documento)
  })
  const vecchi = stringhe(precedente?.presenti).filter((id) => !nuovi.includes(id))
  if (vecchi.length > 0) await eliminaFileRipristino(vecchi, fs, db, 'sicurezza')
}

export async function leggiCopiaCloud(): Promise<CopiaCloud | null> {
  const saved = await readSalonDoc('meta', 'ripristino-sicurezza')
  if (!saved) return null
  const richiesti = stringhe(saved.presenti)
  const { fs, db } = strumenti()
  const letti = await leggiFileAttuali(richiesti, fs, db, 'sicurezza')
  if (richiesti.some((id) => letti.assenti.includes(id))) throw new Error(ERRORE)
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
