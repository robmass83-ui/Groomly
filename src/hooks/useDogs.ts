import { useState } from 'react'
import { listDogs } from '../data/local/dogs'
import type { Dog } from '../types/models'

export function useDogs(uid: string) {
  const [dogs] = useState<Dog[]>(() => listDogs(uid))
  return { dogs }
}
