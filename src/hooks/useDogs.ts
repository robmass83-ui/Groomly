import { useEffect, useRef, useState } from 'react'
import { saveDog as saveCloudDog } from '../data/firebase/client'
import { firebaseEnabled, markSalonMirror, notifySaveFailed } from '../data/firebase/enabled'
import { attendiServer, attendiVuoto, type MotivoRivela } from '../lib/attesaServer'
import { dogsToLocalMap, withLocalKey } from '../data/firebase/localSeed'
import { AppError } from '../data/errors'
import { archiveDog, createDog, deleteDog, forgetLocalDog, listDogs, restoreDog, updateDog } from '../data/local/dogs'
import { storageKeys, writeJson } from '../data/local/storage'
import type { Dog, DogWrite } from '../types/models'
import { notifyLocalWrite, useLocalWrites } from '../lib/dataRefresh'
import { isSharedMirrorTrusted } from '../lib/sharedMirror'
import { dogHiddenNow, filterDogs, noteSessionDogDeletion, readDeletion, rememberDeletion, rememberPendingDogDeletion } from '../lib/tombstone'
import { claimDogUpload, mergePendingDogs, rememberPendingDog } from '../lib/pendingPhoto'
import { useCloudOnlyData } from './useCloudOnlyData'
import { useLocalData } from './useLocalData'

function sortDogs(dogs: Dog[]): Dog[] {
  return [...dogs].sort((a, b) => a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id))
}

function hideDeleted<T extends { id: string; sourceDocId?: string }>(dogs: T[]): T[] {
  return dogs.filter((dog) => !dogHiddenNow(dog.id) && !dogHiddenNow(dog.sourceDocId ?? ''))
}

function preferNewerDogs(incoming: Dog[], locals: Dog[]): Dog[] {
  const newest = new Map<string, Dog>()
  for (const dog of locals) {
    const found = newest.get(dog.id)
    if (!found || dog.updatedAt.getTime() > found.updatedAt.getTime()) newest.set(dog.id, dog)
  }
  return incoming.map((dog) => {
    const local = newest.get(dog.id)
    if (local && local.updatedAt.getTime() > dog.updatedAt.getTime()) return local
    return dog
  })
}

