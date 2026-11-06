// @vitest-environment happy-dom
import { LocalNotifications } from '@capacitor/local-notifications'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { useLingua } from '../i18n/LinguaContext'
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

const ID_PROMEMORIA = 1

function testiInCoda(): (string | undefined)[] {
  return vi.mocked(LocalNotifications.schedule).mock.calls.flatMap((call) =>
    call[0].notifications.filter((voce) => voce.id === ID_PROMEMORIA).map((voce) => voce.body),
  )
}

function SceltaInglese() {
  const { scegli } = useLingua()
  return <button type="button" onClick={() => scegli('en')}>inglese</button>
}

describe('promemoria mensile', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('cambiata la lingua con l’app aperta, il testo in coda si riscrive subito', async () => {
    localStorage.setItem('groomly.lingua', 'it')
    const account = await createAccount('laura@salone.it', 'segretissimo')
    const peggie = createDog(account.uid, {
      name: 'Peggie',
      species: 'cane',
      breed: '',
      ageCategory: 'adulto',
      size: 'piccola',
      temperament: 'bravo',
      clientType: 'mensile',
      contact: { name: '', phone: '3331234' },
    })
    const visita = createAppointment(account.uid, {
      dogId: peggie.id,
      start: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 30 }],
    })
    completeAppointment(account.uid, visita.id)
    const user = userEvent.setup()
    render(<Providers><SceltaInglese /></Providers>)
    await waitFor(() => expect(testiInCoda().at(-1)).toBe('1 mensile da programmare: Peggie'))

    await user.click(screen.getByRole('button', { name: 'inglese' }))

    await waitFor(() => expect(testiInCoda().at(-1)).toBe('1 monthly visit to book: Peggie'))
  })
})
