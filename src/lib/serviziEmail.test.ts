import { describe, expect, it } from 'vitest'
import { normalizzaServiziEmail, puoCambiareModo, sceltaIniziale, servizioEmailAcceso } from './serviziEmail'

describe('servizi email', () => {
  it('promemoria e auguri partono in automatico, il pronto in manuale', () => {
    expect(sceltaIniziale('promemoria')).toEqual({ modo: 'automatico', anticipoGiorni: 1, ora: '18:00' })
    expect(sceltaIniziale('auguri')).toEqual({ modo: 'automatico', ora: '09:00' })
    expect(sceltaIniziale('pronto')).toEqual({ modo: 'manuale' })
  })

  it('un manuale rimasto su promemoria o auguri diventa automatico e tiene anticipo e ora', () => {
    expect(normalizzaServiziEmail({
      promemoria: { modo: 'manuale', anticipoGiorni: 2, ora: '10:00' },
      auguri: { modo: 'manuale' },
      pronto: { modo: 'manuale' },
    })).toEqual({
      promemoria: { modo: 'automatico', anticipoGiorni: 2, ora: '10:00' },
      auguri: { modo: 'automatico', ora: '09:00' },
      pronto: { modo: 'manuale' },
    })
  })

  it('solo titolare e socio cambiano il modo', () => {
    expect(puoCambiareModo('titolare')).toBe(true)
    expect(puoCambiareModo('socio')).toBe(true)
    expect(puoCambiareModo('collaboratore')).toBe(false)
  })

  it('spento non è un servizio email acceso', () => {
    expect(servizioEmailAcceso('spento')).toBe(false)
    expect(servizioEmailAcceso('manuale')).toBe(true)
    expect(servizioEmailAcceso('automatico')).toBe(true)
  })
})
