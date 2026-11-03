// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { __resetDopoAccesso, destinazioneRicordata, destinazioneValida, dimenticaDestinazione, ricordaDestinazione, segnaEntrato } from './dopoAccesso'

describe('dopoAccesso', () => {
  beforeEach(() => {
    sessionStorage.clear()
    __resetDopoAccesso()
  })

  it('vale solo per pagine interne che non siano Home, login o invito', () => {
    expect(destinazioneValida('/impostazioni/notifiche?x=1')).toBe(true)
    expect(destinazioneValida('/')).toBe(false)
    expect(destinazioneValida('/login')).toBe(false)
    expect(destinazioneValida('/invito/abc')).toBe(false)
    expect(destinazioneValida('//evil.com')).toBe(false)
    expect(destinazioneValida('https://x.it')).toBe(false)
  })

  it('si legge finché non la si dimentica', () => {
    ricordaDestinazione('/incassi')
    expect(destinazioneRicordata()).toBe('/incassi')
    dimenticaDestinazione()
    expect(destinazioneRicordata()).toBe('/')
  })

  it('non ricorda percorsi non validi', () => {
    ricordaDestinazione('//evil.com')
    expect(destinazioneRicordata()).toBe('/')
  })

  it('chi è già entrato in questa apertura non lascia la sua pagina', () => {
    segnaEntrato()
    ricordaDestinazione('/impostazioni')
    expect(destinazioneRicordata()).toBe('/')
  })
})
