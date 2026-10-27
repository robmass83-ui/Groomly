import { describe, expect, it } from 'vitest'
import { puoCambiareModo, sceltaIniziale, servizioEmailAcceso } from './serviziEmail'

describe('servizi email', () => {
  it('all’accensione parte in manuale, con i default di promemoria e auguri', () => {
    expect(sceltaIniziale('promemoria')).toEqual({ modo: 'manuale', anticipoGiorni: 1, ora: '18:00' })
    expect(sceltaIniziale('auguri')).toEqual({ modo: 'manuale', ora: '09:00' })
    expect(sceltaIniziale('pronto')).toEqual({ modo: 'manuale' })
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
