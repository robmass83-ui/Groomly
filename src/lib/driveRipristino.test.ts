import { Directory, Filesystem } from '@capacitor/filesystem'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DriveAuth } from './driveAuth'

const { elenco, scarica, readFile, deleteFile } = vi.hoisted(() => ({
  elenco: vi.fn(),
  scarica: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn(async () => undefined),
}))

vi.mock('./driveAuth', () => ({
  DriveAuth: { elenco, scarica },
}))

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { readFile, deleteFile },
}))

describe('ripristino da Drive', () => {
  beforeEach(() => {
    elenco.mockReset()
    scarica.mockReset()
    readFile.mockReset()
    deleteFile.mockReset()
    deleteFile.mockResolvedValue(undefined)
  })

  it('la cartella usa lo stesso nome dell’invio', async () => {
    const { cartellaBackup, etichettaCopia, messaggioRipristinoDrive } = await import('./driveRipristino')
    expect(cartellaBackup(' Pelosetti ')).toBe('Groomly Backup – Pelosetti')
    expect(cartellaBackup('   ')).toBe('Groomly Backup – Groomly')
    expect(etichettaCopia('2026-10-23', 'file.zip')).toBe('23 ott 2026')
    expect(etichettaCopia('', 'file.zip')).toBe('file.zip')
    expect(messaggioRipristinoDrive(new Error('telefono'))).toBe('Il collegamento a Google Drive funziona sul telefono')
    expect(messaggioRipristinoDrive(new Error('ricollega'))).toBe('Ricollega Google Drive')
    expect(messaggioRipristinoDrive(new Error('invio'))).toBe('Ripristino da Drive non riuscito')
  })

  it('legge lo ZIP scaricato e poi lo toglie dalla cache', async () => {
    const { elencoCopie, leggiCopia } = await import('./driveRipristino')
    elenco.mockResolvedValue({ copie: [{ id: 'a', nome: 'file.zip', giorno: '2026-10-23' }] })
    scarica.mockResolvedValue(undefined)
    readFile.mockResolvedValue({ data: btoa('zip') })
    await expect(elencoCopie('Groomly Backup – Pelosetti')).resolves.toEqual([{ id: 'a', nome: 'file.zip', giorno: '2026-10-23' }])
    expect(DriveAuth.elenco).toHaveBeenCalledWith({ cartella: 'Groomly Backup – Pelosetti' })
    const bytes = await leggiCopia('Groomly Backup – Pelosetti', 'a')
    expect(Array.from(bytes)).toEqual(Array.from(new TextEncoder().encode('zip')))
    expect(scarica).toHaveBeenCalledWith({ cartella: 'Groomly Backup – Pelosetti', id: 'a' })
    expect(readFile).toHaveBeenCalledWith({ path: 'groomly-drive-ripristino.zip', directory: Directory.Cache })
    expect(deleteFile).toHaveBeenCalledWith({ path: 'groomly-drive-ripristino.zip', directory: Directory.Cache })
  })
})
