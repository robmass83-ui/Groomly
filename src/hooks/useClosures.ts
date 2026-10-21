import { useEffect, useRef, useState } from 'react'
import { firebaseEnabled } from '../data/firebase/enabled'
import { closuresToLocalMap, deleteClosureLocal, listClosures, saveClosureLocal } from '../data/local/closures'
import { storageKeys, writeJson } from '../data/local/storage'
import type { Closure } from '../lib/closures'

function sortClosures(items: Closure[]): Closure[] {
  return [...items].sort((a, b) => a.startDay.localeCompare(b.startDay) || a.id.localeCompare(b.id))
}

export function useClosures(uid: string): {
  closures: Closure[]
  save: (closure: Closure) => Promise<void>
  remove: (id: string) => Promise<void>
} {
  const [closures, setClosures] = useState<Closure[]>(() => (uid ? listClosures(uid) : []))
  const itemsRef = useRef(closures)
  // Id delle chiusure create da questo hook nella sessione di pagina e non ancora viste in uno snapshot.
  const sessionIds = useRef(new Set<string>())
  itemsRef.current = closures

  useEffect(() => {
    if (!uid) {
      setClosures([])
      return
    }
    setClosures(listClosures(uid))
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenClosures(uid, (next, fromCache) => {
      if (cancelled || (next.length === 0 && fromCache)) return
      const previous = itemsRef.current
      const cloudIds = new Set(next.map((item) => item.id))
      for (const id of cloudIds) sessionIds.current.delete(id)
      // Una chiusura salvata in questa sessione che lo snapshot non ha ancora resta; ciò che manca è una cancellazione del cloud.
      const kept = previous.filter((item) => sessionIds.current.has(item.id) && !cloudIds.has(item.id))
      const merged = kept.length > 0 ? sortClosures([...next, ...kept]) : next
      writeJson(storageKeys.closures(uid), closuresToLocalMap(merged))
      itemsRef.current = merged
      setClosures(merged)
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => undefined)
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  async function save(closure: Closure): Promise<void> {
    const already = itemsRef.current.some((item) => item.id === closure.id)
    const wrote = saveClosureLocal(uid, closure)
    const next = listClosures(uid)
    if (wrote && !already) sessionIds.current.add(closure.id)
    itemsRef.current = next
    setClosures(next)
    if (!wrote || !firebaseEnabled()) return
    const mod = await import('../data/firebase/client')
    await mod.saveClosure(uid, closure)
  }

  async function remove(id: string): Promise<void> {
    deleteClosureLocal(uid, id)
    sessionIds.current.delete(id)
    const next = listClosures(uid)
    itemsRef.current = next
    setClosures(next)
    if (!firebaseEnabled()) return
    const mod = await import('../data/firebase/client')
    await mod.removeClosure(uid, id)
  }

  return { closures, save, remove }
}
