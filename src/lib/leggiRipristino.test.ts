import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { buildManifest, canonicalJson, sha256Hex, type BackupFileMeta, type BackupManifest, type GroomlyDati } from './backupBundle'
import { FILE_MAX_BYTES } from './fileBytes'
import { readRestoreBundle } from './backupDoc'
import { impostazioniRipristino, leggiRipristino } from './leggiRipristino'

const NOW = new Date('2026-10-22T12:00:00.000Z')
const FILE = 'File non valido'
const INTERNO = 'Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.'

function dati(): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: { a: {}, b: {} },
    appointments: { p: {} },
    services: { s: {} },
    settings: { business: { salonName: 'Pelosetti' }, backup: { autoDaily: true, lastAt: '1999-01-01T00:00:00.000Z' } },
    closures: {},
    files: {},
    deletedDogs: { ids: ['x'], appointmentIds: [] },
    codiciCane: { next: 3, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } },
    fotoMancanti: [],
  }
}

async function zipDi(json: string, modifica?: (manifest: BackupManifest) => void, includiByte = false): Promise<Uint8Array> {
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(dati(), { now: NOW, salonId: 'salon', checksum, includiByte })
  modifica?.(manifest)
  const zip = new JSZip()
  zip.file('LEGGIMI.txt', 'ciao\n')
  zip.file('dati/manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('dati/groomly-dati.json', json)
  return zip.generateAsync({ type: 'uint8array' })
}

function metaOk(over: Partial<BackupFileMeta> = {}): BackupFileMeta {
  return {
    id: 'f1',
    kind: 'foto',
    owner: 'dog:a',
    name: '',
    mime: 'image/webp',
    byteSize: 3,
    chunkCount: 0,
    createdAt: '2026-10-22T12:00:00.000Z',
    createdBy: 'u1',
    estensione: '.webp',
    percorsoBackup: 'cani/C0001 - Fido/profilo.webp',
    esito: 'ok',
    ...over,
  }
}

async function zipCompleto(files: GroomlyDati['files'], voci: Record<string, Uint8Array> = {}): Promise<Uint8Array> {
  const base = dati()
  base.files = files
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: NOW, salonId: 'salon', checksum, includiByte: true })
  const zip = new JSZip()
  zip.file('LEGGIMI.txt', 'ciao\n')
  zip.file('dati/manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('dati/groomly-dati.json', json)
  for (const [path, bytes] of Object.entries(voci)) zip.file(path, bytes)
  return zip.generateAsync({ type: 'uint8array' })
}

