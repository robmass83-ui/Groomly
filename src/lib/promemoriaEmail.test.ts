import { describe, expect, it } from 'vitest'
import { BREVO_TEMPLATE, postiEmailSalone, TETTO_EMAIL_GIORNO } from './promemoriaEmail'

describe('posti email del salone', () => {
  it('da solo il salone usa tutto il tetto', () => {
    expect(postiEmailSalone({ salonId: 'a', totale: 0, perSalone: {}, accesi: ['a'] })).toBe(TETTO_EMAIL_GIORNO)
    expect(postiEmailSalone({ salonId: 'a', totale: 299, perSalone: { a: 299 }, accesi: ['a'] })).toBe(1)
  })

  it('un salone che manda tanto non ferma gli altri', () => {
    const accesi = ['a', 'b', 'c']
    const a = postiEmailSalone({ salonId: 'a', totale: 0, perSalone: {}, accesi })
    expect(a).toBe(100)
    const dopoA = { a: 100 }
    expect(postiEmailSalone({ salonId: 'a', totale: 100, perSalone: dopoA, accesi })).toBe(0)
    expect(postiEmailSalone({ salonId: 'b', totale: 100, perSalone: dopoA, accesi })).toBe(100)
    expect(postiEmailSalone({ salonId: 'c', totale: 100, perSalone: dopoA, accesi })).toBe(100)
  })

  it('quello che un salone ha già usato libera posti per gli altri', () => {
    const accesi = ['a', 'b']
    // b ha già usato la sua quota: a può prendere il resto del tetto.
    expect(postiEmailSalone({ salonId: 'a', totale: 150, perSalone: { b: 150 }, accesi })).toBe(150)
    expect(postiEmailSalone({ salonId: 'b', totale: 290, perSalone: { a: 140, b: 150 }, accesi })).toBe(0)
    expect(postiEmailSalone({ salonId: 'a', totale: 290, perSalone: { a: 140, b: 150 }, accesi })).toBe(10)
  })

  it('un contatore vecchio senza saloni conta comunque nel tetto', () => {
    expect(postiEmailSalone({ salonId: 'a', totale: 300, perSalone: {}, accesi: ['a'] })).toBe(0)
    expect(BREVO_TEMPLATE.promemoria).toBe(12)
  })
})
