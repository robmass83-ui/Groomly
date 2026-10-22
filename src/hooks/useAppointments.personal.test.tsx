// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listAppointments } from '../data/local/appointments'
import { readDeletion, resetSessionAppointmentDeletions } from '../lib/tombstone'
import { storageKeys } from '../data/local/storage'
import type { Appointment } from '../types/models'
import { useAppointments } from './useAppointments'

const mocks = vi.hoisted(() => ({
  appointmentListener: null as ((items: Appointment[], fromCache?: boolean, deletedAppointmentIds?: readonly string[]) => void) | null,
  removeAppointment: vi.fn(async (..._args: unknown[]) => undefined),
}))

vi.mock('./useSession', () => ({
  useSession: () => ({ gate: { kind: 'out' } }),
}))

vi.mock('../data/firebase/enabled', () => ({
  firebaseEnabled: () => true,
  readsLocal: () => false,
  subscribeSource: () => () => undefined,
  markSalonMirror: () => undefined,
  notifySaveFailed: () => undefined,
}))

vi.mock('../data/firebase/client', () => ({
  listenAppointments: async (_uid: string, onData: (items: Appointment[], fromCache?: boolean, deletedAppointmentIds?: readonly string[]) => void) => {
    mocks.appointmentListener = onData
    return () => undefined
  },
  removeAppointment: (...args: unknown[]) => mocks.removeAppointment(...args),
  saveAppointment: vi.fn(async () => undefined),
}))