describe('leggiRipristino', () => {
  it('legge lo ZIP solo dati e ignora le altre voci', async () => {
    const json = canonicalJson(dati())
    const esito = await leggiRipristino(await zipDi(json))
    expect(esito.esito).toBe('solo-dati')
    if (esito.esito !== 'solo-dati') return
    expect(Object.keys(esito.bundle).sort()).toEqual(['appointments', 'closures', 'dogs', 'services', 'settings'])
    expect(Object.keys(esito.bundle.dogs as Record<string, unknown>)).toEqual(['a', 'b'])
    expect(esito.codici).toEqual({ next: 3, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } })
  })

  it('non riporta i cani cancellati né le loro visite rimaste nel backup', async () => {
    const base = dati()
    base.dogs = { a: {}, x: {} }
    base.appointments = { p: { dogId: 'a' }, q: { dogId: 'x' }, r: { dogId: 'a' }, s: { dogId: '', kind: 'personale' } }
    base.deletedDogs = { ids: ['x'], appointmentIds: ['r'] }
    const json = canonicalJson(base)
    const checksum = await sha256Hex(json)
    const manifest = buildManifest(base, { now: NOW, salonId: 'salon', checksum, includiByte: false })
    const zip = new JSZip()
    zip.file('dati/manifest.json', JSON.stringify(manifest, null, 2))
    zip.file('dati/groomly-dati.json', json)
    const esito = await leggiRipristino(await zip.generateAsync({ type: 'uint8array' }))
    expect(esito.esito).toBe('solo-dati')
    if (esito.esito !== 'solo-dati') return
    expect(Object.keys(esito.bundle.dogs as Record<string, unknown>)).toEqual(['a'])
    expect(Object.keys(esito.bundle.appointments as Record<string, unknown>).sort()).toEqual(['p', 's'])
  })

  it('rifiuta checksum, formato, versione, tipo e codici', async () => {
    const json = canonicalJson(dati())
    const checksum = await sha256Hex(json)
    const spaced = await zipDi(`${json} `, (manifest) => { manifest.checksum['groomly-dati.json'] = checksum })
    expect(await leggiRipristino(spaced)).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const casi: Array<Uint8Array> = [
      await zipDi(json, (manifest) => { manifest.formato = 'altro' as 'groomly-backup' }),
      await zipDi(json, (manifest) => { manifest.versioneFormato = 2 as 1 }),
      await zipDi(json, (manifest) => { manifest.tipo = 'altro' as 'solo-dati' }),
      await zipDi(json, (manifest) => { delete (manifest.checksum as { 'groomly-dati.json'?: string })['groomly-dati.json'] }),
    ]
    for (const bytes of casi) {
      const esito = await leggiRipristino(bytes)
      expect(esito).toEqual({ esito: 'rifiutato', messaggio: FILE })
    }
    const rotto = dati()
    rotto.versioneFormato = 2 as 1
    const testoRotto = canonicalJson(rotto)
    expect(await leggiRipristino(await zipDi(testoRotto))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const chiusure = dati()
    chiusure.closures = [] as unknown as GroomlyDati['closures']
    expect(await leggiRipristino(await zipDi(canonicalJson(chiusure)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const next = dati()
    next.codiciCane = { next: 1.5, cartella: 'cani', byId: {} }
    expect(await leggiRipristino(await zipDi(canonicalJson(next)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const cartella = dati()
    cartella.codiciCane = { next: 1, cartella: 'gatti' as 'cani', byId: {} }
    expect(await leggiRipristino(await zipDi(canonicalJson(cartella)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const lista = dati()
    lista.codiciCane = { next: 1, cartella: 'cani', byId: [] as unknown as Record<string, string> }
    expect(await leggiRipristino(await zipDi(canonicalJson(lista)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const vuoto = dati()
    vuoto.codiciCane = { next: 1, cartella: 'cani', byId: { a: '' } }
    expect(await leggiRipristino(await zipDi(canonicalJson(vuoto)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const zip = new JSZip()
    zip.file('dati/groomly-dati.json', json)
    expect(await leggiRipristino(await zip.generateAsync({ type: 'uint8array' }))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    expect(await leggiRipristino(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toEqual({ esito: 'rifiutato', messaggio: FILE })
  })

  it('legge il WebP dello ZIP completo e non lo mette nel bundle', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const esito = await leggiRipristino(await zipCompleto(
      { f1: metaOk(), assente: metaOk({ id: 'assente', esito: 'mancante', percorsoBackup: 'manca.webp', byteSize: 1 }) },
      { 'cani/C0001 - Fido/profilo.webp': bytes },
    ))
    expect(esito.esito).toBe('completo')
    if (esito.esito !== 'completo') return
    expect(Object.keys(esito.bundle).sort()).toEqual(['appointments', 'closures', 'dogs', 'services', 'settings'])
    expect(esito.codici).toEqual({ next: 3, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } })
    expect(esito.file).toEqual([{
      id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 3,
      createdAt: Date.parse('2026-10-22T12:00:00.000Z'), createdBy: 'u1', bytes,
    }])
  })

  it('ignora w non finito e copia h finito nello ZIP completo', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const esito = await leggiRipristino(await zipCompleto(
      { f1: metaOk({ w: null as unknown as number, h: 8 }) },
      { 'cani/C0001 - Fido/profilo.webp': bytes },
    ))
    expect(esito.esito).toBe('completo')
    if (esito.esito !== 'completo') return
    expect('w' in esito.file[0]).toBe(false)
    expect(esito.file[0]).toEqual({
      id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 3,
      createdAt: Date.parse('2026-10-22T12:00:00.000Z'), createdBy: 'u1', bytes, h: 8,
    })
  })

  it('rifiuta percorso, lunghezza, esito, id e i limiti prima di accettare il completo', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const path = 'cani/C0001 - Fido/profilo.webp'
    const casi = [
      await zipCompleto({ f1: metaOk({ percorsoBackup: '../segreto.webp' }) }, { '../segreto.webp': bytes }),
      await zipCompleto({ f1: metaOk() }, { [path]: new Uint8Array([1, 2]) }),
      await zipCompleto({ f1: metaOk({ esito: undefined as unknown as 'ok' }) }, { [path]: bytes }),
      await zipCompleto({ 'a/b': metaOk({ id: 'a/b' }) }),
      await zipCompleto({ f1: metaOk({ mime: 'application/pdf' }) }, { [path]: bytes }),
      await zipCompleto({
        f1: metaOk(),
        f2: metaOk({ id: 'f2', percorsoBackup: path }),
      }, { [path]: bytes }),
      await zipCompleto({ f1: metaOk() }),
    ]
    for (const archivio of casi) {
      expect(await leggiRipristino(archivio)).toEqual({ esito: 'rifiutato', messaggio: FILE })
    }
    const tanti: GroomlyDati['files'] = {}
    const voci201: Record<string, Uint8Array> = {}
    for (let index = 0; index < 201; index += 1) {
      const id = `f${index}`
      const percorso = `file-sciolti/${id}.webp`
      tanti[id] = metaOk({ id, percorsoBackup: percorso, byteSize: 0 })
      voci201[percorso] = new Uint8Array(0)
    }
    expect(await leggiRipristino(await zipCompleto(tanti, voci201))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const pesanti: GroomlyDati['files'] = {}
    for (let index = 0; index < 9; index += 1) {
      const id = `p${index}`
      pesanti[id] = metaOk({ id, percorsoBackup: `file-sciolti/${id}.webp`, byteSize: FILE_MAX_BYTES })
    }
    expect(await leggiRipristino(await zipCompleto(pesanti))).toEqual({ esito: 'rifiutato', messaggio: FILE })
  })

  it('uno ZIP completo senza file ok è valido e uno solo dati non legge le foto', async () => {
    const vuoto = await leggiRipristino(await zipCompleto({}))
    expect(vuoto.esito).toBe('completo')
    if (vuoto.esito !== 'completo') return
    expect(vuoto.file).toEqual([])
    const conMeta = dati()
    conMeta.files = { f1: metaOk() }
    const solo = await leggiRipristino(await zipDi(canonicalJson(conMeta), undefined, false))
    expect(solo.esito).toBe('solo-dati')
  })

  it('il JSON interno non passa dal backup vecchio', async () => {
    const json = JSON.stringify({ versioneFormato: 1, dogs: { a: {} }, appointments: {}, services: {}, settings: {} })
    const esito = await leggiRipristino(new TextEncoder().encode(json))
    expect(esito).toEqual({ esito: 'rifiutato', messaggio: INTERNO })
  })

  it('il JSON di Esporta resta il bundle di oggi', async () => {
    const vecchio = { dogs: { a: {} }, appointments: {}, services: { s: {} }, settings: { business: { salonName: 'Pelosetti' } } }
    const esito = await leggiRipristino(new TextEncoder().encode(JSON.stringify(vecchio)))
    expect(esito.esito).toBe('vecchio')
    if (esito.esito !== 'vecchio') return
    expect(esito.bundle).toEqual(readRestoreBundle(vecchio))
    const rotto = new TextEncoder().encode('{')
    expect(await leggiRipristino(rotto)).toEqual({ esito: 'rifiutato', messaggio: FILE })
  })
})

describe('impostazioniRipristino', () => {
  it('tiene il salone del file e il backup del telefono', () => {
    const risultato = impostazioniRipristino(
      { business: { salonName: 'Dal file' }, tagSuggestions: ['ipo'], backup: { autoDaily: true, lastAt: '1999-01-01T00:00:00.000Z' }, passwordHash: 'dal-file' },
      { backup: { autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z', snapshot: { dogs: { a: {} } } }, passwordHash: 'dal-telefono' },
    )
    expect(risultato.business).toEqual({ salonName: 'Dal file' })
    expect(risultato.tagSuggestions).toEqual(['ipo'])
    expect(risultato.backup).toEqual({ autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z', snapshot: { dogs: { a: {} } } })
    expect(risultato.passwordHash).toBe('dal-telefono')
  })

  it('senza i blocchi del telefono non li prende dal file', () => {
    const risultato = impostazioniRipristino(
      { business: { salonName: 'Dal file' }, backup: { lastAt: '1999-01-01T00:00:00.000Z' }, passwordHash: 'dal-file' },
      {},
    )
    expect(risultato.business).toEqual({ salonName: 'Dal file' })
    expect('backup' in risultato).toBe(false)
    expect('passwordHash' in risultato).toBe(false)
  })
})