export function useDogs(uid: string) {
  const local = useLocalData()
  // Roberto dentro shared: parte dal cloud, senza cani del telefono né segni di cancellazione del telefono.
  const cloudOnly = useCloudOnlyData(uid)
  const cloudOnlyRef = useRef(cloudOnly)
  cloudOnlyRef.current = cloudOnly
  const [stantio, setStantio] = useState(false)
  const iniziali = (): Dog[] => {
    if (cloudOnly && !isSharedMirrorTrusted(uid)) return []
    const localDogs = mergePendingDogs(listDogs(uid), [], uid)
    return hideDeleted(cloudOnly ? localDogs : filterDogs(localDogs, readDeletion()))
  }
  const [dogs, setDogs] = useState<Dog[]>(iniziali)
  const [settled, setSettled] = useState(false)
  // Un altro account sulla stessa apertura: i cani del salone precedente non restano in memoria.
  const [proprietario, setProprietario] = useState(uid)
  if (proprietario !== uid) {
    setProprietario(uid)
    setDogs(iniziali())
    setSettled(false)
    setStantio(false)
  }
  const [error, setError] = useState<string | null>(null)
  const lastCreatedId = useRef<string | null>(null)
  const dogsRef = useRef(dogs)
  dogsRef.current = dogs

  useEffect(() => {
    if (!uid || !firebaseEnabled()) {
      setSettled(Boolean(uid))
      setStantio(false)
      return
    }
    if (local) {
      setSettled(false)
      setStantio(false)
      const stopAttesa = attendiServer(() => {
        setSettled(true)
        setStantio(true)
      })
      return () => stopAttesa()
    }
    setSettled(false)
    setStantio(false)
    let cancelled = false
    let stop = () => {}
    let dalServer = false
    let scaduta = false
    let cache: Dog[] | null = null
    let stopVuoto: (() => void) | null = null
    const pubblica = (next: Dog[], dallaCache: boolean) => {
      if (cancelled) return
      if (!dallaCache) dalServer = true
      const onlyCloud = cloudOnlyRef.current
      const visible = onlyCloud ? next : filterDogs(next, readDeletion())
      markSalonMirror(uid)
      const trusted = onlyCloud && isSharedMirrorTrusted(uid)
      const preferred = preferNewerDogs(visible, onlyCloud && !trusted ? dogsRef.current : [...dogsRef.current, ...listDogs(uid)])
      const merged = hideDeleted(mergePendingDogs(preferred, dogsRef.current, uid))
      writeJson(storageKeys.dogs(uid), dogsToLocalMap(merged))
      dogsRef.current = merged
      setDogs(merged)
      setSettled(true)
      setStantio(dallaCache)
    }
    const rivela = (motivo: MotivoRivela) => {
      if (cancelled) return
      scaduta = true
      if (dalServer) {
        if (motivo === 'rete' || motivo === 'cloud') setStantio(true)
        return
      }
      if (cache && cache.length > 0) {
        pubblica(cache, true)
        return
      }
      if (dogsRef.current.length > 0) {
        setSettled(true)
        setStantio(true)
        return
      }
      stopVuoto ??= attendiVuoto(() => {
        if (!cancelled && !dalServer) setSettled(true)
      })
    }
    void import('../data/firebase/client').then((mod) => mod.listenDogs(uid, (next, fromCache) => {
      // Si aspetta il server. La cache si mostra solo da offline, se il server non risponde, o se la rete cade.
      if (cancelled) return
      if (fromCache) {
        if (next.length === 0) return
        cache = next
        if (dalServer) return
        if (!scaduta && navigator.onLine !== false) return
      }
      pubblica(next, Boolean(fromCache))
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => {
      if (!cancelled) setError('Salvataggio non riuscito')
    })
    const stopAttesa = attendiServer(rivela)
    return () => {
      cancelled = true
      stop()
      stopAttesa()
      stopVuoto?.()
    }
  }, [uid, local])

  useEffect(() => {
    if (!uid || local || !firebaseEnabled()) return
    void Promise.all(dogs.map((dog) => {
      if (!claimDogUpload(uid, dog)) return Promise.resolve()
      return saveCloudDog(uid, dog)
    })).catch(() => notifySaveFailed())
  }, [dogs, local, uid])

  const writes = useLocalWrites()
  const seenWrites = useRef(writes)
  useEffect(() => {
    if (seenWrites.current === writes) return
    seenWrites.current = writes
    if (!uid) return
    const untrusted = cloudOnlyRef.current && !isSharedMirrorTrusted(uid)
    if (untrusted) return
    const merged = local ? null : mergePendingDogs(listDogs(uid), dogsRef.current, uid)
    const next = hideDeleted(merged === null ? listDogs(uid) : cloudOnlyRef.current ? merged : filterDogs(merged, readDeletion()))
    dogsRef.current = next
    setDogs(next)
  }, [writes, local, uid])

  function guard(action: () => void): boolean {
    try {
      action()
      setDogs(hideDeleted(listDogs(uid)))
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
    writeJson(storageKeys.dogs(uid), dogsToLocalMap(next))
    notifyLocalWrite()
    setError(null)
    const run = dog
      ? import('../data/firebase/client').then((mod) => mod.saveDog(uid, dog))
      : Promise.resolve()
    void run.catch(() => notifySaveFailed())
  }

  return {
    dogs,
    settled,
    stantio,
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
      noteSessionDogDeletion(id)
      rememberPendingDogDeletion(id)
      const sourceDocId = dogsRef.current.find((dog) => dog.id === id)?.sourceDocId
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
        void import('../data/firebase/client').then((mod) => mod.removeDog(uid, id, sourceDocId)).catch(() => notifySaveFailed())
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
  }
}
