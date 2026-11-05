import { ordinaProdotti, prodottoDaDoc, prodottoValido, type Prodotto } from '../../lib/prodotti'
import { readJson, storageKeys, writeJson } from './storage'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toStored(prodotto: Prodotto): Record<string, unknown> {
  return { ...prodotto, createdAt: prodotto.createdAt.toISOString(), updatedAt: prodotto.updatedAt.toISOString() }
}

function readMap(uid: string): Record<string, unknown> {
  const raw = readJson<unknown>(storageKeys.prodotti(uid))
  return isRecord(raw) ? raw : {}
}

export function prodottiToLocalMap(prodotti: Prodotto[]): Record<string, unknown> {
  return Object.fromEntries(prodotti.map((prodotto) => [prodotto.id, toStored(prodotto)]))
}

export function listProdotti(uid: string): Prodotto[] {
  return ordinaProdotti(Object.entries(readMap(uid)).flatMap(([id, value]) => {
    const prodotto = isRecord(value) ? prodottoDaDoc(id, value) : null
    return prodotto ? [prodotto] : []
  }))
}

export function saveProdottoLocal(uid: string, prodotto: Prodotto): boolean {
  if (!prodottoValido(prodotto)) return false
  writeJson(storageKeys.prodotti(uid), { ...readMap(uid), [prodotto.id]: toStored(prodotto) })
  return true
}

export function deleteProdottoLocal(uid: string, id: string): void {
  const map = readMap(uid)
  if (!(id in map)) return
  const next = { ...map }
  delete next[id]
  writeJson(storageKeys.prodotti(uid), next)
}
