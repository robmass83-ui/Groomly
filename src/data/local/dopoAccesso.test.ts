// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { destinazioneRicordata, destinazioneValida, dimenticaDestinazione, prendiDestinazione, ricordaDestinazione } from './dopoAccesso'

describe('dopoAccesso', () => {
  beforeEach(() => sessionStorage.clear())

  it('vale solo per pagine interne che non siano Home, login o invito', () => {
    expect(destinazioneValida('/impostazioni/notifiche?x=1')).toBe(true)
    expect(destinazioneValida('/')).toBe(false)
    expect(destinazioneValida('/login')).toBe(false)
    expect(destinazioneValida('/invito/abc')).toBe(false)
    expect(destinazioneValida('//evil.com')).toBe(false)
    expect(destinazioneValida('https://x.it')).toBe(false)
  })

  it('si prende una volta sola', () => {
    ricordaDestinazione('/incassi')
    expect(prendiDestinazione()).toBe('/incassi')
    expect(prendiDestinazione()).toBe('/')
  })

  it('si può leggere senza toglierla', () => {
    ricordaDestinazione('/incassi')
    expect(destinazioneRicordata()).toBe('/incassi')
    expect(prendiDestinazione()).toBe('/incassi')
    expect(destinazioneRicordata()).toBe('/')
  })

  it('non ricorda percorsi non validi e si dimentica', () => {
    ricordaDestinazione('//evil.com')
    expect(prendiDestinazione()).toBe('/')
    ricordaDestinazione('/mensili')
    dimenticaDestinazione()
    expect(prendiDestinazione()).toBe('/')
  })
})
