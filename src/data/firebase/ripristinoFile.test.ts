import { beforeEach, describe, expect, it } from 'vitest'
import { applicaFileRipristino, eliminaFileRipristino, leggiFileAttuali } from './ripristinoFile'
import type { FirestoreApi } from './files'
import { bindSalon } from './salonRoot'
import { CHUNK_BYTES } from '../../lib/fileBytes'
import type { FileRipristino } from '../../lib/leggiRipristino'

class FakeBytes {
  constructor(readonly raw: Uint8Array) {}
  static fromUint8Array(raw: Uint8Array) { return new FakeBytes(raw) }
  toUint8Array() { return this.raw }
}

function fakeFirestore() {
  const docs = new Map<string, Record<string, unknown>>()
  const commits: string[][] = []
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
        async commit() { ops.forEach((op) => op()); commits.push(paths) },
      }
    },
  } as unknown as FirestoreApi
  return { api, docs, commits }
}

function foto(bytes: Uint8Array, over: Partial<FileRipristino> = {}): FileRipristino {
  return {
    id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp',
    byteSize: bytes.length, createdAt: Date.parse('2026-10-22T12:00:00.000Z'), createdBy: 'u1', bytes, ...over,
  }
}

describe('applicaFileRipristino', () => {
  beforeEach(() => { bindSalon('shared') })

  it('riscrive il WebP in files/f1 e full/data, senza miniatura', async () => {
    const { api, docs, commits } = fakeFirestore()
    const bytes = new Uint8Array([9, 8, 7])
    await applicaFileRipristino([foto(bytes, { w: 12, h: 8 })], api, {})
    const main = docs.get('salon/shared/files/f1')
    expect(main).toEqual({
      kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 3, chunkCount: 0,
      createdAt: Date.parse('2026-10-22T12:00:00.000Z'), createdBy: 'u1', w: 12, h: 8,
    })
    expect(main?.thumb).toBeUndefined()
    expect(Array.from((docs.get('salon/shared/files/f1/full/data')?.dati as FakeBytes).raw)).toEqual([9, 8, 7])
    expect(commits.at(-1)).toEqual(expect.arrayContaining(['salon/shared/files/f1', 'salon/shared/files/f1/full/data']))
  })

  it('un salone non shared non scrive salon/shared', async () => {
    bindSalon('uid-9')
    const { api, docs } = fakeFirestore()
    await applicaFileRipristino([foto(new Uint8Array([1]))], api, {})
    expect(docs.has('salons/uid-9/files/f1')).toBe(true)
    expect([...docs.keys()].some((path) => path.startsWith('salon/shared'))).toBe(false)
  })

  it('sopra i 700 KiB i pezzi precedono il documento principale', async () => {
    const { api, docs, commits } = fakeFirestore()
    const bytes = new Uint8Array(700 * 1024 + 1)
    bytes[0] = 4
    bytes[CHUNK_BYTES] = 5
    await applicaFileRipristino([foto(bytes)], api, {})
    expect(docs.get('salon/shared/files/f1')?.chunkCount).toBe(2)
    expect(docs.has('salon/shared/files/f1/full/data')).toBe(false)
    expect((docs.get('salon/shared/files/f1/chunks/0')?.dati as FakeBytes).raw[0]).toBe(4)
    expect((docs.get('salon/shared/files/f1/chunks/1')?.dati as FakeBytes).raw[0]).toBe(5)
    const last = commits.at(-1) ?? []
    expect(last).toEqual(['salon/shared/files/f1'])
    expect(commits.some((paths) => paths.includes('salon/shared/files/f1/chunks/0'))).toBe(true)
  })

  it('sostituisce i chunk vecchi fino all indice 63 e lascia gli altri id', async () => {
    const { api, docs } = fakeFirestore()
    docs.set('salon/shared/files/f1', { chunkCount: 65, thumb: new FakeBytes(new Uint8Array([1])), mime: 'image/jpeg' })
    for (let index = 0; index < 65; index += 1) docs.set(`salon/shared/files/f1/chunks/${index}`, { dati: new FakeBytes(new Uint8Array([index])) })
    docs.set('salon/shared/files/f1/full/data', { dati: new FakeBytes(new Uint8Array([7])) })
    docs.set('salon/shared/files/f2', { kind: 'file', name: 'resta' })
    await applicaFileRipristino([foto(new Uint8Array([3, 3]))], api, {})
    expect(Array.from((docs.get('salon/shared/files/f1/full/data')?.dati as FakeBytes).raw)).toEqual([3, 3])
    expect(docs.get('salon/shared/files/f1')?.thumb).toBeUndefined()
    expect(docs.get('salon/shared/files/f1')?.mime).toBe('image/webp')
    expect(docs.has('salon/shared/files/f1/chunks/0')).toBe(false)
    expect(docs.has('salon/shared/files/f1/chunks/63')).toBe(false)
    expect(docs.has('salon/shared/files/f1/chunks/64')).toBe(true)
    expect(docs.get('salon/shared/files/f2')).toEqual({ kind: 'file', name: 'resta' })
  })

  it('scrive la copia nella collezione sicurezza e non in files', async () => {
    const { api, docs } = fakeFirestore()
    await applicaFileRipristino([foto(new Uint8Array([4]))], api, {}, 'sicurezza')
    expect(docs.has('salon/shared/sicurezza/f1')).toBe(true)
    expect(docs.has('salon/shared/files/f1')).toBe(false)
  })

  it('legge i byte attuali e segna assente un id senza documento', async () => {
    const { api, docs } = fakeFirestore()
    docs.set('salon/shared/files/f1', {
      kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 2, chunkCount: 0,
      createdAt: 1000, createdBy: 'u1',
    })
    docs.set('salon/shared/files/f1/full/data', { dati: new FakeBytes(new Uint8Array([4, 5])) })
    const letti = await leggiFileAttuali(['f1', 'manca'], api, {})
    expect(letti.assenti).toEqual(['manca'])
    expect(letti.presenti).toEqual([foto(new Uint8Array([4, 5]), { createdAt: 1000 })])
  })

  it('cancella il documento, full/data e i chunk fino all indice 63', async () => {
    const { api, docs } = fakeFirestore()
    docs.set('salon/shared/files/f9', { chunkCount: 65 })
    docs.set('salon/shared/files/f9/full/data', { dati: new FakeBytes(new Uint8Array([1])) })
    for (let index = 0; index < 65; index += 1) docs.set(`salon/shared/files/f9/chunks/${index}`, { dati: new FakeBytes(new Uint8Array([1])) })
    await eliminaFileRipristino(['f9'], api, {})
    expect(docs.has('salon/shared/files/f9')).toBe(false)
    expect(docs.has('salon/shared/files/f9/full/data')).toBe(false)
    expect(docs.has('salon/shared/files/f9/chunks/63')).toBe(false)
    expect(docs.has('salon/shared/files/f9/chunks/64')).toBe(true)
  })
})
