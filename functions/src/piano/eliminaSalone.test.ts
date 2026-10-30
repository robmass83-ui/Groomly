import { describe, expect, it } from 'vitest'
import { decisioneEliminaSalone } from './eliminaSalone'

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', emailVerified: true, chiamante: 'rob', salonChiamante: 'shared' }

describe('eliminazione di una toelettatura dai test', () => {
  it('Roberto o Laura cancellano un salone di prova con i suoi collaboratori', () => {
    const persone = [{ uid: 'prova', emails: ['prova@test.it'] }, { uid: 'collab', emails: ['collab@test.it'] }]
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'prova', persone })).toEqual({ ok: true })
    expect(decisioneEliminaSalone({ ...ROBERTO, operatorEmail: 'laura.masala@tiscali.it', salonId: 'prova', persone })).toEqual({ ok: true })
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'vuoto', persone: [] })).toEqual({ ok: true })
  })

  it('chi non è operatore, o non ha l’email verificata, non cancella nulla', () => {
    expect(decisioneEliminaSalone({ ...ROBERTO, operatorEmail: 'altro@test.it', salonId: 'prova', persone: [] }).ok).toBe(false)
    expect(decisioneEliminaSalone({ ...ROBERTO, emailVerified: false, salonId: 'prova', persone: [] }).ok).toBe(false)
    expect(decisioneEliminaSalone({ ...ROBERTO, operatorEmail: 'altro@test.it', admin: true, salonId: 'prova', persone: [] })).toEqual({ ok: true })
  })

  it('il salone condiviso, un percorso o un id vuoto sono rifiutati', () => {
    for (const salonId of ['', '  ', 'shared', 'a/b']) {
      expect(decisioneEliminaSalone({ ...ROBERTO, salonId, persone: [] })).toEqual({ ok: false, message: 'Accesso negato' })
    }
  })

  it('non tocca mai il salone di Laura, di Roberto o di chi chiama', () => {
    const vieto = { ok: false, message: 'Questa toelettatura non si può eliminare' }
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'l', persone: [{ uid: 'l', emails: ['Laura.Masala@tiscali.it'] }] })).toEqual(vieto)
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'x', persone: [{ uid: 'y', emails: ['altro@test.it', 'masala.roberto@hotmail.it'] }] })).toEqual(vieto)
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'rob', persone: [] })).toEqual(vieto)
    expect(decisioneEliminaSalone({ ...ROBERTO, salonChiamante: 'mio', salonId: 'mio', persone: [] })).toEqual(vieto)
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'x', persone: [{ uid: 'rob', emails: [] }] })).toEqual(vieto)
  })
})
