import { describe, expect, it } from 'vitest'
import { pianoFoto } from './driveFoto'

describe('piano foto su Drive', () => {
  it('tiene le foto dei cani e lascia fuori listino e file sciolti', () => {
    expect(pianoFoto([
      { id: 'listino', percorso: 'listino/file/prezzi.pdf' },
      { id: 'sciolto', percorso: 'file-sciolti/abc.jpg' },
      { id: 'foto', percorso: 'cani/C0001 - Fido - Barboncino (Rossi)/profilo.jpg' },
      { id: 'visita', percorso: 'cani/C0001 - Fido - Barboncino (Rossi)/2026-10-15 - Bagno/prima-01.jpg' },
      { id: 'gatto', percorso: 'animali/C0002 - Micio/altre foto/foto-01.jpg' },
      { id: 'foto', percorso: 'cani/C0001 - Fido - Barboncino (Rossi)/profilo.jpg' },
      { id: 'strana', percorso: 'cani/Fido/profilo.jpg' },
      { id: 'esce', percorso: 'cani/C0003 - Lux/../../segreto.jpg' },
    ])).toEqual([
      { codice: 'C0002', cartella: 'C0002 - Micio', relativo: 'altre foto/foto-01.jpg', fileId: 'gatto' },
      { codice: 'C0001', cartella: 'C0001 - Fido - Barboncino (Rossi)', relativo: '2026-10-15 - Bagno/prima-01.jpg', fileId: 'visita' },
      { codice: 'C0001', cartella: 'C0001 - Fido - Barboncino (Rossi)', relativo: 'profilo.jpg', fileId: 'foto' },
    ])
  })
})
