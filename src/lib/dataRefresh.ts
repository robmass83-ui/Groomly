import { useSyncExternalStore } from 'react'

let stamp = 0
const listeners = new Set<() => void>()

export function bumpDataRefresh(): void {
  stamp += 1
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useDataRefresh(): number {
  return useSyncExternalStore(subscribe, () => stamp, () => stamp)
}
