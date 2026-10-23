import { getApp } from 'firebase/app'
import { doc, getDoc, getFirestore, writeBatch, Bytes } from 'firebase/firestore'
import { ricomponiFile } from '../../lib/backupFile'
import { CHUNK_WRITE_GROUP, FILE_MAX_BYTES, splitChunks } from '../../lib/fileBytes'
import type { FileRipristino } from '../../lib/leggiRipristino'
import type { FirestoreApi } from './files'
import { salonRootPath } from './salonRoot'

type Ref = ReturnType<FirestoreApi['doc']>
type Op =
  | { op: 'delete'; ref: Ref }
  | { op: 'set'; ref: Ref; data: Record<string, unknown> }

const COPPIA_ERR = 'Copia di sicurezza non riuscita'

type BytesLike = { toUint8Array(): Uint8Array }

function salonAt(fs: FirestoreApi, db: unknown, collezione: string, id: string, ...rest: string[]) {
  const [head, ...tail] = salonRootPath()
  return fs.doc(db as Parameters<typeof fs.doc>[0], head, ...tail, collezione, id, ...rest)
}

async function commitGroups(fs: FirestoreApi, db: unknown, ops: Op[]): Promise<void> {
  const firestore = db as Parameters<typeof fs.writeBatch>[0]
  for (let start = 0; start < ops.length; start += CHUNK_WRITE_GROUP) {
    const batch = fs.writeBatch(firestore)
    for (const item of ops.slice(start, start + CHUNK_WRITE_GROUP)) {
      if (item.op === 'delete') batch.delete(item.ref)
      else batch.set(item.ref, item.data)
    }
    await batch.commit()
  }
}

function convertiPezzo(data: Record<string, unknown> | undefined): Uint8Array | null | 'illeggibile' {
  if (!data) return null
  const value = data.dati
  if (value === undefined || value === null) return null
  try {
    if (typeof (value as BytesLike).toUint8Array !== 'function') return 'illeggibile'
    return (value as BytesLike).toUint8Array()
  } catch {
    return 'illeggibile'
  }
}

function createdAtOf(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') return Date.parse(raw)
  return 0
}

function kindOf(raw: unknown, mime: string): 'foto' | 'file' {
  if (raw === 'foto' || raw === 'file') return raw
  if (mime.startsWith('image/')) return 'foto'
  return 'file'
}

export async function applicaFileRipristino(
  files: readonly FileRipristino[],
  fs: FirestoreApi,
  db: unknown,
  collezione = 'files',
): Promise<void> {
  if (files.length === 0) return
  const at = (id: string, ...rest: string[]) => salonAt(fs, db, collezione, id, ...rest)
  for (const file of files) {
    if (file.bytes.length !== file.byteSize || file.bytes.length > FILE_MAX_BYTES) throw new Error('File non valido')
    const snap = await fs.getDoc(at(file.id))
    const previous = snap.exists() ? snap.data() as Record<string, unknown> : {}
    const declared = typeof previous.chunkCount === 'number' && Number.isInteger(previous.chunkCount) && previous.chunkCount > 0
      ? Math.min(previous.chunkCount, 64)
      : 0
    const parts = splitChunks(file.bytes)
    const remove: Op[] = [{ op: 'delete', ref: at(file.id, 'full', 'data') }]
    for (let index = parts.length; index < declared; index += 1) remove.push({ op: 'delete', ref: at(file.id, 'chunks', String(index)) })
    await commitGroups(fs, db, remove)
    const main: Record<string, unknown> = {
      kind: file.kind,
      owner: file.owner,
      name: file.name,
      mime: file.mime,
      byteSize: file.bytes.length,
      chunkCount: parts.length,
      createdAt: file.createdAt,
      createdBy: file.createdBy,
    }
    if (file.w !== undefined) main.w = file.w
    if (file.h !== undefined) main.h = file.h
    if (parts.length === 0) {
      await commitGroups(fs, db, [
        { op: 'set', ref: at(file.id, 'full', 'data'), data: { dati: fs.Bytes.fromUint8Array(file.bytes) } },
        { op: 'set', ref: at(file.id), data: main },
      ])
      continue
    }
    await commitGroups(fs, db, parts.map((part, index) => ({
      op: 'set' as const,
      ref: at(file.id, 'chunks', String(index)),
      data: { dati: fs.Bytes.fromUint8Array(part) },
    })))
    await commitGroups(fs, db, [{ op: 'set', ref: at(file.id), data: main }])
  }
}

