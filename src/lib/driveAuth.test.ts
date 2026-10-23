import { describe, expect, it } from 'vitest'
import { DriveAuth } from './driveAuth'

describe('DriveAuth sul web', () => {
  it('non collega, non carica e non è sul Wi-Fi', async () => {
    await expect(DriveAuth.collega()).rejects.toThrow('telefono')
    await expect(DriveAuth.scollega()).rejects.toThrow('telefono')
    await expect(DriveAuth.leggi()).resolves.toEqual({ collegato: false, email: null })
    await expect(DriveAuth.carica({ cartella: 'Groomly Backup – Pelosetti', nome: 'a.zip', percorso: 'file:///tmp/a.zip' })).rejects.toThrow('telefono')
    await expect(DriveAuth.foto({ cartella: 'Groomly Backup – Pelosetti', voci: [] })).rejects.toThrow('telefono')
    await expect(DriveAuth.elenco({ cartella: 'Groomly Backup – Pelosetti' })).rejects.toThrow('telefono')
    await expect(DriveAuth.scarica({ cartella: 'Groomly Backup – Pelosetti', id: 'file' })).rejects.toThrow('telefono')
    await expect(DriveAuth.wifi()).resolves.toEqual({ wifi: false })
  })
})
