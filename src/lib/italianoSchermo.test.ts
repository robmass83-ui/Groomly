import { describe, expect, it } from 'vitest'
import { testoHaItaliano } from './italianoSchermo'

describe('italiano sullo schermo', () => {
  it('lascia passare inglese, marchi e i nomi del salone', () => {
    expect(testoHaItaliano('No appointments')).toBeNull()
    expect(testoHaItaliano('Groomly Privacy DPA WhatsApp POS')).toBeNull()
    expect(testoHaItaliano('Nala', ['Nala'])).toBeNull()
  })

  it('ferma le parole italiane', () => {
    expect(testoHaItaliano('Nessun appuntamento')).toBe('nessun')
    expect(testoHaItaliano('October 2026')).toBeNull()
    expect(testoHaItaliano('Ottobre 2026')).toBe('ottobre')
  })
})
