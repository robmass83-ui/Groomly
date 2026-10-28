// @vitest-environment happy-dom
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppointment, setAppointmentStatus } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { notifyLocalWrite } from '../lib/dataRefresh'
import { idNotifica } from '../lib/orarioScaduto'
import type { DogWrite } from '../types/models'
import { Providers } from './providers'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
  WebPlugin: class {},
  registerPlugin: () => ({}),
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
    createChannel: vi.fn(async () => undefined),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    schedule: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
    removeDeliveredNotificationsById: vi.fn(async () => undefined),
  },
}))

function cane(name: string): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
  }
}

function visitaTraUnOra(uid: string, dogId: string) {
  return createAppointment(uid, {
    dogId,
    start: new Date(Date.now() + 60 * 60 * 1000),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 30 }],
  })
}

function haAnnullato(idVisita: string): boolean {
  const atteso = idNotifica(idVisita)
  return vi.mocked(LocalNotifications.cancel).mock.calls.some((call) =>
    call[0].notifications.some((voce) => voce.id === atteso),
  )
}

describe('avviso orario scaduto', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(LocalNotifications.schedule).mockClear()
    vi.mocked(LocalNotifications.cancel).mockClear()
    vi.mocked(LocalNotifications.removeDeliveredNotificationsById).mockClear()
  })

  it('non lascia suonare l’avviso se la visita viene chiusa dopo essere stata messa in coda', async () => {
    const account = await createAccount('laura@salone.it', 'segretissimo')
    const peggie = createDog(account.uid, cane('Peggie'))
    const visita = visitaTraUnOra(account.uid, peggie.id)
    render(<Providers><span>app</span></Providers>)
    await waitFor(() => {
      const ricordate = localStorage.getItem(`groomly.orario-scaduto.${account.uid}`)
      expect(ricordate).toContain(visita.id)
    })
    expect(haAnnullato(visita.id)).toBe(false)

    setAppointmentStatus(account.uid, visita.id, 'completato')
    notifyLocalWrite()

    await waitFor(() => expect(haAnnullato(visita.id)).toBe(true))
    expect(localStorage.getItem(`groomly.orario-scaduto.${account.uid}`)).not.toContain(visita.id)
  })
})
