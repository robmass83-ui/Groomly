// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JSZip from 'jszip'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import {
  backupCounts,
  backupStatusLabel,
  buildBackup,
  dailyBackupDue,
  isEmptyBackup,
  buildExportZip,
  collectPhotoFiles,
  maybeDailyBackup,
  readRestoreBundle,
  restoreBackup,
  triggerDownload,
  type BackupBundle,
} from './backupDoc'

const HOUR = 60 * 60 * 1000

describe('backupDoc', () => {
  beforeEach(() => localStorage.clear())

  it('conta le chiavi delle mappe e zero se il pezzo non è un oggetto', () => {
    expect(backupCounts({
      dogs: { a: {}, b: {} },
      appointments: {},
      services: { s: {} },
      settings: {},
    })).toEqual({ dogs: 2, appointments: 0, services: 1 })
    expect(backupCounts({
      dogs: null,
      appointments: [],
      services: 'x',
      settings: 4,
    })).toEqual({ dogs: 0, appointments: 0, services: 0 })
  })

  it('buildBackup legge le quattro chiavi', () => {
    writeJson(storageKeys.dogs('uid-1'), { a: { name: 'Bobi' } })
    writeJson(storageKeys.appointments('uid-1'), {})
    expect(buildBackup('uid-1')).toEqual({
      dogs: { a: { name: 'Bobi' } },
      appointments: {},
      services: {},
      settings: {},
    })
  })

  it('un bundle vuoto non è un backup da caricare, uno con dati sì', () => {
    const empty = { dogs: {}, appointments: {}, services: {}, settings: {} }
    expect(isEmptyBackup(empty)).toBe(true)
    expect(isEmptyBackup({ ...empty, dogs: { d1: { name: 'Bobi' } } })).toBe(false)
    expect(isEmptyBackup({ ...empty, settings: { theme: 'dark' } })).toBe(false)
  })

  it('il giornaliero cloud dipende da autoDaily e lastAt, non da una chiave locale', () => {
    const now = new Date('2026-10-09T12:00:00.000Z')
    expect(dailyBackupDue(undefined, now)).toBe(false)
    expect(dailyBackupDue({ autoDaily: false }, now)).toBe(false)
    expect(dailyBackupDue({ autoDaily: true }, now)).toBe(true)
    expect(dailyBackupDue({ autoDaily: true, lastAt: new Date(now.getTime() - 23 * HOUR).toISOString() }, now)).toBe(false)
    expect(dailyBackupDue({ autoDaily: true, lastAt: new Date(now.getTime() - 24 * HOUR).toISOString() }, now)).toBe(false)
    expect(dailyBackupDue({ autoDaily: true, lastAt: new Date(now.getTime() - 24 * HOUR - 1).toISOString() }, now)).toBe(true)
    expect(localStorage.length).toBe(0)
  })

  it('buildBackup su un account senza chiave cani restituisce dogs: {} e il bundle passa readRestoreBundle', () => {
    expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toBeNull()
    const bundle = buildBackup('uid-1')
    expect(bundle.dogs).toEqual({})
    expect(readRestoreBundle(bundle)).toEqual({
      dogs: {},
      appointments: {},
      services: {},
      settings: {},
    })
  })

  it('restoreBackup scrive le quattro chiavi e non tocca sessione né auth', () => {
    localStorage.setItem('groomly.session', 'uid-1')
    localStorage.setItem('groomly.auth', '{"email":"maria@salone.it"}')
    localStorage.setItem(storageKeys.dogs('uid-1'), '{"old":true}')
    restoreBackup('uid-1', {
      dogs: { a: { name: 'Bobi' } },
      appointments: { b: { dogId: 'a' } },
      services: { s: { name: 'Bagno' } },
      settings: { theme: 'dark' },
    })
    expect(localStorage.getItem('groomly.session')).toBe('uid-1')
    expect(localStorage.getItem('groomly.auth')).toBe('{"email":"maria@salone.it"}')
    expect(readJson(storageKeys.dogs('uid-1'))).toEqual({ a: { name: 'Bobi', searchKey: 'bobi' } })
    expect(readJson(storageKeys.appointments('uid-1'))).toEqual({ b: { dogId: 'a' } })
    expect(readJson(storageKeys.services('uid-1'))).toEqual({ s: { name: 'Bagno' } })
    expect(readJson(storageKeys.settings('uid-1'))).toEqual({ theme: 'dark' })
  })

  it('un bundle senza settings non cancella groomly.session e non sostituisce i cani', () => {
    localStorage.setItem('groomly.session', 'uid-1')
    localStorage.setItem(storageKeys.dogs('uid-1'), '{"old":true}')
    const dogs = localStorage.getItem(storageKeys.dogs('uid-1'))
    const bundles: unknown[] = [
      { dogs: { a: { name: 'Bobi' } }, appointments: {}, services: {} },
      { dogs: { a: { name: 'Bobi' } }, appointments: {}, services: {}, settings: null },
      {},
    ]
    for (const bundle of bundles) {
      expect(() => restoreBackup('uid-1', bundle as BackupBundle)).toThrow('Salvataggio non riuscito')
      expect(localStorage.getItem('groomly.session')).toBe('uid-1')
      expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toBe(dogs)
    }
  })

  it('un backup vecchio passa dalla migrazione', () => {
    restoreBackup('uid-1', {
      dogs: {
        ercole: {
          id: 'ercole',
          name: 'Àrtù',
          breed: 'Terranova',
          ageCategory: 'adulto',
          isSenior: true,
          clientType: 'mensile',
          contact: { name: 'Maria Usai', phone: '+39 345 2424242' },
          searchKey: 'scritta a mano',
        },
      },
      appointments: { a1: { id: 'a1', status: 'annullato' } },
      services: {},
      settings: {},
    })
    const dogs = readJson<Record<string, { ageCategory: string; recurrenceWeeks: number; searchKey: string }>>(storageKeys.dogs('uid-1'))
    expect(dogs?.ercole.ageCategory).toBe('anziano')
    expect(dogs?.ercole.recurrenceWeeks).toBe(4)
    expect(dogs?.ercole.searchKey).toContain('artu')
    expect(dogs?.ercole.searchKey).toContain('3452424242')
    expect(dogs?.ercole.searchKey).not.toContain('+39')
    const appointments = readJson<Record<string, { status: string }>>(storageKeys.appointments('uid-1'))
    expect(appointments?.a1.status).toBe('programmato')
  })

  it('un oggetto vuoto per una collezione svuota solo quella collezione', () => {
    localStorage.setItem(storageKeys.dogs('uid-1'), '{"old":true}')
    localStorage.setItem(storageKeys.appointments('uid-1'), '{"keep":true}')
    restoreBackup('uid-1', { dogs: {}, appointments: {}, services: {}, settings: {} })
    expect(readJson(storageKeys.dogs('uid-1'))).toEqual({})
    expect(readJson(storageKeys.appointments('uid-1'))).toEqual({})
    expect(readJson(storageKeys.services('uid-1'))).toEqual({})
    expect(readJson(storageKeys.settings('uid-1'))).toEqual({})
  })

  it('appende l’ancora al documento e revoca l’url dopo il click', () => {
    vi.useFakeTimers()
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    let connected = false
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
      connected = document.body.contains(this)
    })
    triggerDownload('groomly-backup.json', new Blob(['{}'], { type: 'application/json' }))
    expect(connected).toBe(true)
    expect(document.body.querySelector('a')).toBeNull()
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(999)
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(revoke).toHaveBeenCalledTimes(1)
    click.mockRestore()
    revoke.mockRestore()
    vi.useRealTimers()
  })

  it('dice Mai eseguito, Oggi con l’ora, o la data breve', () => {
    const today = new Date(2026, 9, 9, 18, 0, 0, 0)
    expect(backupStatusLabel(undefined, today)).toBe('Mai eseguito')
    expect(backupStatusLabel(new Date(2026, 9, 9, 7, 5, 0, 0).toISOString(), today)).toBe('Oggi 07:05 · completato')
    expect(backupStatusLabel(new Date(2026, 8, 3, 7, 0, 0, 0).toISOString(), today)).toBe('3 set 2026')
  })

  it('all’avvio con il giornaliero acceso riscrive lastAt e snapshot dentro le impostazioni', () => {
    const now = new Date('2026-10-09T12:00:00.000Z')
    const download = vi.spyOn(URL, 'createObjectURL')
    writeJson(storageKeys.settings('uid-1'), {
      theme: 'dark',
      backup: { autoDaily: true, snapshot: { marker: 'vecchio' } },
    })
    writeJson(storageKeys.dogs('uid-1'), { d1: { name: 'Bobi' } })
    maybeDailyBackup('uid-1', now)
    expect(download).not.toHaveBeenCalled()
    expect(localStorage.getItem('groomly.users.uid-1.backup')).toBeNull()
    const stored = readJson<{ backup: { lastAt: string; autoDaily: boolean; snapshot: BackupBundle } }>(storageKeys.settings('uid-1'))
    expect(stored?.backup.autoDaily).toBe(true)
    expect(stored?.backup.lastAt).toBe(now.toISOString())
    expect(stored?.backup.snapshot.dogs).toEqual({ d1: { name: 'Bobi' } })
    const copied = stored?.backup.snapshot.settings as { backup?: { snapshot?: unknown } }
    expect(copied.backup?.snapshot).toBeUndefined()
    expect(localStorage.getItem(storageKeys.settings('uid-1'))).toContain('"theme":"dark"')
    download.mockRestore()
  })

  it('non riscrive se il giornaliero è spento o lastAt ha al massimo 24 ore', () => {
    const now = new Date('2026-10-09T12:00:00.000Z')
    writeJson(storageKeys.settings('uid-1'), { backup: { autoDaily: false } })
    const before = localStorage.getItem(storageKeys.settings('uid-1'))
    maybeDailyBackup('uid-1', now)
    expect(localStorage.getItem(storageKeys.settings('uid-1'))).toBe(before)

    const recent = new Date(now.getTime() - 23 * HOUR).toISOString()
    writeJson(storageKeys.settings('uid-1'), { backup: { autoDaily: true, lastAt: recent } })
    maybeDailyBackup('uid-1', now)
    expect(readJson<{ backup: { lastAt: string; snapshot?: unknown } }>(storageKeys.settings('uid-1'))?.backup).toEqual({
      autoDaily: true,
      lastAt: recent,
    })

    const exact = new Date(now.getTime() - 24 * HOUR).toISOString()
    writeJson(storageKeys.settings('uid-1'), { backup: { autoDaily: true, lastAt: exact } })
    maybeDailyBackup('uid-1', now)
    expect(readJson<{ backup: { lastAt: string } }>(storageKeys.settings('uid-1'))?.backup.lastAt).toBe(exact)

    const stale = new Date(now.getTime() - 24 * HOUR - 1).toISOString()
    writeJson(storageKeys.settings('uid-1'), { backup: { autoDaily: true, lastAt: stale } })
    maybeDailyBackup('uid-1', now)
    expect(readJson<{ backup: { lastAt: string } }>(storageKeys.settings('uid-1'))?.backup.lastAt).toBe(now.toISOString())
  })

  it('raccoglie le foto dataUrl di profilo, galleria, lavoro e listino', () => {
    const photos = collectPhotoFiles({
      dogs: {
        d1: {
          id: 'd1',
          photo: 'data:image/jpeg;base64,YQ==',
          gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,Yg==' }, { id: 'skip', photo: 'https://foto' }],
        },
      },
      appointments: {
        a1: { photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Yw==' }] },
      },
      services: {},
      settings: {
        priceList: { id: 'list', dataUrl: 'data:image/jpeg;base64,ZA==' },
        priceListHistory: [{ id: 'old', dataUrl: 'data:image/jpeg;base64,ZQ==' }],
      },
    })
    expect(photos.map((photo) => photo.id)).toEqual(['d1', 'g1', 'p1', 'list', 'old'])
  })

  it('buildExportZip contiene backup.json e foto/{id}.jpg', async () => {
    const blob = await buildExportZip({
      dogs: { d1: { id: 'd1', photo: 'data:image/jpeg;base64,YQ==' } },
      appointments: {},
      services: {},
      settings: {},
    })
    const zip = await JSZip.loadAsync(blob)
    const names = Object.values(zip.files).filter((file) => !file.dir).map((file) => file.name).sort()
    expect(names).toEqual(['backup.json', 'foto/d1.jpg'])
    const json = JSON.parse(await zip.file('backup.json')!.async('string')) as BackupBundle
    expect(json.dogs).toEqual({ d1: { id: 'd1', photo: 'data:image/jpeg;base64,YQ==' } })
    expect(Array.from(await zip.file('foto/d1.jpg')!.async('uint8array'))).toEqual([97])
  })
})
