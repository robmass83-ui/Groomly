import { describe, expect, it } from 'vitest'
import { nomeSicuro } from './nomeSicuro'

describe('nomeSicuro', () => {
  it('sostituisce il più e lascia gli accenti', () => {
    expect(nomeSicuro('Bagno + taglio')).toBe('Bagno e taglio')
    expect(nomeSicuro('Città')).toBe('Città')
  })

  it('toglie i simboli vietati e comprime gli spazi', () => {
    expect(nomeSicuro('a<b>c:d"e/f\\g|h?i*j')).toBe('abcdefghij')
    expect(nomeSicuro('  ciao   mondo  ')).toBe('ciao mondo')
  })

  it('tiene le emoji e taglia a 60 senza spezzare un surrogato', () => {
    expect(nomeSicuro('cane 🐕')).toBe('cane 🐕')
    const lungo = `${'a'.repeat(59)}😀`
    expect(nomeSicuro(lungo)).toBe('a'.repeat(59))
    expect(nomeSicuro('x'.repeat(80)).length).toBeLessThanOrEqual(60)
  })

  it('vuoto, soli punti e nomi riservati', () => {
    expect(nomeSicuro('')).toBe('senza-nome')
    expect(nomeSicuro('...')).toBe('senza-nome')
    expect(nomeSicuro('aux')).toBe('aux_')
    expect(nomeSicuro('COM1')).toBe('COM1_')
  })
})
