import { beforeEach, describe, expect, it, vi } from 'vitest'

const chiamata = vi.hoisted(() => vi.fn(async (_nome: string, _dati: Record<string, unknown>): Promise<unknown> => null))
vi.mock('./client', () => ({
  callCallableData: (nome: string, dati: Record<string, unknown>) => chiamata(nome, dati),
  database: vi.fn(),
  loadFirestore: vi.fn(),
}))

import {
  callContatoriAdmin,
  callEstendiBeta,
  callImpostaMostraPiani,
  callInvitaBeta,
  callRevocaBeta,
  callSegnaEarlyAdopter,
  configGlobaleDi,
} from './adminClient'

describe('adminClient', () => {
  beforeEach(() => {
    chiamata.mockReset()
    chiamata.mockResolvedValue(null)
  })

  it('invitaBeta passa la firma del contratto e legge invitati e saltati', async () => {
    chiamata.mockResolvedValue({ invitati: ['a', 7], saltati: [{ salonId: 'b', motivo: 'vip' }, { salonId: 'c', motivo: 'boh' }] })
    const esito = await callInvitaBeta({ salonIds: ['a', 'b'], piano: 'pro', giorni: 60, messaggio: '' })
    expect(chiamata).toHaveBeenCalledWith('invitaBeta', { salonIds: ['a', 'b'], piano: 'pro', giorni: 60 })
    expect(esito).toEqual({ invitati: ['a'], saltati: [{ salonId: 'b', motivo: 'vip' }] })
    await callInvitaBeta({ salonIds: ['a'], piano: 'salone', giorni: 30, messaggio: 'Ciao' })
    expect(chiamata).toHaveBeenLastCalledWith('invitaBeta', { salonIds: ['a'], piano: 'salone', giorni: 30, messaggio: 'Ciao' })
  })

  it('revoca, estendi, early adopter e mostraPiani usano i nomi del contratto', async () => {
    chiamata.mockResolvedValueOnce({ ok: true, emailStato: 'non_inviata' })
    expect(await callRevocaBeta({ salonId: 'a' })).toEqual({ ok: true, emailStato: 'non_inviata' })
    expect(chiamata).toHaveBeenLastCalledWith('revocaBeta', { salonId: 'a' })
    chiamata.mockResolvedValueOnce({ ok: true, scadeIl: '2026-12-01T00:00:00.000Z' })
    expect((await callEstendiBeta({ salonId: 'a', giorni: 30 })).scadeIl).toBe('2026-12-01T00:00:00.000Z')
    expect(chiamata).toHaveBeenLastCalledWith('estendiBeta', { salonId: 'a', giorni: 30 })
    await callSegnaEarlyAdopter({ salonId: 'a', valore: false })
    expect(chiamata).toHaveBeenLastCalledWith('segnaEarlyAdopter', { salonId: 'a', valore: false })
    await callImpostaMostraPiani(true)
    expect(chiamata).toHaveBeenLastCalledWith('impostaMostraPiani', { valore: true })
  })

  it('contatoriAdmin legge un esito vuoto senza rompersi', async () => {
    const c = await callContatoriAdmin()
    expect(chiamata).toHaveBeenCalledWith('contatoriAdmin', {})
    expect(c.saloni.totali).toBe(0)
  })

  it('legge config/globale con i default', () => {
    const c = configGlobaleDi({ mostraPiani: true, piani: { showPrezziInBeta: true } })
    expect(c.mostraPiani).toBe(true)
    expect(c.abbonamentiAttivi).toBe(false)
    expect(c.piani.showPrezziInBeta).toBe(true)
    expect(c.piani.provaSelfService).toBe(false)
  })
})
