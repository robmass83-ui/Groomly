import { describe, expect, it, vi } from 'vitest'
import { eliminaAvvisoSistemaPer, pubblicaAvvisoSistemaPer } from './avvisiSistema'

const ADESSO = Date.parse('2026-11-05T10:00:00Z')
const RECENTE = ADESSO / 1000 - 60
const VECCHIO = ADESSO / 1000 - 3600
const AVVISO = { tipo: 'novita', titolo: ' Grazie ', testo: ' Ciao ' }

function pubblica(extra: Partial<Parameters<typeof pubblicaAvvisoSistemaPer>[0]> = {}) {
  const scrivi = vi.fn(async (_avviso: unknown) => undefined)
  const consentito = vi.fn(async () => true)
  return {
    scrivi,
    consentito,
    esito: pubblicaAvvisoSistemaPer({ admin: true, authTime: RECENTE, dati: AVVISO, consentito, scrivi, adesso: ADESSO, ...extra }),
  }
}

describe('pubblicaAvvisoSistemaPer', () => {
  it('scrive l’avviso ripulito', async () => {
    const { esito, scrivi } = pubblica()
    await expect(esito).resolves.toEqual({ ok: true })
    expect(scrivi).toHaveBeenCalledWith({ tipo: 'novita', titolo: 'Grazie', testo: 'Ciao' })
  })

  it('senza claim nega, senza consumare il limite', async () => {
    const { esito, consentito, scrivi } = pubblica({ admin: false })
    await expect(esito).rejects.toThrow('Accesso negato')
    expect(consentito).not.toHaveBeenCalled()
    expect(scrivi).not.toHaveBeenCalled()
  })

  it('con l’accesso vecchio chiede la riconferma', async () => {
    const { esito, scrivi } = pubblica({ authTime: VECCHIO })
    await expect(esito).rejects.toThrow('Conferma la password per continuare')
    expect(scrivi).not.toHaveBeenCalled()
  })

  it.each([
    [{ ...AVVISO, tipo: 'boh' }],
    [{ ...AVVISO, titolo: '   ' }],
    [{ ...AVVISO, titolo: 'x'.repeat(121) }],
    [{ ...AVVISO, testo: 'x'.repeat(2001) }],
    [{ ...AVVISO, testo: 3 }],
    [null],
  ])('rifiuta un avviso non valido: %j', async (dati) => {
    const { esito, scrivi } = pubblica({ dati })
    await expect(esito).rejects.toThrow('Richiesta non valida')
    expect(scrivi).not.toHaveBeenCalled()
  })

  it('oltre il limite di frequenza non scrive', async () => {
    const { esito, scrivi } = pubblica({ consentito: async () => false })
    await expect(esito).rejects.toThrow('Troppe richieste')
    expect(scrivi).not.toHaveBeenCalled()
  })
})

describe('eliminaAvvisoSistemaPer', () => {
  it('elimina senza chiedere la riconferma', async () => {
    const cancella = vi.fn(async (_id: string) => undefined)
    await expect(eliminaAvvisoSistemaPer({ admin: true, id: 'a1', cancella })).resolves.toEqual({ ok: true })
    expect(cancella).toHaveBeenCalledWith('a1')
  })

  it('nega senza claim e rifiuta un id non valido', async () => {
    const cancella = vi.fn(async (_id: string) => undefined)
    await expect(eliminaAvvisoSistemaPer({ admin: false, id: 'a1', cancella })).rejects.toThrow('Accesso negato')
    await expect(eliminaAvvisoSistemaPer({ admin: true, id: 'a/b', cancella })).rejects.toThrow('Richiesta non valida')
    await expect(eliminaAvvisoSistemaPer({ admin: true, id: '', cancella })).rejects.toThrow('Richiesta non valida')
    expect(cancella).not.toHaveBeenCalled()
  })
})
