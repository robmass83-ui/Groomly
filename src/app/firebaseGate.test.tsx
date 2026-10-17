// @vitest-environment happy-dom
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as firebaseClient from '../data/firebase/client'
import { markCloudReady } from '../data/firebase/enabled'
import { createAccount, type LocalAccount } from '../data/local/auth'
import { createAppointment } from '../data/local/appointments'
import { createDog } from '../data/local/dogs'
import { blankSettings, type SettingsMain } from '../data/local/settings'
import { createService } from '../data/local/services'
import { storageKeys } from '../data/local/storage'
import { SERVICE_SEED } from '../data/seed/services'
import type { Appointment, Dog, Service } from '../types/models'
import { App } from './App'

const cloud = vi.hoisted(() => ({
  mode: 'in' as 'in' | 'pending' | 'fail',
  onAccount: null as ((account: LocalAccount | null) => void) | null,
  dogListeners: new Set<(dogs: Dog[], fromCache?: boolean) => void>(),
  appointmentListeners: new Set<(items: Appointment[], fromCache?: boolean) => void>(),
  serviceListeners: new Set<(services: Service[], fromCache?: boolean) => void>(),
  settingsListeners: new Set<(settings: SettingsMain) => void>(),
  saveDog: vi.fn((_uid: string, _dog: Dog): Promise<void> => Promise.resolve()),
  saveAppointment: vi.fn((_uid: string, _item: Appointment): Promise<void> => Promise.resolve()),
  replaceCloudData: vi.fn((_uid: string, _bundle: unknown): Promise<void> => Promise.resolve()),
  appointments: [] as Appointment[],
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  initializeFirestore: () => ({}),
  persistentLocalCache: () => ({}),
  persistentMultipleTabManager: () => ({}),
  doc: () => ({}),
  collection: () => ({}),
  setDoc: async () => undefined,
  updateDoc: async () => undefined,
  getDoc: async () => ({ exists: () => false, data: () => undefined }),
  getDocs: async () => ({ docs: [] }),
  deleteDoc: async () => undefined,
  onSnapshot: () => () => undefined,
}))

vi.mock('firebase/app', () => ({
  getApps: () => [{}],
  initializeApp: () => ({}),
}))

vi.mock('firebase/storage', () => ({
  getStorage: () => ({}),
  ref: () => ({}),
  uploadString: async () => undefined,
  getDownloadURL: async () => 'https://example.test/file',
}))

vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  onAuthStateChanged: () => () => undefined,
  createUserWithEmailAndPassword: async () => ({ user: {} }),
  signInWithEmailAndPassword: async () => ({ user: {} }),
  signOut: async () => undefined,
}))

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value })
}

function birba(patch: Partial<Dog> = {}): Dog {
  return {
    id: 'cane-1',
    name: 'Birba',
    species: 'cane',
    breed: 'Lagotto',
    ageCategory: 'adulto',
    size: 'media',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Sara', phone: '333' },
    contacts: [{ id: 'c1', name: 'Sara', role: 'Proprietaria', phone: '333', isPrimary: true }],
    tags: [],
    servicePrices: [],
    hiddenServiceIds: [],
    customFields: [],
    gallery: [],
    status: 'attivo',
    searchKey: 'birba',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    birthYear: 2019,
    weightKg: 12.5,
    isSenior: false,
    ...patch,
  }
}

