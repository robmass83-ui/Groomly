import { useCallback, useEffect, useRef, useState } from 'react'
import { firebaseEnabled, markSalonMirror, notifySaveFailed } from '../data/firebase/enabled'
import { attendiServer, type MotivoRivela } from '../lib/attesaServer'
import { appointmentsToLocalMap, withLocalKey } from '../data/firebase/localSeed'
import { AppError } from '../data/errors'
import { completeAppointment, createAppointment, deleteAppointment, forgetLocalAppointments, listAppointments, saveClose, setAppointmentStatus, updateAppointment } from '../data/local/appointments'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import type { Appointment, AppointmentPhoto, AppointmentStatus, AppointmentWrite, CancelReason, PaymentMethod } from '../types/models'
import { notifyLocalWrite, useLocalWrites } from '../lib/dataRefresh'
import { appointmentKind } from '../lib/personal'
import { isSharedMirrorTrusted } from '../lib/sharedMirror'
import { filterAppointments, noteSessionAppointmentDeletion, readDeletion, rememberDeletion, sessionDeletedAppointmentIds, sessionHidesAppointment } from '../lib/tombstone'
import { mergePendingAppointments } from '../lib/pendingPhoto'
import { mergePersonalAppointments } from '../lib/personalSync'
import { useCloudOnlyData } from './useCloudOnlyData'
import { useLocalData } from './useLocalData'

function sortAppointments(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
}

export function useAppointments(uid: string) {
  const local = useLocalData()
  // Roberto dentro shared: parte dal cloud, senza visite del telefono né segni di cancellazione del telefono.
  const cloudOnly = useCloudOnlyData(uid)
  const cloudOnlyRef = useRef(cloudOnly)
  cloudOnlyRef.current = cloudOnly
  const [stantio, setStantio] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (cloudOnly && !isSharedMirrorTrusted(uid)) return []
    const localAppointments = listAppointments(uid)
    return cloudOnly ? localAppointments : filterAppointments(localAppointments, readDeletion())
  })
  const [synced, setSynced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastCreatedId = useRef<string | null>(null)
  const itemsRef = useRef(appointments)
  // Id delle visite create da questo hook nella sessione di pagina e non ancora viste in uno snapshot.
  const sessionIds = useRef(new Set<string>())
  // Il primo snapshot dal server è l’elenco intero. Prima di quello la cache può essere parziale.
  const sawServer = useRef(false)
  itemsRef.current = appointments

  useEffect(() => {
    if (!uid || local || !firebaseEnabled()) {
      setSynced(Boolean(uid))
      setStantio(false)
      return
    }
    setSynced(false)
    setStantio(false)
    sawServer.current = false
    let cancelled = false
    let stop = () => {}
    let scaduta = false
    let cache: { next: Appointment[]; deleted?: readonly string[] } | null = null
    const pubblica = (next: Appointment[], fromCache: boolean, cloudDeletedIds?: readonly string[]) => {
      if (cancelled) return
      const onlyCloud = cloudOnlyRef.current
      const stone = readDeletion()
      const tombstoneIds = cloudDeletedIds ?? (onlyCloud ? [] : stone.appointmentIds)
      const deletedIds = [...tombstoneIds, ...sessionDeletedAppointmentIds()]
      const previous = itemsRef.current
      const previousVisits = previous.filter((item) => appointmentKind(item) !== 'personale')
      const visits = next.filter((item) => appointmentKind(item) !== 'personale')
      const incoming = (onlyCloud ? visits : filterAppointments(visits, stone)).filter((item) => !sessionHidesAppointment(item.id))
      const fromCloud = mergePendingAppointments(incoming, previousVisits)
      const incomingIds = new Set(fromCloud.map((item) => item.id))
      for (const id of incomingIds) sessionIds.current.delete(id)
      const carried = fromCache
        ? previousVisits.filter((item) => !incomingIds.has(item.id) && !sessionHidesAppointment(item.id))
        : onlyCloud
          ? previousVisits.filter((item) => sessionIds.current.has(item.id) && !incomingIds.has(item.id) && !sessionHidesAppointment(item.id))
          : []
      const kept = !onlyCloud && fromCache ? filterAppointments(carried, stone) : carried
      const visitMerged = kept.length > 0 ? [...fromCloud, ...kept] : fromCloud
      const personalMerged = mergePersonalAppointments(previous, next, deletedIds)
      const merged = sortAppointments([...visitMerged, ...personalMerged])
      if (!fromCache) sawServer.current = true
      markSalonMirror(uid)
      writeJson(storageKeys.appointments(uid), appointmentsToLocalMap(merged))
      itemsRef.current = merged
      setAppointments(merged)
      setSynced(true)
      setStantio(fromCache)
    }
    const rivela = (motivo: MotivoRivela) => {
      if (cancelled) return
      scaduta = true
      if (sawServer.current) {
        if (motivo === 'rete' || motivo === 'cloud') setStantio(true)
        return
      }
      if (cache && cache.next.length > 0) {
        pubblica(cache.next, true, cache.deleted)
        return
      }
      if (itemsRef.current.length > 0) {
        setSynced(true)
        setStantio(true)
      }
    }
    void import('../data/firebase/client').then((mod) => mod.listenAppointments(uid, (next, fromCache, cloudDeletedIds, completa) => {
      // La vista dei primi giorni non è l'agenda. La cache si mostra solo se il server non arriva.
      if (cancelled || completa === false) return
      if (fromCache) {
        if (next.length === 0) return
        cache = { next, deleted: cloudDeletedIds }
        if (sawServer.current) return
        if (!scaduta && navigator.onLine !== false) return
      }
      pubblica(next, Boolean(fromCache), cloudDeletedIds)
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
    }
  }, [uid, local])

  const writes = useLocalWrites()
  const seenWrites = useRef(writes)
  useEffect(() => {
    if (seenWrites.current === writes) return
    seenWrites.current = writes
    if (local) setAppointments(listAppointments(uid))
    else {
      setAppointments((current) => {
        const next = cloudOnlyRef.current
          ? current.filter((item) => !sessionHidesAppointment(item.id))
          : filterAppointments(current, readDeletion())
        itemsRef.current = next
        return next
      })
    }
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
    for (const id of ids) sessionIds.current.delete(id)
    if (local) {
      return guard(() => {
        for (const id of ids) {
          try {
            deleteAppointment(uid, id)
          } catch (caught) {
            if (!(caught instanceof AppError && caught.code === 'appointment_missing')) throw caught
          }
        }
        noteSessionAppointmentDeletion(ids)
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
      noteSessionAppointmentDeletion(ids)
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
    stantio,
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
        sessionIds.current.add(item.id)
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
          noteSessionAppointmentDeletion([id])
        })
      }
      try {
        withLocalKey(storageKeys.appointments(uid), appointmentsToLocalMap(itemsRef.current), () => {
          deleteAppointment(uid, id)
        })
        noteSessionAppointmentDeletion([id])
        const next = itemsRef.current.filter((item) => item.id !== id)
        sessionIds.current.delete(id)
        itemsRef.current = next
        setAppointments(next)
        setError(null)
        rememberDeletion({ appointmentIds: [id] })
        notifyLocalWrite()
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
      const missing = itemsRef.current.filter((item) => (
        onlyIds.has(item.id) && appointmentKind(item) !== 'personale' && !liveDogIds.has(item.dogId)
      ))
      return dropIds(missing.map((item) => item.id))
    },
  }
}
