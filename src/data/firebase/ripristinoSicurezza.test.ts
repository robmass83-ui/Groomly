import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDoc } from 'firebase/firestore'
import type { BackupBundle } from '../../lib/backupDoc'
import type { FileRipristino } from '../../lib/leggiRipristino'
import { loadCloudBackup, readSalonDoc, transactionSalon, type SalonTransaction } from './client'
import { applicaFileRipristino, eliminaFileRipristino, leggiFileAttuali } from './ripristinoFile'
import { bindSalon, clearSalon } from './salonRoot'
import { cancellaCopiaCloud, esisteCopiaCloud, leggiCopiaCloud, salvaCopiaCloud } from './ripristinoSicurezza'

const { calls, meta, presenti, deleted } = vi.hoisted(() => ({
  calls: [] as string[],
  meta: new Map<string, Record<string, unknown>>(),
  presenti: { presenti: [] as FileRipristino[], assenti: [] as string[] },
  deleted: [] as string[],
}))

vi.mock('./client', () => ({
  loadCloudBackup: vi.fn(async () => ({
    dogs: { a: {} },
    appointments: {},
    services: {},
    settings: { business: { salonName: 'Pelosetti' } },
    closures: {},
  })),
  readSalonDoc: vi.fn(async (kind: string, id: string) => (
    kind === 'meta' && id === 'codici-cani'
      ? { next: 2, cartella: 'cani', byId: { a: 'C0001' } }
      : meta.get(`${kind}/${id}`) ?? null
  )),
  transactionSalon: vi.fn(async (run: (tx: { set: (kind: string, id: string, data: Record<string, unknown>) => void }) => Promise<void>) => {
    calls.push('meta')
    await run({ set: (_kind, id, data) => { meta.set(`meta/${id}`, data) } })
  }),
}))

vi.mock('./ripristinoFile', () => ({
  leggiFileAttuali: vi.fn(async (ids: readonly string[]) => {
    calls.push(`leggi:${ids.join(',')}`)
    return presenti
  }),
  applicaFileRipristino: vi.fn(async () => { calls.push('scrivi') }),
  eliminaFileRipristino: vi.fn(async (ids: readonly string[]) => { calls.push(`elimina:${ids.join(',')}`) }),
}))

vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(async (ref: { path: string }) => { deleted.push(ref.path) }),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  writeBatch: vi.fn(),
  Bytes: { fromUint8Array: (raw: Uint8Array) => raw },
  getFirestore: vi.fn(() => ({})),
}))

vi.mock('firebase/app', () => ({ getApp: vi.fn(() => ({})) }))

function bundleAttuale(): BackupBundle {
  return {
    dogs: { a: {} },
    appointments: {},
    services: {},
    settings: { business: { salonName: 'Pelosetti' } },
    closures: {},
  }
}

function foto(over: Partial<FileRipristino> = {}): FileRipristino {
  const bytes = over.bytes ?? new Uint8Array([1])
  return {
    id: 'f1',
    kind: 'foto',
    owner: 'dog:a',
    name: '',
    mime: 'image/webp',
    byteSize: bytes.length,
    createdAt: 1,
    createdBy: 'u1',
    bytes,
    ...over,
  }
}

function codiciValidi() {
  return { next: 2, cartella: 'cani', byId: { a: 'C0001' } }
}

