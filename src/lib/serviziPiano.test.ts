import { describe, expect, it } from 'vitest'
import { statoPiano } from './piano'
import { emailPermessa, serviziPerStato } from './serviziPiano'

const adesso = new Date('2026-10-31T10:00:00.000Z')
const go = statoPiano(undefined, adesso)
const plus = statoPiano({ piano: 'pro', stato: 'attivo' }, adesso)

describe('servizi email secondo il piano', () => {
  it('in Go ogni email Plus vale spenta, senza perdere le altre scelte', () => {
    const servizi = { promemoria: { modo: 'automatico' as const, ora: '18:00' }, pronto: { modo: 'manuale' as const } }
    const visti = serviziPerStato(servizi, go)
    expect(visti.promemoria).toEqual({ modo: 'spento', ora: '18:00' })
    expect(visti.pronto.modo).toBe('spento')
    expect(servizi.promemoria.modo).toBe('automatico')
    expect(emailPermessa(go, 'recensione')).toBe(false)
  })

  it('con Plus resta la scelta del salone', () => {
    const servizi = { promemoria: { modo: 'automatico' as const } }
    expect(serviziPerStato(servizi, plus)).toEqual(servizi)
    expect(emailPermessa(plus, 'attesa')).toBe(true)
  })

  it('senza servizi non inventa nulla', () => {
    expect(serviziPerStato(undefined, go)).toBeUndefined()
  })
})
