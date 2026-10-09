import { useEffect, useState } from 'react'
import { firebaseEnabled, readsLocal, subscribeSource } from '../data/firebase/enabled'

export function useLocalData(): boolean {
  const [local, setLocal] = useState(() => !firebaseEnabled() || readsLocal())
  useEffect(() => {
    if (!firebaseEnabled()) return
    return subscribeSource(() => setLocal(readsLocal()))
  }, [])
  return local
}
