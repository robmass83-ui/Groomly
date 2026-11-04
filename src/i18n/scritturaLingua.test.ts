import { describe, expect, it } from 'vitest'
import { primoAvvio, puoScrivereLinguaClienti } from './scritturaLingua'

describe('scrittura della lingua', () => {
  it('il titolare di un salone nuovo compila la lingua dei clienti con la lingua dell’app', () => {
    expect(primoAvvio({ nuovo: true, lingua: 'de', ruolo: 'titolare' })).toEqual({ lingua: 'de', linguaClienti: 'de' })
  })

  it('un salone che esiste già non la riceve: parte in italiano', () => {
    expect(primoAvvio({ nuovo: false, lingua: 'es', ruolo: 'titolare' })).toEqual({ lingua: 'es', linguaClienti: null })
  })

  it('socio e collaboratore non scrivono la lingua dei clienti', () => {
    expect(primoAvvio({ nuovo: true, lingua: 'es', ruolo: 'socio' }).linguaClienti).toBeNull()
    expect(primoAvvio({ nuovo: true, lingua: 'it', ruolo: 'collaboratore' }).linguaClienti).toBeNull()
    expect(puoScrivereLinguaClienti('collaboratore')).toBe(false)
    expect(puoScrivereLinguaClienti('socio')).toBe(false)
    expect(puoScrivereLinguaClienti('titolare')).toBe(true)
  })
})
