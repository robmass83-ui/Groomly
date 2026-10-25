import { describe, expect, it } from 'vitest'
import { registrationSchema } from './schemas'
import { fiscalNoticeVisible, normalizeTaxCode, taxCodeError, vatError } from './profile'

describe('profile', () => {
  it('la partita IVA vuota passa, 11 cifre passano, IT e il resto no', () => {
    expect(vatError('')).toBeNull()
    expect(vatError(' 12345678901 ')).toBeNull()
    expect(vatError('IT12345678901')).toBe('11 cifre, senza IT')
    expect(vatError('123')).toBe('11 cifre, senza IT')
  })

  it('il codice fiscale vuoto passa e si salva in maiuscolo', () => {
    expect(taxCodeError('')).toBeNull()
    expect(normalizeTaxCode(' rssmra85t10a562s ')).toBe('RSSMRA85T10A562S')
    expect(taxCodeError('ABC')).toBe('16 lettere o numeri')
  })

  it('la fascia c’è solo se mancano entrambi', () => {
    expect(fiscalNoticeVisible('', '')).toBe(true)
    expect(fiscalNoticeVisible('12345678901', '')).toBe(false)
    expect(fiscalNoticeVisible('', 'RSSMRA85T10A562S')).toBe(false)
    expect(fiscalNoticeVisible('', '   ')).toBe(true)
  })

  it('la registrazione pretende i cinque campi e lascia vuoti IVA e indirizzo', () => {
    const ok = registrationSchema.safeParse({
      firstName: ' Ada ', lastName: 'Neri', email: 'Ada@Salone.it', password: 'segretissimo',
      salonName: ' I Pelosetti ', vatNumber: '', address: '', accettaTermini: true,
    })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data).toMatchObject({ firstName: 'Ada', email: 'ada@salone.it', salonName: 'I Pelosetti', vatNumber: '' })
    expect(registrationSchema.safeParse({
      firstName: '', lastName: 'Neri', email: 'ada@salone.it', password: 'corta', salonName: '', vatNumber: '12', address: '',
    }).success).toBe(false)
  })
})