describe('copia cloud', () => {
  beforeEach(() => {
    calls.length = 0
    deleted.length = 0
    meta.clear()
    presenti.presenti = []
    presenti.assenti = []
    clearSalon()
    vi.clearAllMocks()
    vi.mocked(loadCloudBackup).mockImplementation(async () => bundleAttuale())
    vi.mocked(readSalonDoc).mockImplementation(async (kind: string, id: string) => (
      kind === 'meta' && id === 'codici-cani'
        ? codiciValidi()
        : meta.get(`${kind}/${id}`) ?? null
    ))
    vi.mocked(transactionSalon).mockImplementation(async (run) => {
      calls.push('meta')
      await run({ set: (_kind, id, data) => { meta.set(`meta/${id}`, data) } } as SalonTransaction)
    })
    vi.mocked(leggiFileAttuali).mockImplementation(async (ids) => {
      calls.push(`leggi:${ids.join(',')}`)
      return presenti
    })
    vi.mocked(applicaFileRipristino).mockImplementation(async () => { calls.push('scrivi') })
    vi.mocked(eliminaFileRipristino).mockImplementation(async (ids) => { calls.push(`elimina:${ids.join(',')}`) })
    vi.mocked(deleteDoc).mockImplementation(async (ref) => { deleted.push(ref.path) })
  })

  it('salva i file presenti, i codici e gli assenti', async () => {
    const file = foto()
    presenti.presenti = [file]
    presenti.assenti = ['manca']
    await salvaCopiaCloud('u1', ['f1'])
    expect(calls).toEqual(['leggi:f1', 'scrivi', 'meta'])
    expect(leggiFileAttuali).toHaveBeenCalledWith(['f1'], expect.any(Object), expect.anything())
    expect(vi.mocked(leggiFileAttuali).mock.calls[0]?.[3]).toBeUndefined()
    expect(applicaFileRipristino).toHaveBeenCalledWith([file], expect.any(Object), expect.anything(), 'sicurezza')
    expect(meta.get('meta/ripristino-sicurezza')).toMatchObject({
      bundle: bundleAttuale(),
      codici: codiciValidi(),
      assenti: ['manca'],
      presenti: ['f1'],
    })
    expect((meta.get('meta/ripristino-sicurezza')?.codici as { next: number }).next).toBe(2)
  })

  it('rifiuta un bundle il cui JSON supera 900000 caratteri', async () => {
    const dogs: Record<string, unknown> = {}
    dogs['x'.repeat(900_000)] = {}
    vi.mocked(loadCloudBackup).mockResolvedValueOnce({
      dogs,
      appointments: {},
      services: {},
      settings: {},
      closures: {},
    })
    await expect(salvaCopiaCloud('u1', ['f1'])).rejects.toThrow('Copia di sicurezza non riuscita')
    expect(calls).not.toContain('scrivi')
    expect(calls).not.toContain('meta')
    expect(meta.has('meta/ripristino-sicurezza')).toBe(false)
  })

  it('rifiuta il documento intero sopra 900000 caratteri', async () => {
    const id = 'a'.repeat(900_000)
    presenti.presenti = []
    presenti.assenti = [id]
    await expect(salvaCopiaCloud('u1', [id])).rejects.toThrow('Copia di sicurezza non riuscita')
    expect(calls).not.toContain('scrivi')
    expect(calls).not.toContain('meta')
    expect(meta.has('meta/ripristino-sicurezza')).toBe(false)
  })

  it('salva codici null quando il documento dei codici manca', async () => {
    vi.mocked(readSalonDoc).mockImplementation(async (kind: string, id: string) => (
      kind === 'meta' && id === 'codici-cani' ? null : meta.get(`${kind}/${id}`) ?? null
    ))
    await salvaCopiaCloud('u1', [])
    expect(meta.get('meta/ripristino-sicurezza')?.codici).toBeNull()
  })

  it.each([
    { next: 1.5, cartella: 'cani', byId: {} },
    { next: 0, cartella: 'cani', byId: {} },
    { next: 1, cartella: 'altro', byId: {} },
    { next: 1, cartella: 'cani', byId: { a: '' } },
    { next: 1, cartella: 'cani', byId: [] },
  ])('rifiuta i codici non validi %#', async (codici) => {
    vi.mocked(readSalonDoc).mockImplementation(async (kind: string, id: string) => (
      kind === 'meta' && id === 'codici-cani'
        ? codici as Record<string, unknown>
        : meta.get(`${kind}/${id}`) ?? null
    ))
    await expect(salvaCopiaCloud('u1', ['f1'])).rejects.toThrow('Copia di sicurezza non riuscita')
    expect(meta.has('meta/ripristino-sicurezza')).toBe(false)
    expect(calls).not.toContain('meta')
  })

  it('accetta la cartella animali', async () => {
    vi.mocked(readSalonDoc).mockImplementation(async (kind: string, id: string) => (
      kind === 'meta' && id === 'codici-cani'
        ? { next: 1, cartella: 'animali', byId: {} }
        : meta.get(`${kind}/${id}`) ?? null
    ))
    await salvaCopiaCloud('u1', [])
    expect(meta.get('meta/ripristino-sicurezza')?.codici).toEqual({ next: 1, cartella: 'animali', byId: {} })
  })

  it('cancella gli id vecchi dopo il meta', async () => {
    meta.set('meta/ripristino-sicurezza', { presenti: ['vecchio'], assenti: [], codici: null, bundle: bundleAttuale() })
    presenti.presenti = [foto()]
    presenti.assenti = []
    await salvaCopiaCloud('u1', ['f1'])
    expect(calls).toEqual(['leggi:f1', 'scrivi', 'meta', 'elimina:vecchio'])
    expect(eliminaFileRipristino).toHaveBeenCalledWith(['vecchio'], expect.any(Object), expect.anything(), 'sicurezza')
  })

  it('esisteCopiaCloud è falso se il meta manca e vero se c’è, senza leggere i file', async () => {
    await expect(esisteCopiaCloud()).resolves.toBe(false)
    meta.set('meta/ripristino-sicurezza', {
      bundle: bundleAttuale(),
      codici: null,
      assenti: [],
      presenti: ['f1'],
    })
    await expect(esisteCopiaCloud()).resolves.toBe(true)
    expect(leggiFileAttuali).not.toHaveBeenCalled()
  })

  it('legge null se il meta manca e altrimenti i file e gli assenti', async () => {
    expect(await leggiCopiaCloud()).toBeNull()
    const file = foto()
    meta.set('meta/ripristino-sicurezza', {
      bundle: bundleAttuale(),
      codici: codiciValidi(),
      assenti: ['manca'],
      presenti: ['f1'],
    })
    presenti.presenti = [file]
    presenti.assenti = []
    await expect(leggiCopiaCloud()).resolves.toEqual({
      bundle: bundleAttuale(),
      codici: codiciValidi(),
      file: [file],
      assenti: ['manca'],
    })
    expect(leggiFileAttuali).toHaveBeenCalledWith(['f1'], expect.any(Object), expect.anything(), 'sicurezza')
  })

  it('rifiuta se un file segnato presente non si legge', async () => {
    meta.set('meta/ripristino-sicurezza', {
      bundle: bundleAttuale(),
      codici: null,
      assenti: [],
      presenti: ['f1'],
    })
    presenti.presenti = []
    presenti.assenti = ['f1']
    await expect(leggiCopiaCloud()).rejects.toThrow('Copia di sicurezza non riuscita')
  })

  it('rifiuta se i byte dei file superano 80 MiB', async () => {
    presenti.presenti = [foto({ byteSize: 80 * 1024 * 1024 + 1 })]
    presenti.assenti = []
    await expect(salvaCopiaCloud('u1', ['f1'])).rejects.toThrow('Copia di sicurezza non riuscita')
    expect(calls).not.toContain('scrivi')
    expect(calls).not.toContain('meta')
  })

  it('accetta i file fino a 80 MiB compresi', async () => {
    presenti.presenti = [foto({ byteSize: 80 * 1024 * 1024 })]
    presenti.assenti = []
    await salvaCopiaCloud('u1', ['f1'])
    expect(calls).toContain('scrivi')
    expect(calls).toContain('meta')
  })

  it('cancella i file della copia e poi il meta sul percorso del salone', async () => {
    bindSalon('shared')
    meta.set('meta/ripristino-sicurezza', { presenti: ['f1'], assenti: [], codici: null, bundle: bundleAttuale() })
    await cancellaCopiaCloud()
    expect(eliminaFileRipristino).toHaveBeenCalledWith(['f1'], expect.any(Object), expect.anything(), 'sicurezza')
    expect(deleted).toEqual(['salon/shared/meta/ripristino-sicurezza'])
    expect(transactionSalon).not.toHaveBeenCalled()
    expect(vi.mocked(eliminaFileRipristino).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(deleteDoc).mock.invocationCallOrder[0])
  })

  it('non fa nulla se la copia cloud manca', async () => {
    bindSalon('shared')
    await cancellaCopiaCloud()
    expect(eliminaFileRipristino).not.toHaveBeenCalled()
    expect(deleteDoc).not.toHaveBeenCalled()
    expect(deleted).toEqual([])
  })
})
