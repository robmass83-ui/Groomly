import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors'
import { readRestoreBundle } from '../../lib/backupDoc'
import { sha256Hex } from '../../lib/backupBundle'
import { bindSalon, clearSalon, salonDocPath, salonRootPath } from './salonRoot'
import { LIMITE_LETTURE, mappaConLimite, raccogliBackup } from './backupCollect'

class FakeBytes {
  constructor(readonly raw: Uint8Array) {}
  toUint8Array() { return this.raw }
}

class BrokenBytes {
  toUint8Array(): Uint8Array { throw new Error('bytes corrotti') }
}

type Data = Record<string, unknown>

type Fake = {
  docs: Map<string, Data>
  reads: string[]
  writes: string[]
  failTransaction: unknown
  failRead: unknown
  beforeTransaction: (() => void) | null
  inFlight: number
  maxInFlight: number
  readDoc: (kind: string, id: string, ...sub: string[]) => Promise<Data | null>
  readCollection: (kind: string) => Promise<Array<{ id: string; data: Data }>>
  transaction: <T>(run: (tx: {
    get(kind: string, id: string): Promise<Data | null>
    set(kind: string, id: string, data: Data): void
  }) => Promise<T>) => Promise<T>
}

const hoisted = vi.hoisted(() => ({ current: null as unknown }))
const cur = () => hoisted.current as Fake

vi.mock('./client', () => ({
  readSalonDoc: (kind: string, id: string, ...sub: string[]) => cur().readDoc(kind, id, ...sub),
  readSalonCollection: (kind: string) => cur().readCollection(kind),
  transactionSalon: (run: never) => cur().transaction(run),
}))

function fakeFirestore(): Fake {
  const fake: Fake = {
    docs: new Map(),
    reads: [],
    writes: [],
    failTransaction: null,
    failRead: null,
    beforeTransaction: null,
    inFlight: 0,
    maxInFlight: 0,
    async readDoc(kind, id, ...sub) {
      const path = [...salonDocPath(kind, id), ...sub].join('/')
      fake.reads.push(path)
      if (fake.failRead) throw fake.failRead
      fake.inFlight += 1
      fake.maxInFlight = Math.max(fake.maxInFlight, fake.inFlight)
      await Promise.resolve()
      await Promise.resolve()
      fake.inFlight -= 1
      return fake.docs.get(path) ?? null
    },
    async readCollection(kind) {
      const root = [...salonRootPath(), kind].join('/')
      fake.reads.push(`${root}/*`)
      if (fake.failRead) throw fake.failRead
      return [...fake.docs.entries()]
        .filter(([path]) => path.startsWith(`${root}/`) && !path.slice(root.length + 1).includes('/'))
        .map(([path, data]) => ({ id: path.slice(root.length + 1), data }))
    },
    async transaction(run) {
      fake.beforeTransaction?.()
      if (fake.failTransaction) throw fake.failTransaction
      const pending: Array<() => void> = []
      const result = await run({
        async get(kind, id) {
          const path = salonDocPath(kind, id).join('/')
          fake.reads.push(`tx:${path}`)
          return fake.docs.get(path) ?? null
        },
        set(kind, id, data) {
          const path = salonDocPath(kind, id).join('/')
          pending.push(() => {
            fake.writes.push(path)
            fake.docs.set(path, data)
          })
        },
      })
      pending.forEach((apply) => apply())
      return result
    },
  }
  return fake
}

const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20])
const NOW = new Date('2026-10-22T21:30:00.000Z')
const START = Date.parse('2026-10-22T21:30:00.000Z')

function seedDog(fake: Fake, id = 'd1', extra: Data = {}) {
  fake.docs.set(`salon/shared/dogs/${id}`, {
    id,
    name: 'Fido',
    species: 'cane',
    breed: 'Barboncino',
    contact: { name: 'Ada', phone: '333' },
    photo: 'file:f1',
    createdAt: 1,
    updatedAt: 1,
    ...extra,
  })
}

