import { useEffect, useRef, useState } from 'react'
import { firebaseEnabled, notifySaveFailed, readsLocal } from '../data/firebase/enabled'
import { servicesToLocalMap, withLocalKey } from '../data/firebase/localSeed'
import { AppError } from '../data/errors'
import { createService, listServices, moveService, updateService, ensureServiceSeed } from '../data/local/services'
import { storageKeys } from '../data/local/storage'
import type { Service, ServiceInput, ServicePatch } from '../types/models'
import { useLocalData } from './useLocalData'

function sortServices(services: Service[]): Service[] {
  return [...services].sort((a, b) => a.order - b.order)
}

export function useServices(uid: string) {
  const local = useLocalData()
  const [services, setServices] = useState<Service[]>(() => (
    !firebaseEnabled() || readsLocal() ? ensureServiceSeed(uid) : []
  ))
  const [error, setError] = useState<string | null>(null)
  const servicesRef = useRef(services)
  servicesRef.current = services

  useEffect(() => {
    if (!uid || !firebaseEnabled() || readsLocal()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenServices(uid, (next) => {
      if (!cancelled) setServices(next)
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

  function guard(action: () => Service[] | Service): boolean {
    try {
      const result = action()
      setServices(Array.isArray(result) ? result : listServices(uid))
      setError(null)
      return true
    } catch (caught) {
      if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'service_missing')) {
        setError('Salvataggio non riuscito')
      }
      return false
    }
  }

  function fail(caught: unknown): boolean {
    if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'service_missing')) {
      setError('Salvataggio non riuscito')
    }
    return false
  }

  function remember(next: Service[], persisted: Service[]) {
    servicesRef.current = next
    setServices(next)
    setError(null)
    void import('../data/firebase/client').then((mod) => mod.saveServices(uid, persisted)).catch(() => notifySaveFailed())
  }

  return {
    services,
    error,
    saveNew(input: ServiceInput) {
      if (local) {
        return guard(() => {
          createService(uid, input)
          return listServices(uid)
        })
      }
      try {
        const created = withLocalKey(storageKeys.services(uid), servicesToLocalMap(servicesRef.current), () => createService(uid, input))
        remember(sortServices([...servicesRef.current.filter((item) => item.id !== created.id), created]), [created])
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    saveExisting(id: string, patch: ServicePatch) {
      if (local) {
        return guard(() => {
          updateService(uid, id, patch)
          return listServices(uid)
        })
      }
      try {
        const updated = withLocalKey(storageKeys.services(uid), servicesToLocalMap(servicesRef.current), () => updateService(uid, id, patch))
        remember(sortServices(servicesRef.current.map((item) => (item.id === updated.id ? updated : item))), [updated])
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    move(id: string, direction: 'up' | 'down') {
      if (local) return guard(() => moveService(uid, id, direction))
      try {
        const next = withLocalKey(storageKeys.services(uid), servicesToLocalMap(servicesRef.current), () => moveService(uid, id, direction))
        remember(next, next)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
  }
}
