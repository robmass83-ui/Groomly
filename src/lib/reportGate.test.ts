import { describe, expect, it } from 'vitest'
import { statoPiano } from './piano'
import { exportBloccato, mostraFasciaAumento } from './reportGate'

const ora = new Date(2026, 9, 13, 15, 5)
const base = statoPiano(undefined, ora)
const pro = statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, ora)
const omaggio = statoPiano({ piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3 }, ora)

describe('report e export', () => {
  it('con il flag spento l’export resta aperto', () => {
    expect(exportBloccato(false, base)).toBe(false)
    expect(mostraFasciaAumento(false, {}, new Date(2026, 1, 1), new Date(2026, 9, 3))).toBe(false)
  })

  it('con il flag acceso un salone base non apre l’export', () => {
    expect(exportBloccato(true, base)).toBe(true)
  })

  it('chi ha l’export, compreso l’omaggio, genera il file', () => {
    expect(exportBloccato(true, pro)).toBe(false)
    expect(exportBloccato(true, omaggio)).toBe(false)
  })

  it('la fascia 1-5 compare solo col flag e se si può proporre', () => {
    const vecchio = new Date(2026, 1, 1)
    const terzo = new Date(2026, 9, 3)
    expect(mostraFasciaAumento(true, {}, vecchio, terzo)).toBe(true)
    expect(mostraFasciaAumento(true, {}, vecchio, terzo, omaggio)).toBe(false)
    expect(mostraFasciaAumento(true, {}, vecchio, ora)).toBe(false)
    expect(mostraFasciaAumento(true, { ultimaProposta: new Date(2026, 9, 1).toISOString() }, vecchio, terzo)).toBe(false)
    expect(mostraFasciaAumento(false, {}, vecchio, terzo)).toBe(false)
  })
})
