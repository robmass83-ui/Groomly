import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { buildManifest, canonicalJson, sha256Hex, type BackupManifest, type GroomlyDati } from './backupBundle'
import { readRestoreBundle } from './backupDoc'
import { impostazioniRipristino, leggiRipristino } from './leggiRipristino'

const NOW = new Date('2026-10-22T12:00:00.000Z')
const FILE = 'File non valido'
const FOTO = 'Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.'
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

  it('il completo valido parla delle foto e quello col checksum rotto è un file non valido', async () => {
    const json = canonicalJson(dati())
    expect(await leggiRipristino(await zipDi(json, undefined, true))).toEqual({ esito: 'rifiutato', messaggio: FOTO })
    const guasto = dati()
    guasto.dogs = [] as unknown as GroomlyDati['dogs']
    expect(await leggiRipristino(await zipDi(canonicalJson(guasto), (manifest) => { manifest.tipo = 'completo'; manifest.fotoIncluse = true }))).toEqual({ esito: 'rifiutato', messaggio: FILE })
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
