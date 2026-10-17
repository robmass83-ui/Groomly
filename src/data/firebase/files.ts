import { AppError } from '../errors'
import type { CompressedPhoto } from '../../lib/photoCodec'
import {
  CHUNK_WRITE_GROUP,
  FILE_MAX_BYTES,
  FILE_TOO_LARGE,
  dataUrlToBytes,
  fileIdOf,
  fileRef,
  joinChunks,
  splitChunks,
} from '../../lib/fileBytes'
import { salonRootPath } from './salonRoot'

export type FileOwner = `dog:${string}` | `appointment:${string}` | 'listino'
export type FileVariant = 'thumb' | 'full'
export type StoreInput = { owner: FileOwner; kind: 'foto' | 'file'; dataUrl: string; name: string; createdBy: string }
export type FirestoreApi = Pick<typeof import('firebase/firestore'), 'doc' | 'getDoc' | 'writeBatch' | 'Bytes'>
export type FileStore = {
  write(input: StoreInput): Promise<string>
  read(ref: string, variant: FileVariant): Promise<{ bytes: Uint8Array; mime: string }>
  remove(ref: string): Promise<void>
}

type Codec = { fromDataUrl(dataUrl: string): Promise<CompressedPhoto> }
type BytesLike = { toUint8Array(): Uint8Array }

function missing(): AppError {
  return new AppError('File non apribile', 'file_missing')
}

export function createFileStore(fs: FirestoreApi, db: unknown, codec: Codec): FileStore {
  const firestore = db as Parameters<typeof fs.writeBatch>[0]
  const at = (...path: string[]) => {
    const [head, ...rest] = salonRootPath()
    return fs.doc(firestore, head, ...rest, 'files', ...path)
  }
  const bytesOf = (value: unknown): Uint8Array => {
    if (!value || typeof (value as BytesLike).toUint8Array !== 'function') throw missing()
    return (value as BytesLike).toUint8Array()
  }

  async function write(input: StoreInput): Promise<string> {
    const id = crypto.randomUUID()
    const main: Record<string, unknown> = {
      kind: input.kind,
      owner: input.owner,
      name: input.name,
      createdAt: Date.now(),
      createdBy: input.createdBy,
    }
    let bytes: Uint8Array
    if (input.kind === 'foto') {
      const photo = await codec.fromDataUrl(input.dataUrl)
      bytes = photo.full
      Object.assign(main, { mime: photo.mime, w: photo.width, h: photo.height, thumb: fs.Bytes.fromUint8Array(photo.thumb) })
    } else {
      const decoded = dataUrlToBytes(input.dataUrl)
      bytes = decoded.bytes
      main.mime = decoded.mime
    }
    if (bytes.length > FILE_MAX_BYTES) throw new AppError(FILE_TOO_LARGE, 'file_too_large')
    const chunks = splitChunks(bytes)
    main.byteSize = bytes.length
    main.chunkCount = chunks.length
    if (chunks.length === 0) {
      const batch = fs.writeBatch(firestore)
      batch.set(at(id, 'full', 'data'), { dati: fs.Bytes.fromUint8Array(bytes) })
      batch.set(at(id), main)
      await batch.commit()
      return fileRef(id)
    }
    for (let start = 0; start < chunks.length; start += CHUNK_WRITE_GROUP) {
      const batch = fs.writeBatch(firestore)
      chunks.slice(start, start + CHUNK_WRITE_GROUP).forEach((part, offset) => {
        batch.set(at(id, 'chunks', String(start + offset)), { dati: fs.Bytes.fromUint8Array(part) })
      })
      await batch.commit()
    }
    const last = fs.writeBatch(firestore)
    last.set(at(id), main)
    await last.commit()
    return fileRef(id)
  }

  async function readMain(id: string): Promise<Record<string, unknown>> {
    const snap = await fs.getDoc(at(id))
    if (!snap.exists()) throw missing()
    return snap.data() as Record<string, unknown>
  }

  async function read(ref: string, variant: FileVariant): Promise<{ bytes: Uint8Array; mime: string }> {
    const id = fileIdOf(ref)
    if (!id) throw missing()
    const main = await readMain(id)
    const mime = typeof main.mime === 'string' ? main.mime : 'application/octet-stream'
    if (variant === 'thumb' && main.thumb) return { bytes: bytesOf(main.thumb), mime }
    const count = typeof main.chunkCount === 'number' ? main.chunkCount : 0
    if (count === 0) {
      const snap = await fs.getDoc(at(id, 'full', 'data'))
      if (!snap.exists()) throw missing()
      return { bytes: bytesOf((snap.data() as Record<string, unknown>).dati), mime }
    }
    const parts = await Promise.all(Array.from({ length: count }, async (_, index) => {
      const snap = await fs.getDoc(at(id, 'chunks', String(index)))
      if (!snap.exists()) throw missing()
      return bytesOf((snap.data() as Record<string, unknown>).dati)
    }))
    return { bytes: joinChunks(parts), mime }
  }

  async function remove(ref: string): Promise<void> {
    const id = fileIdOf(ref)
    if (!id) return
    const snap = await fs.getDoc(at(id))
    const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {}
    const count = typeof data.chunkCount === 'number' ? data.chunkCount : 0
    const batch = fs.writeBatch(firestore)
    for (let index = 0; index < count; index += 1) batch.delete(at(id, 'chunks', String(index)))
    batch.delete(at(id, 'full', 'data'))
    batch.delete(at(id))
    await batch.commit()
  }

  return { write, read, remove }
}
