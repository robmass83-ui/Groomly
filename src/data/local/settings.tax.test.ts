import { beforeEach, describe, expect, it } from 'vitest'
import { getSettings } from './settings'
import { settingsFromDoc, settingsToDoc } from '../../lib/firebaseMap'
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
    expect(getSettings('u1').business.salonName).toBe('')
    writeJson(storageKeys.settings('u1'), {
      ...getSettings('u1'),
      business: { ...getSettings('u1').business, taxCode: 'rssmra85t10a562s' },
    })
    expect(getSettings('u1').business.taxCode).toBe('RSSMRA85T10A562S')
  })
})

describe('paese del salone', () => {
  beforeEach(() => localStorage.clear())

  it('senza paese o con un valore sbagliato vale IT, uno valido resta insieme al flag', () => {
    const doc = { theme: 'light', updatedAt: '2026-10-17T00:00:00.000Z' }
    writeJson(storageKeys.settings('u1'), { ...doc, business: { name: 'A', vatNumber: '', phone: '', address: '' } })
    expect(getSettings('u1').business.paese).toBe('IT')
    expect(getSettings('u1').business).not.toHaveProperty('paeseScelto')
    writeJson(storageKeys.settings('u1'), { ...doc, business: { name: 'A', paese: 'US', paeseScelto: 'sì' } })
    expect(getSettings('u1').business.paese).toBe('IT')
    expect(getSettings('u1').business).not.toHaveProperty('paeseScelto')
    writeJson(storageKeys.settings('u1'), { ...doc, business: { name: 'A', paese: 'FR', paeseScelto: true } })
    expect(getSettings('u1').business).toMatchObject({ paese: 'FR', paeseScelto: true })
  })

  it('arriva e riparte da Firestore senza perdere paese e flag', () => {
    const settings = getSettings('u2')
    const doc = settingsToDoc({ ...settings, business: { ...settings.business, paese: 'ES', paeseScelto: true } })
    expect(settingsFromDoc(doc).business).toMatchObject({ paese: 'ES', paeseScelto: true })
    expect(settingsFromDoc({ ...doc, business: { name: 'A' } }).business.paese).toBe('IT')
  })
})
