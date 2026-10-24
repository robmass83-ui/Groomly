import { beforeEach, describe, expect, it } from 'vitest'
import { createFileStore, type FirestoreApi } from './files'
import { bindSalon } from './salonRoot'
import { bytesToDataUrl, CHUNK_BYTES } from '../../lib/fileBytes'

class FakeBytes {
  constructor(readonly raw: Uint8Array) {}
  static fromUint8Array(raw: Uint8Array) { return new FakeBytes(raw) }
  toUint8Array() { return this.raw }
}

function fakeFirestore(options?: { failCommit?: number }) {
  const docs = new Map<string, Record<string, unknown>>()
  const commits: string[][] = []
  let commitCount = 0
  const api = {
    Bytes: FakeBytes,
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    getDoc: async (ref: { path: string }) => ({ exists: () => docs.has(ref.path), data: () => docs.get(ref.path) }),
    writeBatch: () => {
      const ops: Array<() => void> = []
      const paths: string[] = []
      return {
        set(ref: { path: string }, data: Record<string, unknown>) { paths.push(ref.path); ops.push(() => docs.set(ref.path, data)) },
        delete(ref: { path: string }) { paths.push(`-${ref.path}`); ops.push(() => docs.delete(ref.path)) },
        async commit() {
          const index = commitCount
          commitCount += 1
          if (options?.failCommit === index) throw new Error('batch interrotto')
          ops.forEach((op) => op())
          commits.push(paths)
        },
      }
    },
  } as unknown as FirestoreApi
  return { api, docs, commits }
}

const codec = {
  fromDataUrl: async () => ({ full: new Uint8Array(300), thumb: new Uint8Array(20), mime: 'image/webp' as const, width: 1400, height: 1050 }),
}

function filled(length: number) {
  const bytes = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) bytes[index] = index % 253
  return bytes
}

