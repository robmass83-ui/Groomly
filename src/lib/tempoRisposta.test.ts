import { describe, expect, it } from 'vitest'
import { istanteRoma } from './disponibilita'
import { tempoRisposta } from './tempoRisposta'

describe('tempo di risposta', () => {
  it('15 minuti lo stesso giorno, 1 ora il giorno dopo, 24 ore oltre le 48, 1 ora in mezzo', () => {
    const stesso = tempoRisposta(istanteRoma('2026-10-28', '09:00'), istanteRoma('2026-10-28', '17:00'))
    expect(stesso?.minuti).toBe(15)
    expect(stesso?.scade.toISOString()).toBe(istanteRoma('2026-10-28', '09:15').toISOString())

    const domani = tempoRisposta(istanteRoma('2026-10-28', '21:15'), istanteRoma('2026-10-29', '10:00'))
    expect(domani?.minuti).toBe(60)
    expect(domani?.scade.toISOString()).toBe(istanteRoma('2026-10-28', '22:15').toISOString())

    const lontano = tempoRisposta(istanteRoma('2026-10-28', '09:00'), istanteRoma('2026-11-02', '10:00'))
    expect(lontano?.minuti).toBe(24 * 60)

    const mezzo = tempoRisposta(istanteRoma('2026-10-28', '21:00'), istanteRoma('2026-10-30', '09:00'))
    expect(mezzo?.minuti).toBe(60)
  })

  it('non supera l’inizio e rifiuta un orario già passato', () => {
    const corto = tempoRisposta(istanteRoma('2026-10-28', '16:50'), istanteRoma('2026-10-28', '17:00'))
    expect(corto?.scade.toISOString()).toBe(istanteRoma('2026-10-28', '17:00').toISOString())
    expect(tempoRisposta(istanteRoma('2026-10-28', '17:00'), istanteRoma('2026-10-28', '17:00'))).toBeNull()
  })
})
