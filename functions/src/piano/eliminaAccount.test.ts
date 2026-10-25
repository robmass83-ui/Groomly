import { describe, expect, it } from 'vitest'
import { decisioneEliminazione } from './eliminaAccount'

describe('eliminazione account', () => {
  it('rifiuta un salone diverso, shared e un abbonamento Play ancora attivo', () => {
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1' })).toEqual({ ok: true })
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', richiesto: 'altro' }).ok).toBe(false)
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'shared' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', richiesto: 'shared' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'altro' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', fonte: 'play', stato: 'attivo' }).message).toBe('Disdici prima su Google Play')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', fonte: 'play', stato: 'scaduto' })).toEqual({ ok: true })
  })
})
