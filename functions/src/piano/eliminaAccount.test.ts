import { describe, expect, it } from 'vitest'
import { emailEliminazione } from './emailEliminazione'
import { avvisoAbbonamentoPlay, decisioneEliminazione } from './eliminaAccount'

describe('eliminazione account', () => {
  it('il titolare cancella il salone, il collaboratore solo il proprio posto', () => {
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1' })).toEqual({ ok: true, azione: 'salone' })
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', richiesto: 'altro' }).ok).toBe(false)
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'shared' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', richiesto: 'shared' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'collab', salonId: 'u1' })).toEqual({ ok: true, azione: 'membro' })
    expect(decisioneEliminazione({ uid: 'u1', salonId: '' }).message).toBe('Accesso negato')
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', fonte: 'play', stato: 'attivo' })).toEqual({ ok: true, azione: 'salone' })
    expect(avvisoAbbonamentoPlay('play', 'attivo')).toBe(true)
    expect(avvisoAbbonamentoPlay('play', 'scaduto')).toBe(false)
    expect(decisioneEliminazione({ uid: 'u1', salonId: 'u1', fonte: 'play', stato: 'scaduto' })).toEqual({ ok: true, azione: 'salone' })
  })

  it('non elimina Laura né un titolare VIP', () => {
    expect(decisioneEliminazione({ uid: 'laura', salonId: 'laura', email: 'laura.masala@tiscali.it' }).message).toBe('Questo account non si può eliminare')
    expect(decisioneEliminazione({ uid: 'ada', salonId: 'ada', vip: true }).message).toBe('Questo account non si può eliminare')
    expect(decisioneEliminazione({ uid: 'collab', salonId: 'ada', vip: true })).toEqual({ ok: true, azione: 'membro' })
  })

  it('l’email di conferma nomina il salone e il contatto', () => {
    const lettera = emailEliminazione('Bauci <salon>')
    expect(lettera.oggetto).toBe('Account Groomly eliminato')
    expect(lettera.html).toContain('Bauci &lt;salon&gt;')
    expect(lettera.html).toContain('info@groomlyapp.it')
    expect(lettera.html).toContain('groomly-logo-orizzontale.svg')
  })
})
