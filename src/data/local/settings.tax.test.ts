import { beforeEach, describe, expect, it } from 'vitest'
import { getSettings } from './settings'
import { storageKeys, writeJson } from './storage'

describe('taxCode', () => {
  beforeEach(() => localStorage.clear())

  it('un documento senza la chiave vale vuoto e uno minuscolo torna maiuscolo', () => {
    writeJson(storageKeys.settings('u1'), {
      theme: 'light',
      updatedAt: '2026-10-17T00:00:00.000Z',
      business: { name: 'I Pelosetti', vatNumber: '', phone: '', address: '' },
    })
    expect(getSettings('u1').business.taxCode).toBe('')
    writeJson(storageKeys.settings('u1'), {
      ...getSettings('u1'),
      business: { ...getSettings('u1').business, taxCode: 'rssmra85t10a562s' },
    })
    expect(getSettings('u1').business.taxCode).toBe('RSSMRA85T10A562S')
  })
})
