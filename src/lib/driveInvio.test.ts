import { Directory, Filesystem } from '@capacitor/filesystem'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../data/errors'
import { chiaveInvioDrive, inviaBackupSuDrive, invioDriveDovuto, messaggioInvio, provaInvioAutomatico } from './driveInvio'

const { driveCarica, driveRegistro, driveFoto, driveWifi, driveLeggi, driveInCarica } = vi.hoisted(() => ({
  driveCarica: vi.fn(),
  driveRegistro: vi.fn(async () => undefined),
  driveFoto: vi.fn(async () => undefined),
  driveWifi: vi.fn(async () => ({ wifi: false })),
  driveLeggi: vi.fn(async (): Promise<{ collegato: boolean; email: string | null }> => ({ collegato: false, email: null })),
  driveInCarica: vi.fn(async () => ({ carica: false })),
}))

vi.mock('./driveAuth', () => ({
  DriveAuth: {
    carica: driveCarica,
    registro: driveRegistro,
    foto: driveFoto,
    wifi: driveWifi,
    leggi: driveLeggi,
    inCarica: driveInCarica,
    programma: vi.fn(async () => undefined),
  },
}))

vi.mock('./backupLock', () => ({
  prendiBlocco: vi.fn(async () => undefined),
  lasciaBlocco: vi.fn(async () => undefined),
}))

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: {
    writeFile: vi.fn(async () => ({ uri: 'file:///cache/backup.zip' })),
    deleteFile: vi.fn(async () => undefined),
  },
}))

vi.mock('../data/firebase/backupCollect', () => ({ raccogliBackup: vi.fn() }))
vi.mock('../lib/registroXlsx', () => ({ registroXlsx: vi.fn(async () => new Blob(['x'])) }))
vi.mock('../lib/backupCompleto', () => ({
  backupCompleto: vi.fn(async () => ({ blob: new Blob(['zip']), name: 'Groomly Backup completo – Pelosetti – 2026-10-23.zip' })),
  cartellaFoto: vi.fn(() => ''),
}))
vi.mock('../data/local/settings', () => ({ getSettings: vi.fn() }))

const raccolto = {
  json: '{}',
  manifest: { salone: { id: 's', nome: 'Pelosetti' } },
  dati: { fotoMancanti: [] },
}