function seedFile(fake: Fake, id: string, bytes: Uint8Array, extra: Data = {}) {
  fake.docs.set(`salon/shared/files/${id}`, {
    kind: 'foto',
    owner: 'dog:d1',
    name: '',
    mime: 'image/webp',
    byteSize: bytes.length,
    chunkCount: 0,
    w: 10,
    h: 10,
    createdAt: 1,
    createdBy: 'u1',
    thumb: new FakeBytes(new Uint8Array([9, 9])),
    ...extra,
  })
  fake.docs.set(`salon/shared/files/${id}/full/data`, { dati: new FakeBytes(bytes) })
}

function seedBrief(fake: Fake) {
  seedDog(fake)
  fake.docs.set('salon/shared/appointments/a1', {
    id: 'a1',
    dogId: 'd1',
    start: START,
    services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 10 }],
    photos: [{ id: 'p1', photo: 'file:f1', kind: 'prima' }],
    status: 'programmato',
    createdAt: 1,
    updatedAt: 1,
  })
  fake.docs.set('salon/shared/settings/main', {
    business: { salonName: 'Pelosetti' },
    backup: { autoDaily: true, lastAt: '2026-10-19T18:50:25.964Z' },
    updatedAt: '2026-10-01T00:00:00.000Z',
  })
  fake.docs.set('salon/shared/meta/deleted-dogs', { ids: ['d1', 'ghost'], appointmentIds: [] })
  fake.docs.set('salon/shared/members/m1', { secret: true })
  fake.docs.set('accounts/u1', { secret: true })
  seedFile(fake, 'f1', WEBP)
}

describe('mappaConLimite', () => {
  it('tiene al massimo tre worker insieme e li esegue tutti', async () => {
    let active = 0
    let max = 0
    const done: number[] = []
    await mappaConLimite([0, 1, 2, 3, 4, 5], 3, async (item) => {
      active += 1
      max = Math.max(max, active)
      await Promise.resolve()
      await Promise.resolve()
      active -= 1
      done.push(item)
    })
    expect(max).toBe(3)
    expect(done.sort()).toEqual([0, 1, 2, 3, 4, 5])
    expect(LIMITE_LETTURE).toBe(3)
  })

  it('un sink in coda di Promise non si sovrappone', async () => {
    let tail: Promise<void> = Promise.resolve()
    let active = 0
    let overlap = false
    const sink = (): Promise<void> => {
      const run = tail.then(async () => {
        active += 1
        if (active > 1) overlap = true
        await Promise.resolve()
        await Promise.resolve()
        active -= 1
      })
      tail = run
      return run
    }
    await mappaConLimite([0, 1, 2, 3, 4, 5], 3, async () => { await sink() })
    expect(overlap).toBe(false)
  })

  it('un worker che fallisce ferma gli indici successivi e rilancia l\'errore', async () => {
    const seen: number[] = []
    await expect(mappaConLimite([0, 1, 2, 3, 4, 5], 2, async (item) => {
      seen.push(item)
      if (item === 1) throw new Error('rotto')
      await Promise.resolve()
    })).rejects.toThrow('rotto')
    expect(seen.length).toBeLessThan(6)
  })
})

