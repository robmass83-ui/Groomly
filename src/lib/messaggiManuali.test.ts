import { describe, expect, it } from 'vitest'
import { firmaMessaggio, linkMessaggio, testoMessaggio } from './messaggiManuali'

describe('messaggi manuali', () => {
  it('normalizza il cellulare e firma nella lingua dei clienti', () => {
    const testo = testoMessaggio('en', 'promemoria', { nome: 'Giulia', cane: 'Luna', servizio: 'Bath', quando: 'Tuesday' })
    expect(linkMessaggio('333 1234567', 'Ciao Luna')).toBe('https://wa.me/393331234567?text=Ciao%20Luna')
    expect(linkMessaggio('021234567', 'Ciao')).toBeNull()
    expect(testo).toContain('Made with Groomly')
    expect(testo).not.toContain('Fatto con')
    expect(firmaMessaggio('it')).toBe('Fatto con Groomly')
    expect(firmaMessaggio('es')).toBe('Hecho con Groomly')
  })
})