export async function leggiFileAttuali(
  ids: readonly string[],
  fs: FirestoreApi,
  db: unknown,
  collezione = 'files',
): Promise<{ presenti: FileRipristino[]; assenti: string[] }> {
  const presenti: FileRipristino[] = []
  const assenti: string[] = []
  for (const id of ids) {
    const at = (...rest: string[]) => salonAt(fs, db, collezione, id, ...rest)
    const snap = await fs.getDoc(at())
    if (!snap.exists()) {
      assenti.push(id)
      continue
    }
    const meta = snap.data() as Record<string, unknown>
    const chunkCount = typeof meta.chunkCount === 'number' && Number.isInteger(meta.chunkCount) && meta.chunkCount > 0
      ? meta.chunkCount
      : 0
    const byteSize = typeof meta.byteSize === 'number' ? meta.byteSize : undefined
    const parts: Array<Uint8Array | null> = []
    if (chunkCount === 0) {
      const fullSnap = await fs.getDoc(at('full', 'data'))
      const piece = convertiPezzo(fullSnap.exists() ? fullSnap.data() as Record<string, unknown> : undefined)
      if (piece === 'illeggibile') throw new Error(COPPIA_ERR)
      parts.push(piece)
    } else {
      for (let index = 0; index < chunkCount; index += 1) {
        const chunkSnap = await fs.getDoc(at('chunks', String(index)))
        const piece = convertiPezzo(chunkSnap.exists() ? chunkSnap.data() as Record<string, unknown> : undefined)
        if (piece === 'illeggibile') throw new Error(COPPIA_ERR)
        parts.push(piece)
        if (piece === null) break
      }
    }
    const done = ricomponiFile({ chunkCount, byteSize, parts })
    if (!done.ok) throw new Error(COPPIA_ERR)
    if (done.bytes.length > FILE_MAX_BYTES) throw new Error(COPPIA_ERR)
    const mime = typeof meta.mime === 'string' ? meta.mime : ''
    const file: FileRipristino = {
      id,
      kind: kindOf(meta.kind, mime),
      owner: typeof meta.owner === 'string' ? meta.owner : '',
      name: typeof meta.name === 'string' ? meta.name : '',
      mime,
      byteSize: done.bytes.length,
      createdAt: createdAtOf(meta.createdAt),
      createdBy: typeof meta.createdBy === 'string' ? meta.createdBy : '',
      bytes: done.bytes,
    }
    if (typeof meta.w === 'number') file.w = meta.w
    if (typeof meta.h === 'number') file.h = meta.h
    presenti.push(file)
  }
  return { presenti, assenti }
}

export async function eliminaFileRipristino(
  ids: readonly string[],
  fs: FirestoreApi,
  db: unknown,
  collezione = 'files',
): Promise<void> {
  if (ids.length === 0) return
  for (const id of ids) {
    const at = (...rest: string[]) => salonAt(fs, db, collezione, id, ...rest)
    const snap = await fs.getDoc(at())
    const raw = snap.exists() ? snap.data() as Record<string, unknown> : {}
    const chunkCount = typeof raw.chunkCount === 'number' && Number.isInteger(raw.chunkCount) ? raw.chunkCount : 0
    const declared = chunkCount > 0 ? Math.min(chunkCount, 64) : 0
    const remove: Op[] = [{ op: 'delete', ref: at('full', 'data') }]
    for (let index = 0; index < declared; index += 1) remove.push({ op: 'delete', ref: at('chunks', String(index)) })
    remove.push({ op: 'delete', ref: at() })
    await commitGroups(fs, db, remove)
  }
}

export async function scriviFileRipristino(files: readonly FileRipristino[]): Promise<void> {
  if (files.length === 0) return
  salonRootPath()
  await applicaFileRipristino(files, { doc, getDoc, writeBatch, Bytes }, getFirestore(getApp()))
}