describe('gate Firebase', () => {
  beforeAll(() => {
    vi.spyOn(firebaseClient, 'watchAuth').mockImplementation(async (onAccount) => {
      cloud.onAccount = onAccount
      if (cloud.mode === 'fail') throw new Error('boot')
      if (cloud.mode === 'pending') return () => undefined
      const { getAccount } = await import('../data/local/auth')
      onAccount(getAccount())
      return () => undefined
    })
    vi.spyOn(firebaseClient, 'listenDogs').mockImplementation(async (_uid, onData) => {
      cloud.dogListeners.add(onData)
      return () => { cloud.dogListeners.delete(onData) }
    })
    vi.spyOn(firebaseClient, 'listenAppointments').mockImplementation(async (_uid, onData) => {
      cloud.appointmentListeners.add(onData)
      onData([...cloud.appointments])
      return () => { cloud.appointmentListeners.delete(onData) }
    })
    vi.spyOn(firebaseClient, 'listenServices').mockImplementation(async (_uid, onData) => {
      cloud.serviceListeners.add(onData)
      return () => { cloud.serviceListeners.delete(onData) }
    })
    vi.spyOn(firebaseClient, 'listenSettings').mockImplementation(async (_uid, onData) => {
      cloud.settingsListeners.add(onData)
      const { blankSettings } = await import('../data/local/settings')
      onData(blankSettings('auto', '2026-01-01T00:00:00.000Z'))
      return () => { cloud.settingsListeners.delete(onData) }
    })
    vi.spyOn(firebaseClient, 'saveDog').mockImplementation((uid, dog) => cloud.saveDog(uid, dog))
    vi.spyOn(firebaseClient, 'saveAppointment').mockImplementation((uid, item) => cloud.saveAppointment(uid, item))
    vi.spyOn(firebaseClient, 'saveSettings').mockResolvedValue(undefined)
    vi.spyOn(firebaseClient, 'replaceCloudData').mockImplementation((uid, bundle) => cloud.replaceCloudData(uid, bundle))
    vi.spyOn(firebaseClient, 'runCloudDailyBackup').mockResolvedValue(undefined)
    vi.spyOn(firebaseClient, 'enqueueBackup').mockImplementation(() => undefined)
    vi.spyOn(firebaseClient, 'loadCloudBackup').mockResolvedValue({ dogs: {}, appointments: {}, services: {}, settings: {} })
    vi.spyOn(firebaseClient, 'removeDog').mockResolvedValue(undefined)
    vi.spyOn(firebaseClient, 'removeAppointment').mockResolvedValue(undefined)
  })

  beforeEach(() => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
    localStorage.clear()
    cloud.mode = 'in'
    cloud.onAccount = null
    cloud.dogListeners.clear()
    cloud.appointmentListeners.clear()
    cloud.serviceListeners.clear()
    cloud.settingsListeners.clear()
    cloud.appointments = []
    cloud.saveDog.mockClear()
    cloud.saveAppointment.mockClear()
    cloud.replaceCloudData.mockReset()
    cloud.replaceCloudData.mockResolvedValue(undefined)
    markCloudReady()
    setOnline(true)
  })

  it('gli snapshot del salone segnano la copia locale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/" />)
    await waitFor(() => {
      expect(cloud.dogListeners.size).toBeGreaterThan(0)
      expect(cloud.appointmentListeners.size).toBeGreaterThan(0)
    })
    await act(async () => {
      for (const listener of cloud.appointmentListeners) listener([])
    })
    expect(localStorage.getItem(`groomly.mirror.${account.uid}`)).toBe('1')
    localStorage.removeItem(`groomly.mirror.${account.uid}`)
    await act(async () => {
      for (const listener of cloud.dogListeners) listener([birba()])
    })
    expect(localStorage.getItem(`groomly.mirror.${account.uid}`)).toBe('1')
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain('Birba')
  })

  it('un link profondo si apre subito se l’accesso è già sul telefono', async () => {
    cloud.mode = 'pending'
    const account = await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali/cane-1" />)
    expect(screen.queryByRole('heading', { name: 'Crea accesso' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entra' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByText('Cane assente')).toBeInTheDocument()
    await act(async () => { cloud.onAccount?.(account) })
    expect(screen.getByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Crea accesso' })).not.toBeInTheDocument()
  })

  it('se watchAuth non parte si vede l’accesso e non una pagina bianca', async () => {
    cloud.mode = 'fail'
    render(<App memory isDev={false} initialPath="/animali/cane-1" />)
    expect(await screen.findByRole('heading', { name: 'Crea accesso' })).toBeInTheDocument()
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
  })

  it('con l’accesso ricordato non mostra il login mentre Firebase risponde', async () => {
    cloud.mode = 'pending'
    const account = await createAccount('laura.masala@tiscali.it', 'segretissimo')
    localStorage.removeItem(storageKeys.session)
    localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: account.uid, email: account.email }))
    render(<App memory isDev={false} initialPath="/" />)
    expect(screen.getByText('Ciao Laura')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Caricamento Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entra' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Crea accesso' })).not.toBeInTheDocument()
    await waitFor(() => expect(cloud.onAccount).not.toBeNull())
    await act(async () => { cloud.onAccount?.(account) })
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Caricamento Groomly' })).not.toBeInTheDocument()
  })

  it('l’accesso Firebase si ricorda e la risposta senza utente lo dimentica', async () => {
    cloud.mode = 'pending'
    const account = await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/" />)
    await waitFor(() => expect(cloud.onAccount).not.toBeNull())
    await act(async () => { cloud.onAccount?.(account) })
    expect(JSON.parse(localStorage.getItem('groomly.lastSignIn')!)).toEqual({ uid: account.uid, email: 'maria@salone.it' })
    await act(async () => { cloud.onAccount?.(null) })
    expect(localStorage.getItem('groomly.lastSignIn')).toBeNull()
  })

  it('se Firebase non risponde entro 10 secondi compare il login', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      cloud.mode = 'pending'
      localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: 'fb-1', email: 'robmass83@gmail.com' }))
      render(<App memory isDev={false} initialPath="/" />)
      expect(screen.getByText('Ciao Roberto')).toBeInTheDocument()
      expect(screen.getByRole('status', { name: 'Caricamento Groomly' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Crea accesso' })).not.toBeInTheDocument()
      await act(async () => { vi.advanceTimersByTime(10_000) })
      expect(await screen.findByRole('heading', { name: 'Crea accesso' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('prima che il cane arrivi Salva non scrive un cane vuoto, poi il modulo mostra i dati e uno snapshot non li cancella', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/cane-1" />)
    expect(await screen.findByText('Cane assente')).toBeInTheDocument()
    const earlySave = screen.queryByRole('button', { name: 'Salva' })
    if (earlySave) await user.click(earlySave)
    expect(cloud.saveDog).not.toHaveBeenCalled()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeNull()
    await waitFor(() => expect(cloud.dogListeners.size).toBeGreaterThanOrEqual(2))
    await act(async () => {
      for (const listener of cloud.dogListeners) listener([birba()])
    })
    expect(await screen.findByText('Birba')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Birba')
    expect(screen.getByLabelText('Razza')).toHaveValue('Lagotto')
    expect(screen.getByLabelText('Peso')).toHaveValue('12,5')
    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Nube')
    await user.clear(screen.getByLabelText('Razza'))
    await user.type(screen.getByLabelText('Razza'), 'Spinone')
    await user.clear(screen.getByLabelText('Peso'))
    await user.type(screen.getByLabelText('Peso'), '9,5')
    await act(async () => {
      for (const listener of cloud.dogListeners) listener([birba({ updatedAt: new Date('2026-02-02T00:00:00.000Z') })])
    })
    expect(screen.getByLabelText('Nome')).toHaveValue('Nube')
    expect(screen.getByLabelText('Razza')).toHaveValue('Spinone')
    expect(screen.getByLabelText('Peso')).toHaveValue('9,5')
    expect(cloud.saveDog).not.toHaveBeenCalled()
  })

  it('un prezzo personalizzato cambiato resta dopo aver lasciato la lista, anche se torna lo snapshot vecchio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const at = new Date('2026-01-01T00:00:00.000Z')
    const services = SERVICE_SEED.map((service) => ({ ...service, createdAt: at, updatedAt: at }))
    const oldDog = birba({
      servicePrices: [
        { serviceId: 'bagno', price: 25 },
        { serviceId: 'dermatologico', price: 15 },
      ],
      hiddenServiceIds: ['bagno', 'dermatologico'],
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    })
    render(<App memory isDev={false} initialPath="/animali/cane-1" />)
    await waitFor(() => {
      expect(cloud.dogListeners.size).toBeGreaterThan(0)
      expect(cloud.serviceListeners.size).toBeGreaterThan(0)
    })
    await act(async () => {
      for (const listener of cloud.serviceListeners) listener(services)
      for (const listener of cloud.dogListeners) listener([oldDog])
    })
    expect(await screen.findByText('€ 25')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Prezzi personalizzati' }))
    await user.clear(screen.getByLabelText('Prezzo Bagno'))
    await user.type(screen.getByLabelText('Prezzo Bagno'), '40')
    await user.clear(screen.getByLabelText('Prezzo Dermatologico'))
    await user.type(screen.getByLabelText('Prezzo Dermatologico'), '22')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    expect(screen.getByText('€ 40')).toBeInTheDocument()
    const written = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)['cane-1'] as { servicePrices: { serviceId: string; price: number }[] }
    expect(written.servicePrices).toEqual([
      { serviceId: 'bagno', price: 40 },
      { serviceId: 'dermatologico', price: 22 },
    ])
    await act(async () => {
      for (const listener of cloud.dogListeners) listener([oldDog])
    })
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
    await user.click(await screen.findByRole('link', { name: 'Home' }))
    await user.click(await screen.findByRole('link', { name: 'Animali' }))
    await user.click(await screen.findByRole('button', { name: 'Apri Birba' }))
    expect(await screen.findByText('€ 40')).toBeInTheDocument()
    expect(screen.getByText('€ 22')).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)['cane-1'] as { servicePrices: { serviceId: string; price: number }[] }
    expect(stored.servicePrices).toEqual([
      { serviceId: 'bagno', price: 40 },
      { serviceId: 'dermatologico', price: 22 },
    ])
  })

  it('Completato in cloud scrive actualDurationMin e lo snapshot resta la copia locale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const start = new Date(2026, 9, 3, 9, 30, 0, 0)
    cloud.appointments = [{
      id: 'appt-1',
      dogId: 'cane-1',
      start,
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      status: 'programmato',
      createdAt: start,
      updatedAt: start,
    }]
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/appt-1" />)
    await waitFor(() => expect(cloud.appointmentListeners.size).toBeGreaterThanOrEqual(1))
    await act(async () => {
      for (const listener of cloud.appointmentListeners) listener([...cloud.appointments])
    })
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    expect(cloud.saveAppointment).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'POS' }))
    await user.click(await screen.findByRole('button', { name: 'Nessuna modifica' }))
    await waitFor(() => expect(cloud.saveAppointment).toHaveBeenCalled())
    const saved = cloud.saveAppointment.mock.calls.map((call) => call[1])
    expect(saved.some((item) => item.actualDurationMin === 30 && item.id === 'appt-1')).toBe(true)
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toContain('appt-1')
  })

  it('il ripristino cloud offline non parte, un secondo tocco non rilancia, e il fallimento si può ripetere', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    const file = new File([JSON.stringify({
      dogs: { a: { name: 'Nube' } },
      appointments: {},
      services: { s: { name: 'Bagno' } },
      settings: { theme: 'auto', updatedAt: '2026-01-01T00:00:00.000Z' },
    })], 'groomly-backup.json', { type: 'application/json' })
    setOnline(false)
    await user.upload(screen.getByLabelText('Scegli backup'), file)
    const offlineDialog = await screen.findByRole('dialog', { name: 'Ripristina' })
    await user.click(within(offlineDialog).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByText('Connessione assente')).toBeInTheDocument()
    expect(cloud.replaceCloudData).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()

    setOnline(true)
    let release: () => void = () => undefined
    cloud.replaceCloudData.mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))
    await user.click(within(screen.getByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    await waitFor(() => expect(cloud.replaceCloudData).toHaveBeenCalledTimes(1))
    const busy = within(screen.getByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' })
    expect(busy).toBeDisabled()
    await user.click(busy).catch(() => undefined)
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(cloud.replaceCloudData).toHaveBeenCalledTimes(1)
    release()
    expect(await screen.findByText('Ripristinato')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Ripristina' })).not.toBeInTheDocument()

    cloud.replaceCloudData.mockRejectedValueOnce(new Error('rete'))
    await user.upload(screen.getByLabelText('Scegli backup'), file)
    const failed = await screen.findByRole('dialog', { name: 'Ripristina' })
    await user.click(within(failed).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByText('Ripristino incompleto, riprova')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
    cloud.replaceCloudData.mockResolvedValueOnce(undefined)
    await user.click(within(screen.getByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByText('Ripristinato')).toBeInTheDocument()
    expect(cloud.replaceCloudData).toHaveBeenCalledTimes(3)
  })

  it('uno snapshot di cani vuoto dalla cache non sostituisce il cane e non segna la lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const dog = createDog(account.uid, {
      name: 'Birba',
      species: 'cane',
      breed: '',
      ageCategory: 'adulto',
      size: 'media',
      temperament: 'bravo',
      clientType: 'occasionale',
      contact: { name: 'Sara', phone: '333' },
    })
    const appointment = createAppointment(account.uid, {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    cloud.appointments = [appointment]
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByText('Birba')).toBeInTheDocument()
    await waitFor(() => expect(cloud.dogListeners.size).toBeGreaterThan(0))
    const dogsBefore = localStorage.getItem(storageKeys.dogs(account.uid))
    const visitsBefore = localStorage.getItem(storageKeys.appointments(account.uid))
    await act(async () => {
      for (const listener of cloud.dogListeners) listener([], true)
      for (const listener of cloud.appointmentListeners) listener([], true)
    })
    expect(screen.getByText('Birba')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBe(dogsBefore)
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBe(visitsBefore)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1700))
    })
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toContain(appointment.id)
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain('Birba')
  })

  it('servizi e listino dello snapshot restano sul telefono, la cache vuota no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createService(account.uid, {
      name: 'Bagno speciale',
      kind: 'principale',
      durationMin: { piccola: 30, media: 45, grande: 60 },
      price: { piccola: 20, media: 28, grande: 38 },
      active: true,
    })
    render(<App memory isDev={false} initialPath="/impostazioni/servizi" />)
    expect(await screen.findByText('Bagno speciale')).toBeInTheDocument()
    await waitFor(() => expect(cloud.serviceListeners.size).toBeGreaterThan(0))
    const before = localStorage.getItem(storageKeys.services(account.uid))
    await act(async () => {
      for (const listener of cloud.serviceListeners) listener([], true)
    })
    expect(screen.getByText('Bagno speciale')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.services(account.uid))).toBe(before)
    const cloudService: Service = {
      id: 'bagno',
      name: 'Dal salone',
      kind: 'principale',
      durationMin: { piccola: 30, media: 45, grande: 60 },
      price: { piccola: 80, media: 90, grande: 100 },
      order: 0,
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    }
    await act(async () => {
      for (const listener of cloud.serviceListeners) listener([cloudService])
    })
    expect(localStorage.getItem(storageKeys.services(account.uid))).toContain('Dal salone')
    const settings = blankSettings('auto', '2026-01-01T00:00:00.000Z')
    settings.priceList = {
      id: 'listino',
      fileName: 'listino.pdf',
      mime: 'application/pdf',
      byteSize: 12,
      uploadedAt: '2026-01-01T00:00:00.000Z',
      dataUrl: 'https://files.example/listino.pdf',
    }
    await act(async () => {
      for (const listener of cloud.settingsListeners) listener(settings)
    })
    expect(localStorage.getItem(storageKeys.settings(account.uid))).toContain('https://files.example/listino.pdf')
  })
})
