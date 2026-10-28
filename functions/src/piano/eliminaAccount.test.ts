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
    expect(decisioneEliminazione({ uid: 'ada', salonId: 'ada', email: '' }).ok).toBe(true)
  })

  it('l’email di conferma nomina il salone e il contatto', () => {
    const lettera = emailEliminazione('Bauci <salon>')
    expect(lettera.oggetto).toBe('Il tuo account Groomly è stato eliminato')
    expect(lettera.html).toContain('Bauci &lt;salon&gt;')
    expect(lettera.html).toContain('Grazie per aver lavorato con noi')
    expect(lettera.html).toContain('info@groomlyapp.it')
    expect(lettera.html).toContain('groomly-logo-orizzontale.svg')
    expect(lettera.html).not.toContain('<a ')
  })

  it('senza nome la lettera dice l’account del salone', () => {
    const lettera = emailEliminazione('  ')
    expect(lettera.html).toContain('l’account del salone')
    expect(lettera.html).not.toContain('dell’account')
    expect(lettera.html).not.toContain('di il')
    expect(lettera.html).not.toContain('di Groomly')
  })

  it('l’eliminazione in inglese e spagnolo usa la specifica', () => {
    const en = emailEliminazione('Canespa', 'en')
    expect(en.oggetto).toBe('Your Groomly account has been deleted')
    expect(en.html).toContain("Hi, this is to confirm that the Canespa account has been deleted, together with the salon data managed by Groomly. Any files you saved on your phone or Google Drive remain yours. Thank you for working with us: if you ever want to come back, we'll be glad to have you. If this wasn't you, please write to info@groomlyapp.it straight away.")
    expect(emailEliminazione('', 'en').html).toContain('the salon account')
    expect(emailEliminazione('', 'en').html).not.toContain('the Groomly account')
    const es = emailEliminazione('Canespa', 'es')
    expect(es.oggetto).toBe('Tu cuenta de Groomly ha sido eliminada')
    expect(es.html).toContain('Hola, te confirmamos que la cuenta de Canespa ha sido eliminada, junto con los datos de la peluquería gestionados por Groomly. Los archivos que guardaste en tu teléfono o en tu Google Drive siguen siendo tuyos. Gracias por trabajar con nosotros: si algún día quieres volver, te esperamos. Si no has sido tú, escribe cuanto antes a info@groomlyapp.it.')
    expect(emailEliminazione('', 'es').html).toContain('la cuenta de la peluquería')
    expect(emailEliminazione('', 'es').html).not.toContain('la cuenta de Groomly')
  })
})
