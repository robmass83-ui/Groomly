import { describe, expect, it } from 'vitest'
import { primoAvvio, puoScrivereLinguaClienti } from './scritturaLingua'

describe('scrittura della lingua', () => {
  it('il titolare nuovo scrive le due lingue uguali', () => {
    expect(primoAvvio({ nuovo: true, telefono: 'en', ruolo: 'titolare' })).toEqual({ lingua: 'en', linguaClienti: 'en' })
  })

  it('un account già esistente scrive solo la propria lingua', () => {
    expect(primoAvvio({ nuovo: false, telefono: 'es', ruolo: 'titolare' })).toEqual({ lingua: 'es', linguaClienti: null })
  })

  it('socio e collaboratore non scrivono la lingua dei clienti', () => {
    expect(primoAvvio({ nuovo: true, telefono: 'it', ruolo: 'collaboratore' }).linguaClienti).toBeNull()
    expect(puoScrivereLinguaClienti('collaboratore')).toBe(false)
    expect(puoScrivereLinguaClienti('socio')).toBe(false)
    expect(puoScrivereLinguaClienti('titolare')).toBe(true)
  })
})
