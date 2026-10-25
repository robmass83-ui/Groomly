import { describe, expect, it } from 'vitest'
import { decisioneEliminazione } from './eliminaAccount'

describe('eliminazione account', () => {
  it('il titolare cancella il salone, il collaboratore solo il proprio posto', () => {
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1' })).toEqual({ ok: true, azione: 'salone' })
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', richiesto: 'altro' }).ok).toBe(false)
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'shared' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', richiesto: 'shared' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'collab', salonId: 'u1' })).toEqual({ ok: true, azione: 'membro' })
    expect(decisioneEliminazione({ uid: 'u1', salonId: '' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', fonte: 'play', stato: 'attivo' }).message).toBe('Disdici prima su Google Play')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', fonte: 'play', stato: 'scaduto' })).toEqual({ ok: true, azione: 'salone' })
  })
})
