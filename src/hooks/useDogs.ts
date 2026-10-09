import { useRef, useState } from 'react'
import { AppError } from '../data/errors'
import { archiveDog, createDog, deleteDog, listDogs, restoreDog, updateDog } from '../data/local/dogs'
import type { Dog, DogWrite } from '../types/models'

export function useDogs(uid: string) {
  const [dogs, setDogs] = useState<Dog[]>(() => listDogs(uid))
  const [error, setError] = useState<string | null>(null)
  const lastCreatedId = useRef<string | null>(null)

  function guard(action: () => void): boolean {
    try {
      action()
      setDogs(listDogs(uid))
      setError(null)
      return true
    } catch (caught) {
      if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'dog_missing')) {
        setError('Salvataggio non riuscito')
      }
      return false
    }
  }

  return {
    dogs,
    error,
    lastCreatedId,
    saveNew(input: DogWrite) {
      return guard(() => {
        lastCreatedId.current = createDog(uid, input).id
      })
    },
    saveExisting(id: string, input: DogWrite) {
      return guard(() => {
        updateDog(uid, id, input)
      })
    },
    archive(id: string, status: 'non_in_cura' | 'deceduto') {
      return guard(() => {
        archiveDog(uid, id, status)
      })
    },
    restore(id: string) {
      return guard(() => {
        restoreDog(uid, id)
      })
    },
    remove(id: string) {
      return guard(() => {
        deleteDog(uid, id)
      })
    },
  }
}
