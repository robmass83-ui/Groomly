import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { CONFIG_PIANI_DEFAULT } from '../../../src/lib/configPiani'
import { configPianiDopo, impostaConfigPianiPer } from './impostaConfigPiani'

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', emailVerified: true }

describe('configPianiDopo', () => {
  it('cambia solo i campi passati', () => {
    expect(configPianiDopo(CONFIG_PIANI_DEFAULT, { provaSelfService: true, offertaEarlyAdopter: { it: '  Prezzo di favore ' } })).toEqual({
      ...CONFIG_PIANI_DEFAULT,
      provaSelfService: true,
      offertaEarlyAdopter: { it: 'Prezzo di favore', en: '', es: '' },
    })
    expect(configPianiDopo({ ...CONFIG_PIANI_DEFAULT, annuncioPagamentiIl: '2027-01-01T00:00:00.000Z' }, { annuncioPagamentiIl: null }).annuncioPagamentiIl).toBeNull()
    expect(configPianiDopo(CONFIG_PIANI_DEFAULT, { revenueCat: { chiaveSdk: 'goog_abc' } }).revenueCat).toEqual({ chiaveSdk: 'goog_abc', offeringId: 'groomly_standard' })
  })

  it('rifiuta campi sconosciuti, tipi sbagliati e testi troppo lunghi', () => {
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, { mostraPiani: true })).toThrow('Impostazione non valida')
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, { provaSelfService: 'si' })).toThrow('Impostazione non valida')
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, { offertaEarlyAdopter: { fr: 'x' } })).toThrow('Impostazione non valida')
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, { offertaEarlyAdopter: { it: 'x'.repeat(501) } })).toThrow('Impostazione non valida')
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, { revenueCat: { chiaveSdk: 'x'.repeat(201) } })).toThrow('Impostazione non valida')
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, { revenueCat: { offeringId: '' } })).toThrow('Impostazione non valida')
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, { annuncioPagamentiIl: 'domani' })).toThrow('Impostazione non valida')
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, {})).toThrow('Impostazione non valida')
    expect(() => configPianiDopo(CONFIG_PIANI_DEFAULT, null)).toThrow('Impostazione non valida')
  })
})

describe('impostaConfigPianiPer', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('config/globale', { mostraPiani: false, abbonamentiAttivi: false, tourBenvenuto: { acceso: true, dal: 'x' } })
  })

  it('rifiuta chi non è operatore senza scrivere', async () => {
    await expect(impostaConfigPianiPer({ operatorEmail: 'altro@example.com', emailVerified: true, modifiche: { provaSelfService: true } }))
      .rejects.toThrow('Accesso negato')
    await expect(impostaConfigPianiPer({ operatorEmail: 'masala.roberto@hotmail.it', emailVerified: false, modifiche: { provaSelfService: true } }))
      .rejects.toThrow('Accesso negato')
    expect(archivio.get('config/globale')).not.toHaveProperty('piani')
  })

  it('l’operatore scrive il blocco piani completo e non tocca il resto', async () => {
    const esito = await impostaConfigPianiPer({ ...ROBERTO, modifiche: { showPrezziInBeta: true } })
    expect(esito).toEqual({ ok: true, piani: { ...CONFIG_PIANI_DEFAULT, showPrezziInBeta: true } })
    expect(archivio.get('config/globale')).toEqual({
      mostraPiani: false, abbonamentiAttivi: false, tourBenvenuto: { acceso: true, dal: 'x' },
      piani: { ...CONFIG_PIANI_DEFAULT, showPrezziInBeta: true },
    })
    await impostaConfigPianiPer({ ...ROBERTO, modifiche: { provaSelfService: true } })
    expect(archivio.get('config/globale')?.piani).toMatchObject({ showPrezziInBeta: true, provaSelfService: true })
  })

  it('un input non valido non scrive niente', async () => {
    await expect(impostaConfigPianiPer({ ...ROBERTO, modifiche: { provaSelfService: true, boh: 1 } })).rejects.toThrow('Impostazione non valida')
    expect(archivio.get('config/globale')).not.toHaveProperty('piani')
  })
})
