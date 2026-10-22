import { describe, expect, it } from 'vitest'
import { readRestoreBundle } from './backupDoc'
import {
  cartellaCane,
  contaClienti,
  canonicalJson,
  giornoAppuntamento,
  scegliPercorsi,
  settingsSenzaBackup,
  sha256Hex,
  buildManifest,
  type GroomlyDati,
} from './backupBundle'

describe('percorsi', () => {
  it('un file che è profilo e foto di appuntamento si scrive una volta, nella cartella della visita', () => {
    const chosen = scegliPercorsi([
      { fileId: 'f1', ruolo: 'profilo', path: 'cani/C0001 - Fido/profilo.webp', ordine: 'profilo' },
      { fileId: 'f1', ruolo: 'appuntamento', path: 'cani/C0001 - Fido/2026-10-22 - Bagno/prima-01.webp', ordine: '2026-10-22T21:30:00.000Z' },
    ])
    expect(chosen.get('f1')).toEqual({
      percorsoBackup: 'cani/C0001 - Fido/2026-10-22 - Bagno/prima-01.webp',
      altriRiferimenti: ['cani/C0001 - Fido/profilo.webp'],
    })
  })

  it('le 23:30 italiane restano nel giorno di Roma', () => {
    expect(giornoAppuntamento(new Date('2026-10-22T21:30:00.000Z'))).toBe('2026-10-22')
    expect(cartellaCane('C0001', { name: 'Fido', breed: 'Barboncino', contact: { name: 'Rossi Mario' } })).toBe('C0001 - Fido - Barboncino (Rossi Mario)')
  })
})

describe('json', () => {
  it('è un superinsieme leggibile dal ripristino attuale, senza settings.backup', () => {
    const settings = settingsSenzaBackup({
      business: { salonName: 'Pelosetti', name: 'Laura' },
      backup: { lastAt: '2026-10-19T18:50:25.964Z', autoDaily: true },
    })
    expect(settings.backup).toBeUndefined()
    const dati: GroomlyDati = {
      versioneFormato: 1,
      dogs: { d1: { id: 'd1', name: 'Fido', photo: 'file:f1', contact: { name: 'Ada', phone: '333 111' }, contacts: [] } },
      appointments: {},
      services: {},
      settings,
      closures: {},
      files: {},
      deletedDogs: { ids: ['d1'], appointmentIds: [] },
      codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
      fotoMancanti: [],
    }
    const json = canonicalJson(dati)
    expect(readRestoreBundle(JSON.parse(json))).not.toBeNull()
    expect(json).not.toContain('autoDaily')
    expect(json).toContain('"photo":"file:f1"')
    return sha256Hex(json).then((sum) => {
      expect(sum).toMatch(/^[0-9a-f]{64}$/)
      const manifest = buildManifest(dati, { now: new Date('2026-10-22T21:30:00.000Z'), salonId: 'shared', checksum: sum, includiByte: true })
      expect(manifest.creatoIl).toBe('2026-10-22T23:30:00+02:00')
      expect(manifest.checksum['groomly-dati.json']).toBe(sum)
      expect(contaClienti(dati.dogs)).toBe(1)
    })
  })
})
