import { useEffect, useRef, useState } from 'react'
import { firebaseEnabled } from '../data/firebase/enabled'
import { deleteProdottoLocal, listProdotti, prodottiToLocalMap, saveProdottoLocal } from '../data/local/prodotti'
import { storageKeys, writeJson } from '../data/local/storage'
import { ordinaProdotti, type Prodotto } from '../lib/prodotti'

export function useProdotti(uid: string): {
  prodotti: Prodotto[]
  save: (prodotto: Prodotto) => Promise<void>
  remove: (id: string) => Promise<void>
} {
  const [prodotti, setProdotti] = useState<Prodotto[]>(() => (uid ? listProdotti(uid) : []))
  const itemsRef = useRef(prodotti)
  // Id creati in questa sessione e non ancora visti in uno snapshot: chi manca dallo snapshot resta.
  const sessionIds = useRef(new Set<string>())
  itemsRef.current = prodotti

  useEffect(() => {
    if (!uid) {
      setProdotti([])
      return
    }
    setProdotti(listProdotti(uid))
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenProdotti(uid, (next, fromCache) => {
      if (cancelled || (next.length === 0 && fromCache)) return
      const cloudIds = new Set(next.map((item) => item.id))
      for (const id of cloudIds) sessionIds.current.delete(id)
      const kept = itemsRef.current.filter((item) => sessionIds.current.has(item.id))
      const merged = ordinaProdotti([...next, ...kept])
      writeJson(storageKeys.prodotti(uid), prodottiToLocalMap(merged))
      itemsRef.current = merged
      setProdotti(merged)
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => undefined)
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  async function save(prodotto: Prodotto): Promise<void> {
    const already = itemsRef.current.some((item) => item.id === prodotto.id)
    const wrote = saveProdottoLocal(uid, prodotto)
    const next = listProdotti(uid)
    if (wrote && !already) sessionIds.current.add(prodotto.id)
    itemsRef.current = next
    setProdotti(next)
    if (!wrote || !firebaseEnabled()) return
    const mod = await import('../data/firebase/client')
    await mod.saveProdotto(uid, prodotto)
  }

  async function remove(id: string): Promise<void> {
    deleteProdottoLocal(uid, id)
    sessionIds.current.delete(id)
    const next = listProdotti(uid)
    itemsRef.current = next
    setProdotti(next)
    if (!firebaseEnabled()) return
    const mod = await import('../data/firebase/client')
    await mod.removeProdotto(uid, id)
  }

  return { prodotti, save, remove }
}
