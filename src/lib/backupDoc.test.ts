// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JSZip from 'jszip'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import {
  backupCounts,
  backupStatusLabel,
  buildBackup,
  buildExportZip,
  collectPhotoFiles,
  maybeDailyBackup,
  restoreBackup,
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
      services: null,
      settings: null,
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
    expect(readJson(storageKeys.dogs('uid-1'))).toEqual({ a: { name: 'Bobi' } })
    expect(readJson(storageKeys.appointments('uid-1'))).toEqual({ b: { dogId: 'a' } })
    expect(readJson(storageKeys.services('uid-1'))).toEqual({ s: { name: 'Bagno' } })
    expect(readJson(storageKeys.settings('uid-1'))).toEqual({ theme: 'dark' })
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
