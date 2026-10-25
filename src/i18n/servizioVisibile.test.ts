import { describe, expect, it } from 'vitest'
import { nomeServizioIniziale, nomeServizioVisibile } from './servizioVisibile'

describe('nome del servizio', () => {
  it('traduce il predefinito italiano e lascia il nome cambiato dal salone', () => {
    expect(nomeServizioVisibile('en', 'Bagno + taglio')).not.toBe('Bagno + taglio')
    expect(nomeServizioVisibile('en', 'Bagno deluxe')).toBe('Bagno deluxe')
    expect(nomeServizioVisibile('it', 'Bagno + taglio')).toBe('Bagno + taglio')
    expect(nomeServizioVisibile('es', 'Antiparassitario')).not.toBe('Antiparassitario')
  })

  it('un salone nuovo nasce nella lingua del telefono', () => {
    expect(nomeServizioIniziale('en', 'Bagno + taglio')).toBe('Bath and trim')
    expect(nomeServizioIniziale('it', 'Bagno')).toBe('Bagno')
  })
})
