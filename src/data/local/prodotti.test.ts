// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, isEmptyBackup, readRestoreBundle, restoreBackup } from '../../lib/backupDoc'
import { canonicalJson, type GroomlyDati } from '../../lib/backupBundle'
import type { Prodotto } from '../../lib/prodotti'
import { deleteProdottoLocal, listProdotti, prodottiToLocalMap, saveProdottoLocal } from './prodotti'

const UID = 'salone'
const data = new Date('2026-11-05T10:00:00.000Z')

function prodotto(over: Partial<Prodotto> = {}): Prodotto {
  return { id: 'p1', nome: 'Shampoo', categoria: 'shampoo', quantita: 5, unita: 'l', ditta: 'Ditta Alfa', codice: 'SH-1', createdAt: data, updatedAt: data, ...over }
}

describe('prodotti sul telefono', () => {
  beforeEach(() => localStorage.clear())

  it('salva, elenca in ordine di nome ed elimina', () => {
    expect(saveProdottoLocal(UID, prodotto({ id: 'b', nome: 'Zeta' }))).toBe(true)
    expect(saveProdottoLocal(UID, prodotto({ id: 'a', nome: 'alfa' }))).toBe(true)
    expect(listProdotti(UID).map((item) => item.id)).toEqual(['a', 'b'])
    deleteProdottoLocal(UID, 'a')
    expect(listProdotti(UID).map((item) => item.id)).toEqual(['b'])
  })

  it('non salva un prodotto senza nome', () => {
    expect(saveProdottoLocal(UID, prodotto({ nome: ' ' }))).toBe(false)
    expect(listProdotti(UID)).toEqual([])
  })

  it('entra nel backup e torna col ripristino', () => {
    saveProdottoLocal(UID, prodotto())
    const bundle = buildBackup(UID)
    expect(isEmptyBackup(bundle)).toBe(false)
    localStorage.clear()
    restoreBackup(UID, bundle)
    expect(listProdotti(UID)).toEqual([prodotto()])
  })

  it('un salone con i soli prodotti non è un backup vuoto', () => {
    const vuoto = { dogs: {}, appointments: {}, services: {}, settings: {} }
    expect(isEmptyBackup(vuoto)).toBe(true)
    expect(isEmptyBackup({ ...vuoto, prodotti: prodottiToLocalMap([prodotto()]) })).toBe(false)
  })

  it('un backup vecchio senza prodotti non tocca quelli presenti', () => {
    saveProdottoLocal(UID, prodotto())
    const vecchio = { dogs: {}, appointments: {}, services: {}, settings: {} }
    expect(readRestoreBundle(vecchio)?.prodotti).toBeUndefined()
    restoreBackup(UID, vecchio)
    expect(listProdotti(UID)).toHaveLength(1)
  })

  it('il checksum di un backup vecchio resta lo stesso', () => {
    const dati = { versioneFormato: 1, dogs: {}, appointments: {}, services: {}, settings: {}, closures: {}, files: {}, deletedDogs: { ids: [], appointmentIds: [], storicoIds: [] }, codiciCane: {}, fotoMancanti: [] } as unknown as GroomlyDati
    expect(canonicalJson(dati)).not.toContain('prodotti')
    expect(canonicalJson({ ...dati, prodotti: { p1: {} } })).toContain('"prodotti":{"p1":{}}')
  })
})
