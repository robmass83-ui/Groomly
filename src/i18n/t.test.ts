import { describe, expect, it } from 'vitest'
import { en } from './en'
import { es } from './es'
import { it as italiano } from './it'
import { t } from './t'

describe('vocabolario', () => {
  it('inglese e spagnolo hanno le stesse chiavi dell’italiano, con frasi non vuote', () => {
    const chiavi = Object.keys(italiano).sort()
    expect(Object.keys(en).sort()).toEqual(chiavi)
    expect(Object.keys(es).sort()).toEqual(chiavi)
    for (const chiave of chiavi) {
      expect(en[chiave as keyof typeof en].length).toBeGreaterThan(0)
      expect(es[chiave as keyof typeof es].length).toBeGreaterThan(0)
    }
  })

  it('le scritte del vecchio lucchetto Pro non restano nel vocabolario', () => {
    for (const lingua of [italiano, en, es]) expect(Object.keys(lingua)).not.toContain('proBloccata')
  })

  it('sostituisce i segnaposto e non lascia {{nome}} a schermo', () => {
    expect(t('it', 'testoAvviso', { nome: 'Rex' })).toBe('Promemoria per Rex')
    expect(t('it', 'testoAvviso', {})).not.toContain('{{nome}}')
    expect(t('en', 'fissaAppuntamento')).not.toBe(italiano.fissaAppuntamento)
    expect(t('es', 'fissaAppuntamento')).not.toBe(italiano.fissaAppuntamento)
  })
})
