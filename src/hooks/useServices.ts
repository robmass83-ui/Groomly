import { useState } from 'react'
import { AppError } from '../data/errors'
import { createService, listServices, moveService, updateService, ensureServiceSeed } from '../data/local/services'
import type { Service, ServiceInput, ServicePatch } from '../types/models'

export function useServices(uid: string) {
  const [services, setServices] = useState<Service[]>(() => ensureServiceSeed(uid))
  const [error, setError] = useState<string | null>(null)

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

  return {
    services,
    error,
    saveNew(input: ServiceInput) {
      return guard(() => {
        createService(uid, input)
        return listServices(uid)
      })
    },
    saveExisting(id: string, patch: ServicePatch) {
      return guard(() => {
        updateService(uid, id, patch)
        return listServices(uid)
      })
    },
    move(id: string, direction: 'up' | 'down') {
      return guard(() => moveService(uid, id, direction))
    },
  }
}
