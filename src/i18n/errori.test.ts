import { describe, expect, it } from 'vitest'
import { fraseErrore } from './errori'

describe('frase di errore', () => {
  it('usa la lingua richiesta, poi l’inglese, poi l’italiano', () => {
    expect(fraseErrore('es', 'nome_preso')).toBe('Nombre ya usado')
    expect(fraseErrore('es', 'solo_inglese')).toBe('English only')
    expect(fraseErrore('es', 'solo_italiano')).toBe('Solo italiano')
    expect(fraseErrore('en', 'sconosciuto')).toBe('Something went wrong')
    expect(fraseErrore('en', 'sconosciuto')).not.toContain('sconosciuto')
  })
})
