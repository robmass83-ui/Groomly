import { describe, expect, it } from 'vitest'
import { copieDisponibili, copieScadute, fotoNuove, nomeCopia } from './copieCloud'
import { haAccesso, statoPiano } from './piano'

const ora = new Date('2026-10-25T12:00:00.000Z')

describe('copie nel cloud', () => {
  it('non ricopia una foto già presente e scade dopo 30 giorni', () => {
    expect(nomeCopia(new Date(2026, 9, 5))).toBe('2026-10-05')
    expect(fotoNuove(['a', 'b', 'a'], new Set(['b']))).toEqual(['a'])
    expect(fotoNuove(['b'], new Set(['b']))).toEqual([])
    expect(copieScadute(['2026-09-01', '2026-10-20'], ora)).toEqual(['2026-09-01'])
  })

  it('sotto Pro le copie sono accessibili e senza bucket non si scrivono', () => {
    const pro = statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, ora)
    const base = statoPiano(undefined, ora)
    expect(haAccesso(pro, 'copieCloud')).toBe(true)
    expect(copieDisponibili(base, null)).toBe('paywall')
    expect(copieDisponibili(pro, null)).toBe('assenti')
    expect(copieDisponibili(pro, 'bucket-demo')).toBe('elenco')
  })
})
