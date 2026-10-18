import { useCallback, useEffect, useRef, useState } from 'react'
import { firebaseEnabled, markSalonMirror, notifySaveFailed } from '../data/firebase/enabled'
import { appointmentsToLocalMap, withLocalKey } from '../data/firebase/localSeed'
import { AppError } from '../data/errors'
import { completeAppointment, createAppointment, deleteAppointment, forgetLocalAppointments, listAppointments, saveClose, setAppointmentStatus, updateAppointment } from '../data/local/appointments'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import type { Appointment, AppointmentPhoto, AppointmentStatus, AppointmentWrite, CancelReason, PaymentMethod } from '../types/models'
import { notifyLocalWrite, useLocalWrites } from '../lib/dataRefresh'
import { isSharedMirrorTrusted } from '../lib/sharedMirror'
import { filterAppointments, readDeletion, rememberDeletion } from '../lib/tombstone'
import { mergePendingAppointments } from '../lib/pendingPhoto'
import { useCloudOnlyData } from './useCloudOnlyData'
import { useLocalData } from './useLocalData'

function sortAppointments(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
}

function mergeTrustedAppointments(incoming: Appointment[], locals: Appointment[]): Appointment[] {
  const localItems = [...new Map(locals.map((item) => [item.id, item])).values()]
  const merged = mergePendingAppointments(incoming, localItems)
  const cloudIds = new Set(incoming.map((item) => item.id))
  return sortAppointments([...merged, ...localItems.filter((item) => !cloudIds.has(item.id))])
}

