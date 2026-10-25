import { describe, expect, it } from 'vitest'
import { statoPiano } from './piano'
import { exportBloccato, mesePrima, mostraFasciaAumento, periodoBloccato } from './reportGate'

const ora = new Date(2026, 9, 13, 15, 5)
const base = statoPiano(undefined, ora)
const pro = statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, ora)
const omaggio = statoPiano({ piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3 }, ora)

describe('report e export', () => {
  it('con il flag spento mesi passati ed export restano aperti', () => {
    expect(periodoBloccato(false, base, 'mese_scorso')).toBe(false)
    expect(mesePrima(false, base, new Date(2026, 8, 1), ora)).toBe(false)
    expect(exportBloccato(false, base)).toBe(false)
    expect(mostraFasciaAumento(false, {}, new Date(2026, 1, 1), new Date(2026, 9, 3))).toBe(false)
  })

  it('con il flag acceso un salone base non apre il passato né l’export', () => {
    expect(periodoBloccato(true, base, 'mese')).toBe(false)
    expect(periodoBloccato(true, base, 'mese_scorso')).toBe(true)
    expect(mesePrima(true, base, new Date(2026, 9, 1), ora)).toBe(false)
    expect(mesePrima(true, base, new Date(2026, 8, 1), ora)).toBe(true)
    expect(exportBloccato(true, base)).toBe(true)
  })

  it('chi ha l’export, compreso l’omaggio, genera il file', () => {
    expect(exportBloccato(true, pro)).toBe(false)
    expect(exportBloccato(true, omaggio)).toBe(false)
    expect(periodoBloccato(true, pro, 'anno')).toBe(false)
  })

  it('la fascia 1-5 compare solo col flag e se si può proporre', () => {
    const vecchio = new Date(2026, 1, 1)
    const terzo = new Date(2026, 9, 3)
    expect(mostraFasciaAumento(true, {}, vecchio, terzo)).toBe(true)
    expect(mostraFasciaAumento(true, {}, vecchio, ora)).toBe(false)
    expect(mostraFasciaAumento(true, { ultimaProposta: new Date(2026, 9, 1).toISOString() }, vecchio, terzo)).toBe(false)
    expect(mostraFasciaAumento(false, {}, vecchio, terzo)).toBe(false)
  })
})
