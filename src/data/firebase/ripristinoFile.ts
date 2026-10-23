import { getApp } from 'firebase/app'
import { doc, getDoc, getFirestore, writeBatch, Bytes } from 'firebase/firestore'
import { CHUNK_WRITE_GROUP, FILE_MAX_BYTES, splitChunks } from '../../lib/fileBytes'
import type { FileRipristino } from '../../lib/leggiRipristino'
import type { FirestoreApi } from './files'
import { salonRootPath } from './salonRoot'

type Ref = ReturnType<FirestoreApi['doc']>
type Op =
  | { op: 'delete'; ref: Ref }
  | { op: 'set'; ref: Ref; data: Record<string, unknown> }

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

export async function applicaFileRipristino(files: readonly FileRipristino[], fs: FirestoreApi, db: unknown): Promise<void> {
  if (files.length === 0) return
  const at = (id: string, ...rest: string[]) => {
    const [head, ...tail] = salonRootPath()
    return fs.doc(db as Parameters<typeof fs.doc>[0], head, ...tail, 'files', id, ...rest)
  }
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

export async function scriviFileRipristino(files: readonly FileRipristino[]): Promise<void> {
  if (files.length === 0) return
  salonRootPath()
  await applicaFileRipristino(files, { doc, getDoc, writeBatch, Bytes }, getFirestore(getApp()))
}