describe('raccogliBackup', () => {
  let fake: Fake

  beforeEach(() => {
    bindSalon('shared')
    fake = fakeFirestore()
    hoisted.current = fake
  })

  afterEach(() => {
    clearSalon()
    vi.restoreAllMocks()
    hoisted.current = null
  })

  it('un cane lapidato con documento entra nel JSON con codice e il documento cane non si scrive', async () => {
    seedBrief(fake)
    const dogBefore = fake.docs.get('salon/shared/dogs/d1')
    const dogJsonBefore = JSON.stringify(dogBefore)
    const received: Array<{ id: string; bytes: Uint8Array; path: string }> = []
    const result = await raccogliBackup(NOW, { onFile: (meta, bytes, path) => { received.push({ id: meta.id, bytes, path }) } })

    expect(received).toHaveLength(1)
    expect(received[0].id).toBe('f1')
    expect([...received[0].bytes]).toEqual([...WEBP])
    expect(Object.keys(result.dati.dogs)).toEqual(['d1'])
    expect(result.dati.codiciCane.byId.d1).toBe('C0001')
    expect(result.dati.codiciCane.byId.ghost).toBeUndefined()
    expect(result.dati.codiciCane.cartella).toBe('cani')
    const file = result.dati.files.f1
    expect(file.percorsoBackup).toBe('cani/C0001 - Fido - Barboncino (Ada)/2026-10-22 - Bagno/prima-01.webp')
    expect(file.percorsoBackup).toContain('2026-10-22')
    expect(file.percorsoBackup).toContain('prima-01.webp')
    expect(file.altriRiferimenti).toEqual(['cani/C0001 - Fido - Barboncino (Ada)/profilo.webp'])
    expect(file.altriRiferimenti?.some((path) => path.endsWith('profilo.webp'))).toBe(true)
    expect(file.estensione).toBe('.webp')
    expect(file.esito).toBe('ok')
    expect(result.dati.deletedDogs.ids).toEqual(['d1', 'ghost'])
    expect((result.dati.settings as { backup?: unknown }).backup).toBeUndefined()
    expect((result.dati.settings.business as { salonName: string }).salonName).toBe('Pelosetti')
    expect(result.json).not.toContain('"backup"')
    expect(received[0].path).toBe(file.percorsoBackup)

    expect(fake.docs.get('salon/shared/dogs/d1')).toBe(dogBefore)
    expect(JSON.stringify(fake.docs.get('salon/shared/dogs/d1'))).toBe(dogJsonBefore)
    expect(fake.writes).toEqual(['salon/shared/meta/codici-cani'])
    expect(fake.docs.get('salon/shared/settings/main')).toHaveProperty('backup')

    expect(result.manifest.tipo).toBe('completo')
    expect(result.manifest.fotoIncluse).toBe(true)
    expect(result.manifest.creatoIl).toBe('2026-10-22T23:30:00+02:00')
    expect(result.manifest.salone).toEqual({ id: 'shared', nome: 'Pelosetti' })
    expect(result.manifest.conteggi).toMatchObject({ cani: 1, appuntamenti: 1, foto: 1, fotoMancanti: 0 })

    fake.writes.length = 0
    fake.reads.length = 0
    const again = await raccogliBackup(NOW)
    expect(fake.writes).toEqual([])
    expect(fake.reads.some((path) => path.startsWith('tx:'))).toBe(false)
    expect(again.dati.codiciCane).toEqual(result.dati.codiciCane)
  })

  it('il JSON non contiene byte, ha le chiavi nuove e il checksum è lo sha256 della stringa', async () => {
    seedBrief(fake)
    const result = await raccogliBackup(NOW)
    expect(Object.keys(result)).toEqual(['dati', 'manifest', 'json', 'checksum'])
    expect(result.json).not.toContain('"dati"')
    expect(result.json).not.toContain('thumb')
    expect(Object.keys(JSON.parse(result.json) as object)).toEqual([
      'versioneFormato', 'dogs', 'appointments', 'services', 'settings', 'closures',
      'files', 'deletedDogs', 'codiciCane', 'fotoMancanti',
    ])
    expect(result.checksum).toBe(await sha256Hex(result.json))
    expect(result.manifest.checksum['groomly-dati.json']).toBe(result.checksum)
    const accepted = readRestoreBundle(JSON.parse(result.json) as unknown)
    expect(Object.keys(accepted?.dogs ?? {})).toEqual(['d1'])
    expect((result.dati.dogs.d1 as { photo: string }).photo).toBe('file:f1')
    expect((result.dati.appointments.a1 as { start: string }).start).toBe('2026-10-22T21:30:00.000Z')
  })

  it('non legge members né accounts', async () => {
    seedBrief(fake)
    await raccogliBackup(NOW)
    expect(fake.reads.some((path) => path.includes('members') || path.includes('accounts'))).toBe(false)
  })

  it('senza onFile verifica e scarta i byte, con includiByte false non li legge', async () => {
    seedBrief(fake)
    const onFile = vi.fn()
    const result = await raccogliBackup(NOW, { includiByte: false, onFile })
    expect(onFile).not.toHaveBeenCalled()
    expect(fake.reads.some((path) => path.includes('/full/data') || path.includes('/chunks/'))).toBe(false)
    expect(result.manifest.tipo).toBe('solo-dati')
    expect(result.manifest.fotoIncluse).toBe(false)
    expect(result.dati.files.f1.esito).toBe('ok')
    expect(result.dati.fotoMancanti).toEqual([])
  })

  it('senza rete non legge e non scrive meta/codici-cani', async () => {
    seedBrief(fake)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await expect(raccogliBackup(NOW)).rejects.toMatchObject({
      name: 'AppError',
      code: 'backup_offline',
      message: 'Serve la connessione per creare il backup',
    })
    expect(fake.reads).toEqual([])
    expect(fake.writes).toEqual([])
    expect(fake.docs.has('salon/shared/meta/codici-cani')).toBe(false)
  })

  it.each([
    ['unavailable', { code: 'unavailable' }],
    ['deadline-exceeded', { code: 'deadline-exceeded' }],
    ['network-request-failed', { code: 'auth/network-request-failed' }],
  ])('la transazione che rifiuta con %s è backup_offline', async (_name, error) => {
    seedBrief(fake)
    fake.failTransaction = error
    await expect(raccogliBackup(NOW)).rejects.toMatchObject({ code: 'backup_offline' })
    expect(fake.docs.has('salon/shared/meta/codici-cani')).toBe(false)
  })

  it('una lettura che rifiuta con unavailable è backup_offline', async () => {
    seedBrief(fake)
    fake.failRead = { code: 'unavailable' }
    await expect(raccogliBackup(NOW)).rejects.toMatchObject({ code: 'backup_offline' })
  })

  it('un altro errore della transazione è storage_write', async () => {
    seedBrief(fake)
    fake.failTransaction = { code: 'permission-denied' }
    const error = await raccogliBackup(NOW).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ code: 'storage_write', message: 'Salvataggio non riuscito' })
  })

  it('senza salone il percorso lancia storage_write e non legge', async () => {
    clearSalon()
    await expect(raccogliBackup(NOW)).rejects.toMatchObject({ code: 'storage_write' })
    expect(fake.reads).toEqual([])
  })

  it('bindSalon uid-9 legge sotto salons/uid-9 e mai sotto salon/shared', async () => {
    bindSalon('uid-9')
    fake.docs.set('salons/uid-9/dogs/d1', {
      id: 'd1', name: 'Fido', species: 'cane', breed: '', contact: { name: '', phone: '' }, createdAt: 1, updatedAt: 1,
    })
    const result = await raccogliBackup(NOW)
    expect(Object.keys(result.dati.dogs)).toEqual(['d1'])
    expect(result.manifest.salone.id).toBe('uid-9')
    expect(fake.reads.length).toBeGreaterThan(0)
    expect(fake.reads.every((path) => path.replace(/^tx:/, '').startsWith('salons/uid-9/'))).toBe(true)
    expect(fake.writes).toEqual(['salons/uid-9/meta/codici-cani'])
  })

  it('la transazione rilegge meta/codici-cani e usa il documento cambiato nel frattempo', async () => {
    seedDog(fake, 'd1', { photo: undefined })
    fake.beforeTransaction = () => {
      fake.docs.set('salon/shared/meta/codici-cani', { next: 2, cartella: 'animali', byId: { altro: 'C0001' } })
    }
    const result = await raccogliBackup(NOW)
    expect(fake.reads).toContain('tx:salon/shared/meta/codici-cani')
    expect(result.dati.codiciCane).toEqual({ next: 3, cartella: 'animali', byId: { altro: 'C0001', d1: 'C0002' } })
    expect(fake.docs.get('salon/shared/meta/codici-cani')).toEqual(result.dati.codiciCane)
  })

  it('se la transazione trova già tutto non scrive', async () => {
    seedDog(fake, 'd1', { photo: undefined })
    fake.beforeTransaction = () => {
      fake.docs.set('salon/shared/meta/codici-cani', { next: 2, cartella: 'cani', byId: { d1: 'C0001' } })
    }
    const result = await raccogliBackup(NOW)
    expect(fake.writes).toEqual([])
    expect(result.dati.codiciCane.byId).toEqual({ d1: 'C0001' })
  })

  it('un file illeggibile va in fotoMancanti e onFile non lo riceve', async () => {
    seedBrief(fake)
    fake.docs.set('salon/shared/files/f1/full/data', { dati: new BrokenBytes() })
    const onFile = vi.fn()
    const result = await raccogliBackup(NOW, { onFile })
    expect(onFile).not.toHaveBeenCalled()
    expect(result.dati.fotoMancanti).toEqual([{ id: 'f1', motivo: 'illeggibile', byteSize: WEBP.length }])
    expect(result.dati.files.f1.esito).toBe('mancante')
    expect(result.manifest.conteggi.fotoMancanti).toBe(1)
    expect(result.manifest.conteggi.foto).toBe(0)
    expect(Object.keys(result.dati.dogs)).toEqual(['d1'])
  })

  it('documento binario assente, dimensione errata e chunk assente restano fotoMancanti ordinati per id', async () => {
    seedDog(fake, 'd1', { photo: undefined })
    seedFile(fake, 'z-size', new Uint8Array([1, 2, 3]), { byteSize: 9, owner: 'listino', kind: 'file', name: 'a.pdf', mime: 'application/pdf' })
    seedFile(fake, 'a-gone', new Uint8Array([1]))
    fake.docs.delete('salon/shared/files/a-gone/full/data')
    seedFile(fake, 'm-chunks', new Uint8Array([1]), { chunkCount: 2, byteSize: 4 })
    fake.docs.delete('salon/shared/files/m-chunks/full/data')
    fake.docs.set('salon/shared/files/m-chunks/chunks/0', { dati: new FakeBytes(new Uint8Array([1, 2])) })
    seedFile(fake, 'k-ok', new Uint8Array([7, 7]))
    const onFile = vi.fn()
    const result = await raccogliBackup(NOW, { onFile })
    expect(result.dati.fotoMancanti).toEqual([
      { id: 'a-gone', motivo: 'assente', byteSize: 1 },
      { id: 'm-chunks', motivo: 'chunk-assente', byteSize: 4 },
      { id: 'z-size', motivo: 'dimensione', byteSize: 9, lunghezza: 3 },
    ])
    expect(onFile).toHaveBeenCalledTimes(1)
    expect(result.dati.files['k-ok'].esito).toBe('ok')
    expect(result.dati.files['k-ok'].percorsoBackup).toBe('file-sciolti/k-ok.webp')
    expect(fake.reads).not.toContain('salon/shared/files/m-chunks/full/data')
  })

  it('con chunkCount maggiore di zero ricompone i pezzi in ordine e non legge full/data', async () => {
    seedDog(fake, 'd1', { photo: undefined })
    seedFile(fake, 'big', new Uint8Array(0), { chunkCount: 3, byteSize: 6, mime: 'application/pdf', kind: 'file', owner: 'listino', name: 'Listino' })
    fake.docs.delete('salon/shared/files/big/full/data')
    fake.docs.set('salon/shared/files/big/chunks/0', { dati: new FakeBytes(new Uint8Array([1, 2])) })
    fake.docs.set('salon/shared/files/big/chunks/1', { dati: new FakeBytes(new Uint8Array([3, 4])) })
    fake.docs.set('salon/shared/files/big/chunks/2', { dati: new FakeBytes(new Uint8Array([5, 6])) })
    fake.docs.set('salon/shared/settings/main', {
      priceList: { id: 'pl', fileName: 'Listino', dataUrl: 'file:big', include: { riepilogo: true, dettaglio: true, attivita: true, mancati: false } },
    })
    const got: number[][] = []
    const result = await raccogliBackup(NOW, { onFile: (_meta, bytes) => { got.push([...bytes]) } })
    expect(got).toEqual([[1, 2, 3, 4, 5, 6]])
    expect(result.dati.files.big.percorsoBackup).toBe('listino/file/Listino.pdf')
    expect(result.dati.files.big.estensione).toBe('.pdf')
    expect(fake.reads.some((path) => path.endsWith('big/full/data'))).toBe(false)
    expect(result.manifest.conteggi.fileListino).toBe(1)
  })

  it('onFile è seriale e le letture non superano tre', async () => {
    seedDog(fake, 'd1', { photo: undefined })
    for (let index = 0; index < 8; index += 1) seedFile(fake, `f${index}`, new Uint8Array([index]))
    let active = 0
    let overlap = false
    const order: string[] = []
    await raccogliBackup(NOW, {
      onFile: async (meta) => {
        active += 1
        if (active > 1) overlap = true
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
        order.push(meta.id)
        active -= 1
      },
    })
    expect(overlap).toBe(false)
    expect([...order].sort()).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'])
    expect(fake.maxInFlight).toBeLessThanOrEqual(3)
    expect(fake.maxInFlight).toBeGreaterThan(1)
  })

  it('un onFile che rifiuta fa fallire la raccolta con il suo errore', async () => {
    seedBrief(fake)
    await expect(raccogliBackup(NOW, { onFile: () => { throw new Error('disco pieno') } })).rejects.toThrow('disco pieno')
  })

  it('percorsi: duplicati con (2), galleria, logo, listino con (2) e sciolti', async () => {
    seedDog(fake, 'd1', {
      photo: undefined,
      gallery: [
        { id: 'g2', photo: 'file:fg2', takenAt: Date.parse('2026-01-02T00:00:00.000Z') },
        { id: 'g1', photo: 'file:fg1', takenAt: Date.parse('2026-01-01T00:00:00.000Z') },
      ],
    })
    const visit = (id: string, start: number, photos: Data[], services = [{ serviceId: 's', name: 'Bagno + taglio', durationMin: 30, price: 10 }]) => {
      fake.docs.set(`salon/shared/appointments/${id}`, {
        id, dogId: 'd1', start, services, photos, status: 'programmato', createdAt: 1, updatedAt: 1,
      })
    }
    visit('a2', START, [{ id: 'x1', photo: 'file:fa2', kind: 'dopo' }])
    visit('a1', START, [{ id: 'x2', photo: 'file:fa1b', kind: 'altro' }, { id: 'x1', photo: 'file:fa1', kind: 'altro' }])
    visit('a0', START - 2 * 86_400_000, [])
    visit('a3', START + 60_000, [{ id: 'x1', photo: 'file:fa3', kind: 'prima' }], [])
    for (const id of ['fg1', 'fg2', 'fa1', 'fa1b', 'fa2', 'fa3', 'logo', 'lp1', 'lp2', 'orph']) seedFile(fake, id, new Uint8Array([1]))
    fake.docs.set('salon/shared/files/lp1', { ...fake.docs.get('salon/shared/files/lp1'), mime: 'application/pdf', kind: 'file', owner: 'listino' })
    fake.docs.set('salon/shared/files/lp2', { ...fake.docs.get('salon/shared/files/lp2'), mime: 'application/pdf', kind: 'file', owner: 'listino' })
    fake.docs.set('salon/shared/settings/main', {
      priceList: { id: 'p1', fileName: 'Listino: 2026', dataUrl: 'file:lp1', include: { riepilogo: true, dettaglio: true, attivita: true, mancati: false } },
      priceListHistory: [{ id: 'p2', fileName: 'Listino: 2026', dataUrl: 'file:lp2', include: { riepilogo: true, dettaglio: true, attivita: true, mancati: false } }],
      priceSheet: { intestazione: { logo: 'file:logo' } },
    })
    const { dati } = await raccogliBackup(NOW)
    const base = 'cani/C0001 - Fido - Barboncino (Ada)'
    expect(dati.files.fg1.percorsoBackup).toBe(`${base}/altre foto/foto-01.webp`)
    expect(dati.files.fg2.percorsoBackup).toBe(`${base}/altre foto/foto-02.webp`)
    expect(dati.files.fa1.percorsoBackup).toBe(`${base}/2026-10-22 - Bagno e taglio/altro-01.webp`)
    expect(dati.files.fa1b.percorsoBackup).toBe(`${base}/2026-10-22 - Bagno e taglio/altro-02.webp`)
    expect(dati.files.fa2.percorsoBackup).toBe(`${base}/2026-10-22 - Bagno e taglio (2)/dopo-01.webp`)
    expect(dati.files.fa3.percorsoBackup).toBe(`${base}/2026-10-22 - visita/prima-01.webp`)
    expect(dati.files.logo.percorsoBackup).toBe('listino/logo.webp')
    expect(dati.files.lp1.percorsoBackup).toBe('listino/file/Listino 2026.pdf')
    expect(dati.files.lp2.percorsoBackup).toBe('listino/file/Listino 2026 (2).pdf')
    expect(dati.files.orph.percorsoBackup).toBe('file-sciolti/orph.webp')
  })

  it('un cane senza padrone né razza e un gatto danno cartella animali', async () => {
    seedDog(fake, 'd1', { photo: 'file:f1', breed: '', contact: { name: '', phone: '' } })
    seedDog(fake, 'd2', { species: 'gatto', photo: undefined, createdAt: 2 })
    seedFile(fake, 'f1', WEBP)
    const { dati } = await raccogliBackup(NOW)
    expect(dati.codiciCane.cartella).toBe('animali')
    expect(dati.codiciCane.byId).toEqual({ d1: 'C0001', d2: 'C0002' })
    expect(dati.files.f1.percorsoBackup).toBe('animali/C0001 - Fido/profilo.webp')
  })

  it('il giorno dell\'appuntamento resta Europe/Rome anche vicino alla mezzanotte', async () => {
    seedDog(fake, 'd1', { photo: undefined })
    fake.docs.set('salon/shared/appointments/a1', {
      id: 'a1', dogId: 'd1', start: Date.parse('2026-10-22T22:30:00.000Z'), services: [], status: 'programmato',
      photos: [{ id: 'p', photo: 'file:f1', kind: 'prima' }], createdAt: 1, updatedAt: 1,
    })
    seedFile(fake, 'f1', WEBP)
    const { dati } = await raccogliBackup(NOW)
    expect(dati.files.f1.percorsoBackup).toContain('/2026-10-23 - visita/')
  })

  it('gli impegni personali restano con le date ISO e gli appuntamenti non validi si saltano', async () => {
    seedDog(fake, 'd1', { photo: undefined })
    fake.docs.set('salon/shared/appointments/p1', {
      id: 'p1', kind: 'personale', title: 'Dentista', start: START, plannedEnd: START + 3_600_000, createdAt: 1, updatedAt: 2,
    })
    fake.docs.set('salon/shared/appointments/p2', { id: 'p2', kind: 'personale', title: '', start: START, createdAt: 1, updatedAt: 1 })
    const { dati } = await raccogliBackup(NOW)
    expect(Object.keys(dati.appointments)).toEqual(['p1'])
    expect(dati.appointments.p1).toEqual({
      id: 'p1',
      kind: 'personale',
      title: 'Dentista',
      start: '2026-10-22T21:30:00.000Z',
      createdAt: '1970-01-01T00:00:00.001Z',
      updatedAt: '1970-01-01T00:00:00.002Z',
      plannedEnd: '2026-10-22T22:30:00.000Z',
    })
  })

  it('senza dati non scrive e restituisce mappe vuote', async () => {
    const result = await raccogliBackup(NOW)
    expect(fake.writes).toEqual([])
    expect(result.dati.dogs).toEqual({})
    expect(result.dati.closures).toEqual({})
    expect(result.dati.deletedDogs).toEqual({ ids: [], appointmentIds: [] })
    expect(result.dati.codiciCane).toEqual({ next: 1, cartella: 'cani', byId: {} })
  })

  it('le chiusure valide entrano nel JSON', async () => {
    fake.docs.set('salon/shared/closures/c1', { reason: 'Ferie', startDay: '2026-08-10', endDay: '2026-08-20', createdAt: 5, updatedAt: 6 })
    fake.docs.set('salon/shared/closures/c2', { reason: '', startDay: 'x', endDay: 'y', createdAt: 5, updatedAt: 6 })
    const { dati } = await raccogliBackup(NOW)
    expect(Object.keys(dati.closures)).toEqual(['c1'])
  })
})