describe('invio su Drive', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(Filesystem.writeFile).mockClear()
    vi.mocked(Filesystem.deleteFile).mockClear()
    driveCarica.mockReset()
    driveRegistro.mockReset()
    driveFoto.mockReset()
    driveWifi.mockReset()
    driveLeggi.mockReset()
    driveInCarica.mockReset()
  })

  it('è dovuto se non c’è un invio, e non lo è entro 24 ore', () => {
    const now = new Date('2026-10-23T12:00:00.000Z')
    expect(invioDriveDovuto('u1', now)).toBe(true)
    localStorage.setItem(chiaveInvioDrive('u1'), new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString())
    expect(invioDriveDovuto('u1', now)).toBe(false)
    localStorage.setItem(chiaveInvioDrive('u1'), new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    expect(invioDriveDovuto('u1', now)).toBe(true)
  })

  it('carica lo ZIP nella cartella del salone e segna l’istante', async () => {
    const { raccogliBackup } = await import('../data/firebase/backupCollect')
    vi.mocked(raccogliBackup).mockResolvedValue(raccolto as never)
    driveCarica.mockResolvedValue(undefined)
    const now = new Date('2026-10-23T12:00:00.000Z')
    await inviaBackupSuDrive('u1', now)
    expect(driveCarica).toHaveBeenCalledWith({
      cartella: 'Groomly Backup – Pelosetti',
      nome: 'Groomly Backup completo – Pelosetti – 2026-10-23.zip',
      percorso: 'file:///cache/backup.zip',
    })
    expect(localStorage.getItem(chiaveInvioDrive('u1'))).toBe(now.toISOString())
    expect(driveFoto).toHaveBeenCalledWith({ cartella: 'Groomly Backup – Pelosetti', voci: [] })
    expect(driveRegistro).toHaveBeenCalledWith({
      cartella: 'Groomly Backup – Pelosetti',
      nome: 'Registro Groomly – ULTIMO.xlsx',
      percorso: 'file:///cache/backup.zip',
    })
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({ path: 'Groomly Backup completo – Pelosetti – 2026-10-23.zip', directory: Directory.Cache })
  })

  it('un rifiuto non segna l’istante e cancella il file', async () => {
    const { raccogliBackup } = await import('../data/firebase/backupCollect')
    vi.mocked(raccogliBackup).mockResolvedValue({ ...raccolto, manifest: { salone: { id: 's', nome: '  ' } } } as never)
    driveCarica.mockRejectedValue(new Error('ricollega'))
    await expect(inviaBackupSuDrive('u1', new Date('2026-10-23T12:00:00.000Z'))).rejects.toThrow('ricollega')
    expect(driveCarica).toHaveBeenCalledWith(expect.objectContaining({ cartella: 'Groomly Backup – Groomly' }))
    expect(driveFoto).not.toHaveBeenCalled()
    expect(localStorage.getItem(chiaveInvioDrive('u1'))).toBeNull()
    expect(Filesystem.deleteFile).toHaveBeenCalled()
  })

  it('dopo lo ZIP manda su Drive solo le foto dei cani e se fallisce non segna l’istante', async () => {
    const { raccogliBackup } = await import('../data/firebase/backupCollect')
    vi.mocked(raccogliBackup).mockImplementation(async (_now, opzioni) => {
      await opzioni?.onFile?.(
        { id: 'foto' } as never,
        new Uint8Array([1, 2, 3]),
        'cani/C0001 - Fido/profilo.jpg',
      )
      await opzioni?.onFile?.(
        { id: 'listino' } as never,
        new Uint8Array([4]),
        'listino/file/prezzi.pdf',
      )
      return raccolto as never
    })
    driveCarica.mockResolvedValue(undefined)
    driveFoto.mockRejectedValueOnce(new Error('invio'))
    const now = new Date('2026-10-23T12:00:00.000Z')
    await expect(inviaBackupSuDrive('u1', now)).rejects.toThrow('invio')
    expect(driveFoto).toHaveBeenCalledWith({
      cartella: 'Groomly Backup – Pelosetti',
      voci: [expect.objectContaining({
        codice: 'C0001',
        cartella: 'C0001 - Fido',
        relativo: 'profilo.jpg',
        fileId: 'foto',
        percorso: 'file:///cache/backup.zip',
      })],
    })
    expect(localStorage.getItem(chiaveInvioDrive('u1'))).toBeNull()
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({ path: 'groomly-foto-0.bin', directory: Directory.Cache })
    driveFoto.mockResolvedValue(undefined)
    await inviaBackupSuDrive('u1', now)
    expect(localStorage.getItem(chiaveInvioDrive('u1'))).toBe(now.toISOString())
  })

  it('traduce gli errori di invio', () => {
    expect(messaggioInvio(new Error('telefono'))).toBe('Il collegamento a Google Drive funziona sul telefono')
    expect(messaggioInvio(new Error('ricollega'))).toBe('Ricollega Google Drive')
    expect(messaggioInvio(new AppError('Serve la connessione per creare il backup', 'backup_offline'))).toBe('Serve la connessione per creare il backup')
    expect(messaggioInvio(new Error('occupato'))).toBe('Un altro telefono sta facendo il backup')
    expect(messaggioInvio(new Error('invio'))).toBe('Invio su Drive non riuscito')
  })

  it('l automatico parte solo se è dovuto, c è il Wi-Fi e Drive è collegato', async () => {
    const { getSettings } = await import('../data/local/settings')
    const { raccogliBackup } = await import('../data/firebase/backupCollect')
    vi.mocked(getSettings).mockReturnValue({ backup: { autoDaily: true } } as never)
    vi.mocked(raccogliBackup).mockResolvedValue(raccolto as never)
    driveCarica.mockResolvedValue(undefined)
    driveWifi.mockResolvedValue({ wifi: false })
    driveLeggi.mockResolvedValue({ collegato: true, email: 'a@b.c' })
    const now = new Date('2026-10-23T12:00:00.000Z')
    await expect(provaInvioAutomatico('u1', now)).resolves.toBe('saltato')
    expect(driveCarica).not.toHaveBeenCalled()
    driveWifi.mockResolvedValue({ wifi: true })
    vi.mocked(getSettings).mockReturnValue({ backup: { autoDaily: false } } as never)
    await expect(provaInvioAutomatico('u1', now)).resolves.toBe('saltato')
    vi.mocked(getSettings).mockReturnValue({ backup: { autoDaily: true } } as never)
    localStorage.setItem(chiaveInvioDrive('u1'), new Date(now.getTime() - 60 * 60 * 1000).toISOString())
    await expect(provaInvioAutomatico('u1', now)).resolves.toBe('saltato')
    localStorage.removeItem(chiaveInvioDrive('u1'))
    driveLeggi.mockResolvedValue({ collegato: false, email: null })
    await expect(provaInvioAutomatico('u1', now)).resolves.toBe('saltato')
    driveLeggi.mockResolvedValue({ collegato: true, email: 'a@b.c' })
    await expect(provaInvioAutomatico('u1', now)).resolves.toBe('inviato')
    expect(driveCarica).toHaveBeenCalledOnce()
  })
})
