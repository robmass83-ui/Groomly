import { describe, expect, it } from 'vitest'
import { statoPiano } from './piano'
import { exportBloccato } from './reportGate'

const ora = new Date(2026, 9, 13, 15, 5)
const base = statoPiano(undefined, ora)
const pro = statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, ora)
const omaggio = statoPiano({ piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3 }, ora)

describe('export del report', () => {
  it('un salone base non apre l’export', () => {
    expect(exportBloccato(base)).toBe(true)
  })

  it('chi ha l’export, compreso l’omaggio, genera il file', () => {
    expect(exportBloccato(pro)).toBe(false)
    expect(exportBloccato(omaggio)).toBe(false)
  })
})
