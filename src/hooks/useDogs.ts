import { useEffect, useRef, useState } from 'react'
import { firebaseEnabled, notifySaveFailed } from '../data/firebase/enabled'
import { dogsToLocalMap, withLocalKey } from '../data/firebase/localSeed'
import { AppError } from '../data/errors'
import { archiveDog, createDog, deleteDog, forgetLocalDog, listDogs, restoreDog, updateDog } from '../data/local/dogs'
import { storageKeys, writeJson } from '../data/local/storage'
import type { Dog, DogWrite } from '../types/models'
import { notifyLocalWrite, useLocalWrites } from '../lib/dataRefresh'
import { filterDogs, readDeletion, rememberDeletion } from '../lib/tombstone'
import { claimDogUpload, mergePendingDogs, rememberPendingDog } from '../lib/pendingPhoto'
import { useLocalData } from './useLocalData'

function sortDogs(dogs: Dog[]): Dog[] {
  return [...dogs].sort((a, b) => a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id))
}

export function useDogs(uid: string) {
  const local = useLocalData()
  const [dogs, setDogs] = useState<Dog[]>(() => filterDogs(mergePendingDogs(listDogs(uid), [], uid), readDeletion()))
  const [settled, setSettled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastCreatedId = useRef<string | null>(null)
  const dogsRef = useRef(dogs)
  dogsRef.current = dogs

  useEffect(() => {
    if (!uid || local || !firebaseEnabled()) {
      setSettled(Boolean(uid))
      return
    }
    setSettled(false)
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenDogs(uid, (next) => {
      if (cancelled) return
      const visible = filterDogs(next, readDeletion())
      writeJson(storageKeys.dogs(uid), dogsToLocalMap(visible))
      setDogs((current) => mergePendingDogs(visible, current, uid))
      setSettled(true)
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => {
      if (!cancelled) setError('Salvataggio non riuscito')
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [uid, local])

  useEffect(() => {
    if (!uid || local || !firebaseEnabled()) return
    for (const dog of dogs) {
      if (!claimDogUpload(uid, dog)) continue
      void import('../data/firebase/client').then((mod) => mod.saveDog(uid, dog)).catch(() => notifySaveFailed())
    }
  }, [dogs, local, uid])

  const writes = useLocalWrites()
  const seenWrites = useRef(writes)
  useEffect(() => {
    if (seenWrites.current === writes) return
    seenWrites.current = writes
    if (local) setDogs(listDogs(uid))
  }, [writes, local, uid])

  function guard(action: () => void): boolean {
    try {
      action()
      setDogs(listDogs(uid))
      notifyLocalWrite()
      setError(null)
      return true
    } catch (caught) {
      if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'dog_missing')) {
        setError('Salvataggio non riuscito')
      }
      return false
    }
  }

  function fail(caught: unknown): boolean {
    if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'dog_missing')) {
      setError('Salvataggio non riuscito')
    }
    return false
  }

  function remember(next: Dog[], dog?: Dog) {
    if (dog) {
      rememberPendingDog(uid, dog)
      claimDogUpload(uid, dog)
    }
    dogsRef.current = next
    setDogs(next)
    setError(null)
    const run = dog
      ? import('../data/firebase/client').then((mod) => mod.saveDog(uid, dog))
      : Promise.resolve()
    void run.catch(() => notifySaveFailed())
  }

  return {
    dogs,
    settled,
    error,
    lastCreatedId,
    saveNew(input: DogWrite) {
      if (local) {
        return guard(() => {
          lastCreatedId.current = createDog(uid, input).id
        })
      }
      try {
        const dog = withLocalKey(storageKeys.dogs(uid), dogsToLocalMap(dogsRef.current), () => createDog(uid, input))
        lastCreatedId.current = dog.id
        remember(sortDogs([...dogsRef.current.filter((item) => item.id !== dog.id), dog]), dog)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    saveExisting(id: string, input: DogWrite) {
      if (local) {
        return guard(() => {
          updateDog(uid, id, input)
        })
      }
      try {
        const dog = withLocalKey(storageKeys.dogs(uid), dogsToLocalMap(dogsRef.current), () => updateDog(uid, id, input))
        remember(sortDogs([...dogsRef.current.filter((item) => item.id !== dog.id), dog]), dog)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    archive(id: string, status: 'non_in_cura' | 'deceduto') {
      if (local) {
        return guard(() => {
          archiveDog(uid, id, status)
        })
      }
      try {
        const dog = withLocalKey(storageKeys.dogs(uid), dogsToLocalMap(dogsRef.current), () => archiveDog(uid, id, status))
        remember(sortDogs([...dogsRef.current.filter((item) => item.id !== dog.id), dog]), dog)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    restore(id: string) {
      if (local) {
        return guard(() => {
          restoreDog(uid, id)
        })
      }
      try {
        const dog = withLocalKey(storageKeys.dogs(uid), dogsToLocalMap(dogsRef.current), () => restoreDog(uid, id))
        remember(sortDogs([...dogsRef.current.filter((item) => item.id !== dog.id), dog]), dog)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    remove(id: string) {
      if (local) {
        return guard(() => {
          deleteDog(uid, id)
          forgetLocalDog(id)
        })
      }
      try {
        withLocalKey(storageKeys.dogs(uid), dogsToLocalMap(dogsRef.current), () => {
          deleteDog(uid, id)
        })
        forgetLocalDog(id)
        const next = dogsRef.current.filter((item) => item.id !== id)
        dogsRef.current = next
        setDogs(next)
        setError(null)
        rememberDeletion({ ids: [id] })
        void import('../data/firebase/client').then((mod) => mod.removeDog(uid, id)).catch(() => notifySaveFailed())
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
  }
}
