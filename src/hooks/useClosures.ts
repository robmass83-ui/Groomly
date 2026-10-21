import { useEffect, useState } from 'react'
import { firebaseEnabled } from '../data/firebase/enabled'
import { deleteClosureLocal, listClosures, saveClosureLocal } from '../data/local/closures'
import type { Closure } from '../lib/closures'

export function useClosures(uid: string): {
  closures: Closure[]
  save: (closure: Closure) => Promise<void>
  remove: (id: string) => Promise<void>
} {
  const [closures, setClosures] = useState<Closure[]>(() => (uid ? listClosures(uid) : []))

  useEffect(() => {
    if (!uid) {
      setClosures([])
      return
    }
    setClosures(listClosures(uid))
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenClosures(uid, (next) => {
      if (cancelled) return
      setClosures(next)
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
    const wrote = saveClosureLocal(uid, closure)
    setClosures(listClosures(uid))
    if (!wrote || !firebaseEnabled()) return
    const mod = await import('../data/firebase/client')
    await mod.saveClosure(uid, closure)
  }

  async function remove(id: string): Promise<void> {
    deleteClosureLocal(uid, id)
    setClosures(listClosures(uid))
    if (!firebaseEnabled()) return
    const mod = await import('../data/firebase/client')
    await mod.removeClosure(uid, id)
  }

  return { closures, save, remove }
}