describe('createFileStore', () => {
  beforeEach(() => {
    bindSalon('shared')
  })

  it('un salone non shared scrive i file in salons/{id}/files', async () => {
    bindSalon('uid-9')
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'dog:d1', kind: 'foto', dataUrl: 'data:image/jpeg;base64,QQ==', name: '', createdBy: 'u1' })
    const id = ref.slice(5)
    expect(docs.get(`salons/uid-9/files/${id}`)).toMatchObject({ owner: 'dog:d1' })
    expect([...docs.keys()].some((path) => path.startsWith('salon/shared'))).toBe(false)
    expect((await store.read(ref, 'full')).bytes.length).toBe(300)
  })

  it('una foto scrive prima il documento e poi full/data', async () => {
    const { api, docs, commits } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'dog:d1', kind: 'foto', dataUrl: 'data:image/jpeg;base64,QQ==', name: '', createdBy: 'u1' })
    const id = ref.slice('file:'.length)
    expect(ref.startsWith('file:')).toBe(true)
    expect(commits).toEqual([
      [`salon/shared/files/${id}`],
      [`salon/shared/files/${id}/full/data`],
    ])
    const main = docs.get(`salon/shared/files/${id}`)
    expect(main).toMatchObject({ kind: 'foto', owner: 'dog:d1', mime: 'image/webp', w: 1400, h: 1050, byteSize: 300, chunkCount: 0, createdBy: 'u1' })
    expect((main?.thumb as FakeBytes).raw.length).toBe(20)
    expect((docs.get(`salon/shared/files/${id}/full/data`)?.dati as FakeBytes).raw.length).toBe(300)
  })

  it('un PDF da 500 KB sta in full/data', async () => {
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(filled(500 * 1024), 'application/pdf'), name: 'listino.pdf', createdBy: 'u1' })
    const id = ref.slice(5)
    expect(docs.get(`salon/shared/files/${id}`)).toMatchObject({ kind: 'file', chunkCount: 0, name: 'listino.pdf', mime: 'application/pdf' })
    expect(docs.get(`salon/shared/files/${id}`)?.thumb).toBeUndefined()
  })

  it('un PDF da 2 MB scrive prima il documento e poi i 4 pezzi, e torna uguale', async () => {
    const { api, docs, commits } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const bytes = filled(2 * 1024 * 1024)
    const ref = await store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(bytes, 'application/pdf'), name: 'a.pdf', createdBy: 'u1' })
    const id = ref.slice(5)
    expect(docs.get(`salon/shared/files/${id}`)).toMatchObject({ chunkCount: 4 })
    expect((docs.get(`salon/shared/files/${id}/chunks/0`)?.dati as FakeBytes).raw.length).toBe(CHUNK_BYTES)
    expect(commits[0]).toEqual([`salon/shared/files/${id}`])
    expect(commits.slice(1).flat()).toEqual([
      `salon/shared/files/${id}/chunks/0`,
      `salon/shared/files/${id}/chunks/1`,
      `salon/shared/files/${id}/chunks/2`,
      `salon/shared/files/${id}/chunks/3`,
    ])
    const read = await store.read(ref, 'full')
    expect(read.mime).toBe('application/pdf')
    expect(read.bytes.length).toBe(bytes.length)
    expect(read.bytes.every((value, index) => value === bytes[index])).toBe(true)
  })

  it('un file da 11 MB non scrive niente', async () => {
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    await expect(store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(new Uint8Array(11 * 1024 * 1024), 'application/pdf'), name: 'b.pdf', createdBy: 'u1' }))
      .rejects.toThrow('Il file pesa più di 10 MB. Riduci la scansione e riprova.')
    expect(docs.size).toBe(0)
  })

  it('un file con un pezzo mancante non si apre', async () => {
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(filled(2 * 1024 * 1024), 'application/pdf'), name: 'c.pdf', createdBy: 'u1' })
    docs.delete(`salon/shared/files/${ref.slice(5)}/chunks/2`)
    await expect(store.read(ref, 'full')).rejects.toThrow('File non apribile')
  })

  it('la miniatura si legge dal documento principale', async () => {
    const { api } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'dog:d1', kind: 'foto', dataUrl: 'data:image/jpeg;base64,QQ==', name: '', createdBy: 'u1' })
    expect((await store.read(ref, 'thumb')).bytes.length).toBe(20)
    expect((await store.read(ref, 'full')).bytes.length).toBe(300)
  })

  it('se il batch dei byte fallisce non resta il documento, miniatura compresa', async () => {
    const { api, docs } = fakeFirestore({ failCommit: 1 })
    const store = createFileStore(api, {}, codec)
    await expect(store.write({ owner: 'dog:d1', kind: 'foto', dataUrl: 'data:image/jpeg;base64,QQ==', name: '', createdBy: 'u1' }))
      .rejects.toThrow('batch interrotto')
    expect(docs.size).toBe(0)
  })

  it('se un batch di pezzi fallisce non restano il documento né i pezzi già scritti', async () => {
    const { api, docs } = fakeFirestore({ failCommit: 2 })
    const store = createFileStore(api, {}, codec)
    await expect(store.write({
      owner: 'listino',
      kind: 'file',
      dataUrl: bytesToDataUrl(filled(9 * CHUNK_BYTES), 'application/pdf'),
      name: 'e.pdf',
      createdBy: 'u1',
    })).rejects.toThrow('batch interrotto')
    expect(docs.size).toBe(0)
  })

  it('remove cancella files/{id}, full/data e i pezzi', async () => {
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const big = await store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(filled(2 * 1024 * 1024), 'application/pdf'), name: 'd.pdf', createdBy: 'u1' })
    const small = await store.write({ owner: 'dog:d1', kind: 'foto', dataUrl: 'data:image/jpeg;base64,QQ==', name: '', createdBy: 'u1' })
    await store.remove(big)
    await store.remove(small)
    expect(docs.size).toBe(0)
  })
})
