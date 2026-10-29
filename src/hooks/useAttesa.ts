import { useEffect, useRef, useState } from 'react'
import { firebaseEnabled, notifySaveFailed } from '../data/firebase/enabled'
import {
  attesaToLocalMap,
  avvisiToLocalMap,
  listAttesa,
  listAvvisiAttesa,
  ordinaAttesa,
  saveAttesaLocal,
  type AvvisoAttesa,
  type IscrittoAttesaDoc,
} from '../data/local/attesa'
import { storageKeys, writeJson } from '../data/local/storage'
import { chiaveGiornoRoma } from '../lib/disponibilita'

export type NuovoIscritto = Omit<IscrittoAttesaDoc, 'id' | 'creatoIl' | 'attivo'>

/**
 * La lista d'attesa del salone. Con `uid` vuoto non legge niente e non apre ascolti:
 * le pagine lo passano vuoto quando il servizio è spento.
 * `iscritti` sono solo quelli ancora in lista (`attivo !== false`); chi esce resta nel documento.
 */
export function useAttesa(uid: string): {
  iscritti: IscrittoAttesaDoc[]
  aggiungi: (nuovo: NuovoIscritto) => Promise<void>
  togli: (id: string) => Promise<void>
} {
  const [tutti, setTutti] = useState<IscrittoAttesaDoc[]>(() => (uid ? listAttesa(uid) : []))
  const ref = useRef(tutti)
  ref.current = tutti
  // Quello che questo hook ha scritto e uno snapshot non ha ancora riportato: non lo si perde per un attimo.
  const locali = useRef(new Map<string, IscrittoAttesaDoc>())

  useEffect(() => {
    if (!uid) {
      setTutti([])
      return
    }
    setTutti(listAttesa(uid))
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenAttesa(uid, (next, fromCache) => {
      if (cancelled || (next.length === 0 && fromCache)) return
      const cloudIds = new Set(next.map((item) => item.id))
      const attesi = [...locali.current.values()].filter((item) => !cloudIds.has(item.id))
      for (const id of cloudIds) locali.current.delete(id)
      const merged = attesi.length > 0 ? ordinaAttesa([...next, ...attesi]) : next
      writeJson(storageKeys.attesa(uid), attesaToLocalMap(merged))
      ref.current = merged
      setTutti(merged)
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => undefined)
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  async function scrivi(item: IscrittoAttesaDoc): Promise<void> {
    if (!uid) return
    let wrote = false
    try {
      wrote = saveAttesaLocal(uid, item)
    } catch {
      notifySaveFailed()
    }
    if (!wrote) return
    const next = ordinaAttesa([...ref.current.filter((altro) => altro.id !== item.id), item])
    ref.current = next
    setTutti(next)
    if (!firebaseEnabled()) return
    locali.current.set(item.id, item)
    // La riga è già in lista e nel salvataggio locale: il cloud non si aspetta. Senza rete setDoc non si chiude finché il server non risponde.
    void import('../data/firebase/client')
      .then((mod) => mod.saveAttesa(uid, item))
      .catch(() => notifySaveFailed())
  }

  async function aggiungi(nuovo: NuovoIscritto): Promise<void> {
    await scrivi({ ...nuovo, id: crypto.randomUUID(), creatoIl: new Date().toISOString(), attivo: true })
  }

  async function togli(id: string): Promise<void> {
    const item = ref.current.find((altro) => altro.id === id)
    if (!item || item.attivo === false) return
    await scrivi({ ...item, attivo: false })
  }

  return { iscritti: tutti.filter((item) => item.attivo !== false), aggiungi, togli }
}

/** Le conferme che il server ha lasciato al salone. Sola lettura; `uid` vuoto non legge niente. */
export function useAvvisiAttesa(uid: string): AvvisoAttesa[] {
  const [avvisi, setAvvisi] = useState<AvvisoAttesa[]>(() => (uid ? listAvvisiAttesa(uid) : []))

  useEffect(() => {
    if (!uid) {
      setAvvisi([])
      return
    }
    setAvvisi(listAvvisiAttesa(uid))
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    const dal = chiaveGiornoRoma(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
    void import('../data/firebase/client').then((mod) => mod.listenAvvisiAttesa(uid, dal, (next, fromCache) => {
      if (cancelled || (next.length === 0 && fromCache)) return
      writeJson(storageKeys.avvisiAttesa(uid), avvisiToLocalMap(next))
      setAvvisi(next)
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => undefined)
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  return avvisi
}
