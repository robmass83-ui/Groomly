import { describe, expect, it, vi } from 'vitest'
import { backupNotturno } from '../backupNotturno'
import { chiamaPonte } from './ponteBackup'
import { prossimoBackup } from './statoDrive'

describe('prossimo backup automatico', () => {
  const ora = (giorno: number, ore: number, minuti = 0) => new Date(2026, 9, giorno, ore, minuti).getTime()

  it('backup fatto a mano alle 15:20: il giornaliero torna domani all orario scelto', () => {
    expect(prossimoBackup(new Date(2026, 9, 30, 15, 20).toISOString(), 'giorno', '21:00', new Date(2026, 9, 30, 15, 37))).toBe(ora(31, 21))
  })

  it('senza copie parte oggi all orario, o subito se l orario è passato', () => {
    expect(prossimoBackup(null, 'giorno', '21:00', new Date(2026, 9, 30, 15, 0))).toBe(ora(30, 21))
    expect(prossimoBackup(null, 'giorno', '21:00', new Date(2026, 9, 30, 22, 0))).toBe(ora(30, 22))
  })

  it('in ritardo è dovuto adesso', () => {
    expect(prossimoBackup(new Date(2026, 9, 27, 21, 0).toISOString(), 'giorno', '21:00', new Date(2026, 9, 30, 9, 0))).toBe(ora(30, 9))
  })

  it('settimanale e mensile contano i giorni dall ultima copia', () => {
    expect(prossimoBackup(new Date(2026, 9, 1, 10, 0).toISOString(), 'settimana', '07:15', new Date(2026, 9, 2))).toBe(ora(8, 7, 15))
    expect(prossimoBackup(new Date(2026, 9, 1, 10, 0).toISOString(), 'mese', '07:15', new Date(2026, 9, 2))).toBe(ora(31, 7, 15))
  })

  it('un orario non valido usa le 21:00', () => {
    expect(prossimoBackup(null, 'giorno', '25:99', new Date(2026, 9, 30, 8, 0))).toBe(ora(30, 21))
    expect(prossimoBackup(null, undefined, undefined, new Date(2026, 9, 30, 8, 0))).toBe(ora(30, 21))
  })
})

describe('ponte del backup notturno', () => {
  it('risponde a ogni chiamata con il suo id e porta il codice d errore', async () => {
    window.GroomlyBackup = {
      chiama: (id, metodo) => {
        queueMicrotask(() => {
          if (metodo === 'wifi') window.__groomlyRisposta?.(id, true, '{"wifi":true}')
          else window.__groomlyRisposta?.(id, false, '"ricollega"')
        })
      },
      fine: () => undefined,
    }
    await expect(chiamaPonte('wifi')).resolves.toEqual({ wifi: true })
    await expect(chiamaPonte('carica')).rejects.toThrow('ricollega')
    delete window.GroomlyBackup
    await expect(chiamaPonte('wifi')).rejects.toThrow('telefono')
  })
})

describe('backup notturno', () => {
  const ponte = () => ({ chiama: vi.fn(), fine: vi.fn() })

  it('con l accesso fa il backup e lo dice ad Android', async () => {
    const p = ponte()
    const prova = vi.fn(async () => 'inviato' as const)
    const esito = await backupNotturno(p, { accesso: async () => 'u1', prova, programma: vi.fn(async () => undefined) })
    expect(prova).toHaveBeenCalledWith('u1', expect.any(Date))
    expect(esito).toEqual({ esito: 'inviato', messaggio: '' })
    expect(p.fine).toHaveBeenCalledWith(JSON.stringify(esito))
  })

  it('se non era dovuto aggiorna l orario del prossimo', async () => {
    const p = ponte()
    const programma = vi.fn(async () => undefined)
    await backupNotturno(p, { accesso: async () => 'u1', prova: vi.fn(async () => 'saltato' as const), programma })
    expect(programma).toHaveBeenCalledWith('u1')
    expect(p.fine).toHaveBeenCalledWith(JSON.stringify({ esito: 'saltato', messaggio: '' }))
  })

  it('senza accesso o con un errore lo dice con un messaggio', async () => {
    const p = ponte()
    await backupNotturno(p, { accesso: async () => null })
    expect(JSON.parse(p.fine.mock.calls[0]?.[0] as string)).toEqual({ esito: 'errore', messaggio: 'Apri Groomly ed entra con il tuo account' })
    const q = ponte()
    await backupNotturno(q, { accesso: async () => 'u1', prova: vi.fn(async () => { throw new Error('ricollega') }) })
    expect(JSON.parse(q.fine.mock.calls[0]?.[0] as string)).toEqual({ esito: 'errore', messaggio: 'Ricollega Google Drive' })
  })
})
