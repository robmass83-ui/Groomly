import { afterEach, describe, expect, it, vi } from 'vitest'
import { conRegistro, registraAdmin } from './adminLog'

function dbFinto(aggiungi = vi.fn(async (_voce: unknown) => undefined)) {
  return { aggiungi, db: { collection: (nome: string) => ({ add: (voce: unknown) => aggiungi({ nome, voce }) }) } }
}

describe('registro delle azioni admin', () => {
  afterEach(() => vi.restoreAllMocks())

  it('scrive azione, salone, dettagli e momento in adminLog', async () => {
    const { aggiungi, db } = dbFinto()
    await registraAdmin(db, { azione: 'eliminaSalone', salonId: 's1', dettagli: { persone: 2 } }, new Date('2026-11-05T10:00:00Z'))
    expect(aggiungi).toHaveBeenCalledWith({
      nome: 'adminLog',
      voce: { quando: '2026-11-05T10:00:00.000Z', azione: 'eliminaSalone', salonId: 's1', dettagli: { persone: 2 } },
    })
  })

  it('senza salone e dettagli scrive valori vuoti, mai undefined', async () => {
    const { aggiungi, db } = dbFinto()
    await registraAdmin(db, { azione: 'spegniAbbonamenti' }, new Date('2026-11-05T10:00:00Z'))
    expect(aggiungi.mock.calls[0]?.[0]).toMatchObject({ voce: { salonId: null, dettagli: {} } })
  })

  it('dopo un’azione riuscita registra e restituisce l’esito', async () => {
    const { aggiungi, db } = dbFinto()
    const esito = await conRegistro('invitaBeta', (fatto: { n: number }) => ({ dettagli: { invitati: fatto.n } }), async () => ({ n: 3 }), db)
    expect(esito).toEqual({ n: 3 })
    expect(aggiungi.mock.calls[0]?.[0]).toMatchObject({ voce: { azione: 'invitaBeta', dettagli: { invitati: 3 } } })
  })

  it('un’azione fallita non si registra', async () => {
    const { aggiungi, db } = dbFinto()
    await expect(conRegistro('eliminaSalone', () => ({}), async () => { throw new Error('negato') }, db)).rejects.toThrow('negato')
    expect(aggiungi).not.toHaveBeenCalled()
  })

  it('se il registro non si scrive l’azione resta fatta e l’errore va nei log', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { db } = dbFinto(vi.fn(async () => { throw new Error('quota') }))
    await expect(conRegistro('impostaTour', () => ({}), async () => 'fatto', db)).resolves.toBe('fatto')
    expect(errore).toHaveBeenCalled()
  })
})
