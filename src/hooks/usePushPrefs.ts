import { useCallback, useEffect, useState } from 'react'
import { firebaseEnabled, notifySaveFailed, readsLocal } from '../data/firebase/enabled'
import { loadPushPrefs, savePushPrefs, subscribePushPrefs } from '../data/pushPrefs'
import type { PushPrefs } from '../lib/pushDue'
import { useLocalData } from './useLocalData'

export function usePushPrefs(uid: string): { prefs: PushPrefs; save: (next: PushPrefs) => void } {
  const local = useLocalData()
  const [prefs, setPrefs] = useState(() => loadPushPrefs(uid))

  useEffect(() => {
    if (!uid || !firebaseEnabled() || readsLocal()) {
      setPrefs(loadPushPrefs(uid))
      return subscribePushPrefs(() => setPrefs(loadPushPrefs(uid)))
    }
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client')
      .then((mod) => mod.listenAccountPush(uid, (next) => {
        if (!cancelled) setPrefs(next)
      }))
      .then((unsubscribe) => {
        if (cancelled) unsubscribe()
        else stop = unsubscribe
      })
      .catch(() => {})
    return () => {
      cancelled = true
      stop()
    }
  }, [uid, local])

  const save = useCallback((next: PushPrefs) => {
    if (!uid) return
    setPrefs(next)
    if (!firebaseEnabled() || readsLocal()) {
      try {
        savePushPrefs(uid, next)
      } catch {
        notifySaveFailed()
      }
      return
    }
    void import('../data/firebase/client')
      .then((mod) => mod.writeAccountPush(uid, next))
      .catch(() => notifySaveFailed())
  }, [uid])

  return { prefs, save }
}
