import { useRef, useState } from 'react'
import { AppError } from '../data/errors'
import { createAppointment, deleteAppointment, listAppointments, updateAppointment } from '../data/local/appointments'
import type { Appointment, AppointmentWrite } from '../types/models'

export function useAppointments(uid: string) {
  const [appointments, setAppointments] = useState<Appointment[]>(() => listAppointments(uid))
  const [error, setError] = useState<string | null>(null)
  const lastCreatedId = useRef<string | null>(null)

  function guard(action: () => void): boolean {
    try {
      action()
      setAppointments(listAppointments(uid))
      setError(null)
      return true
    } catch (caught) {
      if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'appointment_missing')) {
        setError('Salvataggio non riuscito')
      }
      return false
    }
  }

  return {
    appointments,
    error,
    lastCreatedId,
    saveNew(input: AppointmentWrite) {
      return guard(() => {
        lastCreatedId.current = createAppointment(uid, input).id
      })
    },
    saveExisting(id: string, input: AppointmentWrite) {
      return guard(() => {
        updateAppointment(uid, id, input)
      })
    },
    remove(id: string) {
      return guard(() => {
        deleteAppointment(uid, id)
      })
    },
  }
}
