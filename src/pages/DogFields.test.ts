import { describe, expect, it } from 'vitest'
import { t } from '../i18n/t'
import { screenErrors } from './DogFields'
import type { DogScreen } from '../lib/dogScreen'

const adesso = new Date(2026, 10, 3, 12, 0, 0, 0)
const base = { name: 'Rex', owner: 'Lea', phone: '3331234567', birthYear: '', birthMonth: '', birthDay: '', weight: '', clientType: 'occasionale', recurrenceWeeks: 4 } as unknown as DogScreen

describe('screenErrors, telefono', () => {
  it('un telefono non valido dà «Telefono non valido»', () => {
    expect(screenErrors({ ...base, phone: 'abc' }, true, adesso).phone).toBe(t('it', 'schedaTelefonoInvalido'))
    expect(screenErrors({ ...base, phone: '123' }, true, adesso).phone).toBe(t('it', 'schedaTelefonoInvalido'))
  })

  it('un telefono vuoto resta «obbligatorio»', () => {
    expect(screenErrors({ ...base, phone: '' }, true, adesso).phone).toBe(t('it', 'schedaTelefonoObbligatorio'))
  })

  it('un telefono con prefisso e spazi non dà errori', () => {
    expect(screenErrors({ ...base, phone: '+39 333 1234567' }, true, adesso).phone).toBeUndefined()
  })
})