export function useAppointments(uid: string) {
  const local = useLocalData()
  // Roberto dentro shared: parte dal cloud, senza visite del telefono né segni di cancellazione del telefono.
  const cloudOnly = useCloudOnlyData(uid)
  const cloudOnlyRef = useRef(cloudOnly)
  cloudOnlyRef.current = cloudOnly
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (cloudOnly && !isSharedMirrorTrusted(uid)) return []
    const localAppointments = listAppointments(uid)
    return cloudOnly ? localAppointments : filterAppointments(localAppointments, readDeletion())
  })
  const [synced, setSynced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastCreatedId = useRef<string | null>(null)
  const itemsRef = useRef(appointments)
  itemsRef.current = appointments

  useEffect(() => {
    if (!uid || local || !firebaseEnabled()) {
      setSynced(Boolean(uid))
      return
    }
    setSynced(false)
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenAppointments(uid, (next, fromCache) => {
      if (cancelled || (next.length === 0 && fromCache)) return
      const onlyCloud = cloudOnlyRef.current
      const visible = onlyCloud ? next : filterAppointments(next, readDeletion())
      const trusted = onlyCloud && isSharedMirrorTrusted(uid)
      const previous = trusted ? [...itemsRef.current, ...listAppointments(uid)] : itemsRef.current
      const merged = trusted ? mergeTrustedAppointments(visible, previous) : mergePendingAppointments(visible, previous)
      markSalonMirror(uid)
      writeJson(storageKeys.appointments(uid), appointmentsToLocalMap(merged))
      itemsRef.current = merged
      setAppointments(merged)
      setSynced(true)
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

  const writes = useLocalWrites()
  const seenWrites = useRef(writes)
  useEffect(() => {
    if (seenWrites.current === writes) return
    seenWrites.current = writes
    if (local) setAppointments(listAppointments(uid))
  }, [writes, local, uid])

  function guard(action: () => void): boolean {
    try {
      action()
      setAppointments(listAppointments(uid))
      notifyLocalWrite()
      setError(null)
      return true
    } catch (caught) {
      if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'appointment_missing')) {
        setError('Salvataggio non riuscito')
      }
      return false
    }
  }

  function fail(caught: unknown): boolean {
    if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'appointment_missing')) {
      setError('Salvataggio non riuscito')
    }
    return false
  }

  function remember(next: Appointment[], item: Appointment) {
    itemsRef.current = next
    setAppointments(next)
    setError(null)
    void import('../data/firebase/client').then((mod) => mod.saveAppointment(uid, item)).catch(() => notifySaveFailed())
  }

  const dropIds = useCallback((ids: string[]) => {
    if (!uid || ids.length === 0) return true
    const gone = new Set(ids)
    if (local) {
      return guard(() => {
        for (const id of ids) {
          try {
            deleteAppointment(uid, id)
          } catch (caught) {
            if (!(caught instanceof AppError && caught.code === 'appointment_missing')) throw caught
          }
        }
        forgetLocalAppointments(gone)
      })
    }
    try {
      withLocalKey(storageKeys.appointments(uid), appointmentsToLocalMap(itemsRef.current), () => {
        for (const id of ids) {
          try {
            deleteAppointment(uid, id)
          } catch (caught) {
            if (!(caught instanceof AppError && caught.code === 'appointment_missing')) throw caught
          }
        }
      })
      forgetLocalAppointments(gone)
      const next = itemsRef.current.filter((item) => !gone.has(item.id))
      itemsRef.current = next
      setAppointments(next)
      setError(null)
      void import('../data/firebase/client').then((mod) => Promise.all(ids.map((id) => mod.removeAppointment(uid, id)))).catch(() => notifySaveFailed())
      return true
    } catch (caught) {
      return fail(caught)
    }
  }, [local, uid])

  return {
    appointments,
    synced,
    error,
    lastCreatedId,
    saveNew(input: AppointmentWrite) {
      if (local) {
        return guard(() => {
          lastCreatedId.current = createAppointment(uid, input).id
        })
      }
      try {
        const item = withLocalKey(storageKeys.appointments(uid), appointmentsToLocalMap(itemsRef.current), () => createAppointment(uid, input))
        lastCreatedId.current = item.id
        remember(sortAppointments([...itemsRef.current.filter((current) => current.id !== item.id), item]), item)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    saveExisting(id: string, input: AppointmentWrite) {
      if (local) {
        return guard(() => {
          updateAppointment(uid, id, input)
        })
      }
      try {
        const item = withLocalKey(storageKeys.appointments(uid), appointmentsToLocalMap(itemsRef.current), () => updateAppointment(uid, id, input))
        remember(sortAppointments([...itemsRef.current.filter((current) => current.id !== item.id), item]), item)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    complete(id: string) {
      if (local) {
        return guard(() => {
          completeAppointment(uid, id)
        })
      }
      try {
        const item = withLocalKey(storageKeys.appointments(uid), appointmentsToLocalMap(itemsRef.current), () => completeAppointment(uid, id))
        remember(sortAppointments([...itemsRef.current.filter((current) => current.id !== item.id), item]), item)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    saveClose(id: string, patch: { total: number | null; actualDurationMin: number; adjustmentNote: string | null; paymentMethod?: PaymentMethod | null }, complete: boolean) {
      if (local) {
        return guard(() => {
          saveClose(uid, id, patch, complete)
        })
      }
      try {
        const item = withLocalKey(storageKeys.appointments(uid), appointmentsToLocalMap(itemsRef.current), () => saveClose(uid, id, patch, complete))
        remember(sortAppointments([...itemsRef.current.filter((current) => current.id !== item.id), item]), item)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    setStatus(id: string, status: AppointmentStatus, cancelReason?: CancelReason) {
      if (local) {
        return guard(() => {
          setAppointmentStatus(uid, id, status, cancelReason)
        })
      }
      try {
        const item = withLocalKey(storageKeys.appointments(uid), appointmentsToLocalMap(itemsRef.current), () => setAppointmentStatus(uid, id, status, cancelReason))
        remember(sortAppointments([...itemsRef.current.filter((current) => current.id !== item.id), item]), item)
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    stageDetails(id: string, patch: {
      actualDurationMin?: number
      tools?: string[]
      products?: string[]
      cutStyle?: string
      photos?: AppointmentPhoto[]
      removedPhotoIds?: string[]
    }): boolean {
      if (local) {
        try {
          const map = readJson<Record<string, Record<string, unknown>>>(storageKeys.appointments(uid))
          if (!map?.[id]) return false
          map[id] = { ...map[id], ...patch }
          writeJson(storageKeys.appointments(uid), map)
          return true
        } catch {
          return false
        }
      }
      const current = itemsRef.current.find((item) => item.id === id)
      if (!current) return false
      const next = { ...current, ...patch }
      itemsRef.current = itemsRef.current.map((item) => (item.id === id ? next : item))
      return true
    },
    remove(id: string) {
      if (local) {
        return guard(() => {
          deleteAppointment(uid, id)
        })
      }
      try {
        withLocalKey(storageKeys.appointments(uid), appointmentsToLocalMap(itemsRef.current), () => {
          deleteAppointment(uid, id)
        })
        const next = itemsRef.current.filter((item) => item.id !== id)
        itemsRef.current = next
        setAppointments(next)
        setError(null)
        rememberDeletion({ appointmentIds: [id] })
        void import('../data/firebase/client').then((mod) => mod.removeAppointment(uid, id)).catch(() => notifySaveFailed())
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
    dropDog(dogId: string) {
      const ids = itemsRef.current.filter((item) => item.dogId === dogId).map((item) => item.id)
      rememberDeletion({ appointmentIds: ids })
      return dropIds(ids)
    },
    dropMissing(liveDogIds: ReadonlySet<string>, onlyIds: ReadonlySet<string>) {
      return dropIds(itemsRef.current.filter((item) => onlyIds.has(item.id) && !liveDogIds.has(item.dogId)).map((item) => item.id))
    },
  }
}
