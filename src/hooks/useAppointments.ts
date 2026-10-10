import { useEffect, useRef, useState } from 'react'
import { firebaseEnabled, notifySaveFailed, readsLocal } from '../data/firebase/enabled'
import { appointmentsToLocalMap, withLocalKey } from '../data/firebase/localSeed'
import { AppError } from '../data/errors'
import { completeAppointment, createAppointment, deleteAppointment, listAppointments, setAppointmentStatus, updateAppointment } from '../data/local/appointments'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import type { Appointment, AppointmentPhoto, AppointmentStatus, AppointmentWrite, CancelReason } from '../types/models'
import { notifyLocalWrite, useLocalWrites } from '../lib/dataRefresh'
import { mergePendingAppointments } from '../lib/pendingPhoto'
import { useLocalData } from './useLocalData'

function sortAppointments(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
}

export function useAppointments(uid: string) {
  const local = useLocalData()
  const [appointments, setAppointments] = useState<Appointment[]>(() => listAppointments(uid))
  const [error, setError] = useState<string | null>(null)
  const lastCreatedId = useRef<string | null>(null)
  const itemsRef = useRef(appointments)
  itemsRef.current = appointments

  useEffect(() => {
    if (!uid || !firebaseEnabled() || readsLocal()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenAppointments(uid, (next) => {
      if (!cancelled) setAppointments((current) => mergePendingAppointments(next, current))
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

  return {
    appointments,
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
        void import('../data/firebase/client').then((mod) => mod.removeAppointment(uid, id)).catch(() => notifySaveFailed())
        return true
      } catch (caught) {
        return fail(caught)
      }
    },
  }
}
