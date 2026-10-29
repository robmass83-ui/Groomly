// @vitest-environment happy-dom
import { LocalNotifications } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writePushDevice } from '../data/firebase/client'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { savePushPrefs } from '../data/pushPrefs'
import { Providers } from './providers'
import { PushHost } from './PushHost'

const pushListeners = vi.hoisted(() => new Map<string, (event: any) => void>())
const pushFirebase = vi.hoisted(() => ({ configured: true }))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => true,
  },
  WebPlugin: class {},
  registerPlugin: () => ({
    collega: async () => { throw new Error('telefono') },
    leggi: async () => ({ collegato: false, email: null }),
    scollega: async () => { throw new Error('telefono') },
    carica: async () => { throw new Error('telefono') },
    wifi: async () => ({ wifi: false }),
  }),
}))

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    addListener: vi.fn(async (event: string, listener: (payload: any) => void) => {
      pushListeners.set(event, listener)
      return {
        remove: async () => {
          if (pushListeners.get(event) === listener) pushListeners.delete(event)
        },
      }
    }),
    createChannel: vi.fn(async () => undefined),
    checkPermissions: vi.fn(async () => ({ receive: 'granted' })),
    requestPermissions: vi.fn(async () => ({ receive: 'granted' })),
    register: vi.fn(async () => undefined),
  },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    addListener: vi.fn(async () => ({ remove: async () => {} })),
    cancel: vi.fn(async () => undefined),
    createChannel: vi.fn(async () => undefined),
    checkPermissions: vi.fn(async () => ({ display: 'granted' })),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    schedule: vi.fn(async () => undefined),
    getPending: vi.fn(async () => ({ notifications: [] })),
    getDeliveredNotifications: vi.fn(async () => ({ notifications: [] })),
    removeDeliveredNotificationsById: vi.fn(async () => undefined),
  },
}))

vi.mock('../data/firebase/client', () => ({
  writePushDevice: vi.fn(async () => undefined),
  prendiPushTelefono: vi.fn(async () => undefined),
}))

vi.mock('../lib/pushFirebaseConfigured', () => ({
  get PUSH_FIREBASE_CONFIGURED() {
    return pushFirebase.configured
  },
}))

function Path() {
  return <p>{useLocation().pathname}</p>
}