function personal(): Appointment {
  return {
    id: 'p1',
    kind: 'personale',
    title: 'Dentista',
    dogId: '',
    start: new Date(2026, 9, 21, 18, 0),
    plannedEnd: new Date(2026, 9, 21, 19, 0),
    services: [],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

function personalOn(id: string, day: number): Appointment {
  return {
    ...personal(),
    id,
    title: id,
    start: new Date(2026, 9, day, 18, 0),
    plannedEnd: new Date(2026, 9, day, 19, 0),
  }
}

function visit(id: string, dogId: string): Appointment {
  return {
    id,
    dogId,
    start: new Date(2026, 9, 21, 9, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

describe('appuntamento personale nel hook', () => {
  beforeEach(() => {
    localStorage.clear()
    resetSessionAppointmentDeletions()
    mocks.appointmentListener = null
    mocks.removeAppointment.mockClear()
  })

  it('dopo lo snapshot un personale resta personale e una visita senza kind non lo inventa', async () => {
    renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    act(() => {
      mocks.appointmentListener?.([personal(), visit('v1', 'dog-1')], false)
    })

    const kept = listAppointments('uid-1').find((item) => item.id === 'p1')
    expect(kept).toMatchObject({ kind: 'personale', title: 'Dentista' })
    expect(kept?.plannedEnd).toEqual(new Date(2026, 9, 21, 19, 0))

    const raw = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!) as Record<string, { kind?: string }>
    expect(raw.v1.kind).toBeUndefined()
  })

  it('non passa un personale alla cancellazione quando i cani sono noti e il dog id è vuoto', async () => {
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    act(() => {
      mocks.appointmentListener?.([personal(), visit('gone', 'missing-dog'), visit('live', 'dog-1')], false)
    })

    act(() => {
      result.current.dropMissing(new Set(['dog-1']), new Set(['p1', 'gone', 'live']))
    })

    await waitFor(() => expect(mocks.removeAppointment).toHaveBeenCalled())
    const deleted = mocks.removeAppointment.mock.calls.map((call) => call[1])
    expect(deleted).toContain('gone')
    expect(deleted).not.toContain('p1')
    expect(result.current.appointments.map((item) => item.id)).toContain('p1')
    expect(listAppointments('uid-1').map((item) => item.id)).toContain('p1')
  })

  it('eliminare un personale lo toglie dal calendario e uno snapshot vecchio non lo riporta', async () => {
    const calendar = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    act(() => {
      mocks.appointmentListener?.([personal()], false)
    })
    const sheet = renderHook(() => useAppointments('uid-1'))
    expect(calendar.result.current.appointments.map((item) => item.id)).toContain('p1')
    expect(sheet.result.current.appointments.map((item) => item.id)).toContain('p1')

    act(() => {
      expect(sheet.result.current.remove('p1')).toBe(true)
    })

    expect(sheet.result.current.appointments.map((item) => item.id)).not.toContain('p1')
    expect(calendar.result.current.appointments.map((item) => item.id)).not.toContain('p1')
    expect(readDeletion().appointmentIds).toContain('p1')

    act(() => {
      mocks.appointmentListener?.([personal()], false)
    })
    expect(calendar.result.current.appointments.map((item) => item.id)).not.toContain('p1')
    expect(sheet.result.current.appointments.map((item) => item.id)).not.toContain('p1')
  })

  it('una cache parziale non toglie il personale di un altro giorno', async () => {
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    const monday = personalOn('p-lun', 20)
    const tuesday = personalOn('p-mar', 21)
    act(() => {
      mocks.appointmentListener?.([monday, tuesday], false)
    })

    act(() => {
      mocks.appointmentListener?.([monday], true)
    })

    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-lun', 'p-mar'])
    expect(listAppointments('uid-1').map((item) => item.id).sort()).toEqual(['p-lun', 'p-mar'])
  })

  it('la prima cache non sostituisce i personali già sul telefono', async () => {
    const created = new Date(2026, 9, 1).toISOString()
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      'p-lun': { id: 'p-lun', kind: 'personale', title: 'Lun', start: new Date(2026, 9, 20, 18, 0).toISOString(), createdAt: created, updatedAt: created },
      'p-mar': { id: 'p-mar', kind: 'personale', title: 'Mar', start: new Date(2026, 9, 21, 18, 0).toISOString(), createdAt: created, updatedAt: created },
    }))
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())

    act(() => {
      mocks.appointmentListener?.([personalOn('p-lun', 20)], true)
    })

    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-lun', 'p-mar'])
  })

  it('dopo una cancellazione la cache e uno snapshot intero non riportano quel personale e tengono l’altro', async () => {
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    const monday = personalOn('p-lun', 20)
    const tuesday = personalOn('p-mar', 21)
    act(() => {
      mocks.appointmentListener?.([monday, tuesday], false)
    })
    act(() => {
      expect(result.current.remove('p-lun')).toBe(true)
    })

    act(() => {
      mocks.appointmentListener?.([tuesday], true)
    })
    act(() => {
      mocks.appointmentListener?.([monday, tuesday], false)
    })

    expect(result.current.appointments.map((item) => item.id)).toEqual(['p-mar'])
    expect(listAppointments('uid-1').map((item) => item.id)).toEqual(['p-mar'])
  })

  it('uno snapshot del server con solo il personale nuovo tiene gli altri e non riporta l’eliminato', async () => {
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    const monday = personalOn('p-lun', 20)
    const tuesday = personalOn('p-mar', 21)
    const wednesday = personalOn('p-mer', 22)
    act(() => {
      mocks.appointmentListener?.([monday, tuesday, wednesday], false)
    })
    act(() => {
      expect(result.current.remove('p-lun')).toBe(true)
    })
    let saved = false
    act(() => {
      saved = result.current.saveNew({
        dogId: '',
        start: new Date(2026, 9, 23, 11, 0),
        services: [],
        kind: 'personale',
        title: 'Nuovo',
      })
    })
    expect(saved).toBe(true)
    const created = result.current.appointments.find((item) => item.title === 'Nuovo')
    expect(created).toBeDefined()

    act(() => {
      mocks.appointmentListener?.([created as Appointment], false)
    })

    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-mar', 'p-mer', created?.id].sort())
    expect(listAppointments('uid-1').map((item) => item.id).sort()).toEqual(['p-mar', 'p-mer', created?.id].sort())

    act(() => {
      mocks.appointmentListener?.([monday, created as Appointment], false)
    })
    expect(result.current.appointments.map((item) => item.id)).not.toContain('p-lun')
    expect(result.current.appointments.map((item) => item.id)).toContain('p-mar')
    expect(result.current.appointments.map((item) => item.id)).toContain('p-mer')
  })

  it('uno snapshot del server con una sola visita tiene i personali e toglie la visita assente', async () => {
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    const monday = personalOn('p-lun', 20)
    const tuesday = personalOn('p-mar', 21)
    const first = visit('v1', 'dog-1')
    const second = visit('v2', 'dog-2')
    act(() => {
      mocks.appointmentListener?.([monday, tuesday, first, second], false)
    })
    act(() => {
      mocks.appointmentListener?.([first], false)
    })
    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-lun', 'p-mar', 'v1'])
  })
})