describe('PushHost', () => {
  beforeEach(() => {
    pushFirebase.configured = true
    localStorage.clear()
    sessionStorage.clear()
    pushListeners.clear()
    vi.clearAllMocks()
    vi.mocked(PushNotifications.checkPermissions).mockResolvedValue({ receive: 'granted' })
    vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' })
    vi.mocked(writePushDevice).mockResolvedValue(undefined)
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({ notifications: [] })
    vi.mocked(LocalNotifications.getDeliveredNotifications).mockResolvedValue({ notifications: [] })
  })

  it('non registra le push quando Firebase non è incluso nella build', async () => {
    const account = await createAccount('no-firebase@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })
    localStorage.setItem('groomly.pushUpdatesReady', '1')
    pushFirebase.configured = false

    render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(localStorage.getItem('groomly.pushUpdatesReady')).toBeNull())
    expect(PushNotifications.register).not.toHaveBeenCalled()
  })

  it('cancella il token del dispositivo quando le push sono spente', async () => {
    const account = await createAccount('off@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: false,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })
    localStorage.setItem('groomly.pushToken', 'token-spento')

    render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(writePushDevice).toHaveBeenCalledWith(
      account.uid,
      expect.any(String),
      null,
    ))
    expect(localStorage.getItem('groomly.pushToken')).toBeNull()
    expect(PushNotifications.register).not.toHaveBeenCalled()
  })

  it('non riscrive il token se la registrazione termina dopo la disattivazione', async () => {
    const account = await createAccount('race@salone.it', 'segretissimo')
    const prefs = {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    }
    savePushPrefs(account.uid, prefs)
    let resolveWrite!: () => void
    const writePending = new Promise<void>((resolve) => {
      resolveWrite = resolve
    })
    vi.mocked(writePushDevice).mockImplementationOnce(async () => writePending)

    render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.register).toHaveBeenCalled())
    await act(async () => {
      pushListeners.get('registration')?.({ value: 'token-in-volo' })
      await Promise.resolve()
    })
    expect(writePushDevice).toHaveBeenCalledWith(
      account.uid,
      expect.any(String),
      { token: 'token-in-volo', appVersion: expect.any(String) },
    )

    act(() => savePushPrefs(account.uid, { ...prefs, enabled: false }))
    await act(async () => resolveWrite())

    await waitFor(() => {
      expect(localStorage.getItem('groomly.pushToken')).toBeNull()
      expect(vi.mocked(writePushDevice).mock.calls.some((call) => call[2] === null)).toBe(true)
    })
  })

  it('richiede di nuovo il permesso dopo un rifiuto e una nuova attivazione', async () => {
    const account = await createAccount('permission@salone.it', 'segretissimo')
    const prefs = {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    }
    vi.mocked(PushNotifications.checkPermissions).mockResolvedValue({ receive: 'prompt' })
    vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'denied' })
    savePushPrefs(account.uid, prefs)

    render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.requestPermissions).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(writePushDevice).toHaveBeenCalledWith(
      account.uid,
      expect.any(String),
      null,
    ))

    act(() => savePushPrefs(account.uid, prefs))

    await waitFor(() => expect(PushNotifications.requestPermissions).toHaveBeenCalledTimes(2))
  })

  it('cancella il token se la registrazione fallisce', async () => {
    const account = await createAccount('error@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })
    localStorage.setItem('groomly.pushToken', 'token-vecchio')

    render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.register).toHaveBeenCalled())
    act(() => pushListeners.get('registrationError')?.({ error: 'fallita' }))

    await waitFor(() => expect(localStorage.getItem('groomly.pushToken')).toBeNull())
    expect(writePushDevice).toHaveBeenCalledWith(account.uid, expect.any(String), null)
  })

  it('non mostra la push da completare se la visita è già chiusa', async () => {
    const account = await createAccount('chiusa@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })
    const ciccio = createDog(account.uid, {
      name: 'Ciccio',
      species: 'cane',
      breed: '',
      ageCategory: 'adulto',
      size: 'piccola',
      temperament: 'bravo',
      clientType: 'occasionale',
      contact: { name: '', phone: '333' },
    })
    const visita = createAppointment(account.uid, {
      dogId: ciccio.id,
      start: new Date(2026, 9, 29, 12, 0, 0, 0),
      services: [{ serviceId: 'toel', name: 'Toelettatura', durationMin: 90, price: 20 }],
    })
    completeAppointment(account.uid, visita.id)

    render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.register).toHaveBeenCalled())
    act(() => pushListeners.get('pushNotificationReceived')?.({
      title: 'Da completare',
      body: 'C’è da completare Ciccio: è passato il tempo dopo la fine dell’appuntamento.',
      data: { type: 'complete', appointmentId: visita.id },
    }))
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('crea una notifica locale solo per una push da completare', async () => {
    const account = await createAccount('complete@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })

    render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.register).toHaveBeenCalled())
    act(() => pushListeners.get('pushNotificationReceived')?.({
      title: 'Da completare',
      body: 'Completa Fido',
      data: { type: 'complete', appointmentId: 'a-complete' },
    }))

    await waitFor(() => expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1))
    expect(LocalNotifications.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({
        title: 'Da completare',
        body: 'Completa Fido',
        channelId: 'da-completare',
        extra: expect.objectContaining({ appointmentId: 'a-complete' }),
      })],
    })

    act(() => pushListeners.get('pushNotificationReceived')?.({
      data: { type: 'update' },
    }))
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1)
  })

  it('segna gli aggiornamenti pronti e cancella la notifica di aggiornamento', async () => {
    const account = await createAccount('updates@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })

    render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.register).toHaveBeenCalled())
    await act(async () => {
      pushListeners.get('registration')?.({ value: 'token-aggiornamenti' })
    })

    await waitFor(() => expect(localStorage.getItem('groomly.pushUpdatesReady')).toBe('1'))
    expect(LocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 2 }],
    })
  })

  it('apre un appuntamento da una push completa senza montare la pagina Notifiche', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })

    render(
      <Providers>
        <MemoryRouter initialEntries={['/']}>
          <PushHost />
          <Routes>
            <Route path="*" element={<Path />} />
          </Routes>
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.register).toHaveBeenCalled())
    expect(screen.getByText('/')).toBeInTheDocument()

    await act(async () => {
      pushListeners.get('pushNotificationActionPerformed')?.({
        notification: {
          data: { type: 'complete', appointmentId: 'a1', url: '/appuntamenti/a1' },
        },
      })
    })

    expect(screen.getByText('/appuntamenti/a1')).toBeInTheDocument()
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('non mostra e non apre il da completare di un altro salone', async () => {
    const account = await createAccount('rob@salone.it', 'segretissimo', { firstName: 'Rob', lastName: 'Mass' })
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({
      notifications: [{ id: 77, title: 'Da completare', body: 'Olaf', extra: { type: 'complete', salonId: 'altro-salone' } }],
    })

    render(
      <Providers>
        <MemoryRouter initialEntries={['/']}>
          <PushHost />
          <Routes>
            <Route path="*" element={<Path />} />
          </Routes>
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.register).toHaveBeenCalled())
    await waitFor(() => expect(LocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 77 }],
    }))
    act(() => pushListeners.get('pushNotificationReceived')?.({
      title: 'Da completare',
      body: 'C’è da completare Olaf: è passato il tempo dopo la fine dell’appuntamento.',
      data: { type: 'complete', appointmentId: 'olaf', url: '/appuntamenti/olaf', salonId: 'altro-salone' },
    }))
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()

    await act(async () => {
      pushListeners.get('pushNotificationActionPerformed')?.({
        notification: {
          data: { type: 'complete', appointmentId: 'olaf', url: '/appuntamenti/olaf', salonId: 'altro-salone' },
        },
      })
    })
    expect(screen.getByText('/')).toBeInTheDocument()

    await act(async () => {
      pushListeners.get('pushNotificationActionPerformed')?.({
        notification: {
          data: { type: 'complete', appointmentId: 'a1', url: '/appuntamenti/a1', salonId: account.salonId },
        },
      })
    })
    expect(screen.getByText('/appuntamenti/a1')).toBeInTheDocument()
  })

  it('stacca tutti i listener se la registrazione termina dopo lo smontaggio', async () => {
    const account = await createAccount('late@salone.it', 'segretissimo')
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })

    let resolveListeners!: () => void
    const listenersReady = new Promise<void>((resolve) => {
      resolveListeners = resolve
    })
    const pushRemoves: Array<ReturnType<typeof vi.fn>> = []
    const localRemoves: Array<ReturnType<typeof vi.fn>> = []

    vi.mocked(PushNotifications.addListener).mockImplementation(() => {
      const remove = vi.fn(async () => undefined)
      pushRemoves.push(remove)
      return listenersReady.then(() => ({ remove })) as ReturnType<typeof PushNotifications.addListener>
    })
    vi.mocked(LocalNotifications.addListener).mockImplementation(() => {
      const remove = vi.fn(async () => undefined)
      localRemoves.push(remove)
      return listenersReady.then(() => ({ remove })) as ReturnType<typeof LocalNotifications.addListener>
    })

    const view = render(
      <Providers>
        <MemoryRouter>
          <PushHost />
        </MemoryRouter>
      </Providers>,
    )

    await waitFor(() => expect(PushNotifications.addListener).toHaveBeenCalled())
    view.unmount()

    await act(async () => {
      resolveListeners()
      await listenersReady
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(pushRemoves.length).toBeGreaterThan(0)
    expect(localRemoves.length).toBeGreaterThan(0)
    await waitFor(() => {
      pushRemoves.forEach((remove) => expect(remove).toHaveBeenCalledTimes(1))
      localRemoves.forEach((remove) => expect(remove).toHaveBeenCalledTimes(1))
    })
  })
})
