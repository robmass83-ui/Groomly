// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppointment, listAppointments } from '../data/local/appointments'
import { createDog } from '../data/local/dogs'
import { storageKeys } from '../data/local/storage'
import { claimDogUpload, resetPendingUploads } from '../lib/pendingPhoto'
import type { Appointment, Dog, DogWrite } from '../types/models'
import { useAppointments } from './useAppointments'
import { useDogs } from './useDogs'

const mocks = vi.hoisted(() => ({
  account: { uid: 'rob-uid', email: 'masala.roberto@hotmail.it', salonId: 'shared' } as { uid: string; email: string; salonId: string },
  dogListener: null as ((dogs: Dog[], fromCache?: boolean) => void) | null,
  appointmentListener: null as ((items: Appointment[], fromCache?: boolean) => void) | null,
  saveDog: vi.fn(async (..._args: unknown[]) => undefined),
  removeDog: vi.fn(async (..._args: unknown[]) => undefined),
  saveAppointment: vi.fn(async (..._args: unknown[]) => undefined),
  removeAppointment: vi.fn(async (..._args: unknown[]) => undefined),
}))

vi.mock('./useSession', () => ({
  useSession: () => ({ gate: { kind: 'in', account: mocks.account } }),
}))

vi.mock('../data/firebase/enabled', () => ({
  firebaseEnabled: () => true,
  readsLocal: () => false,
  subscribeSource: () => () => undefined,
  markSalonMirror: () => undefined,
  notifySaveFailed: () => undefined,
}))

vi.mock('../data/firebase/client', () => ({
  listenDogs: async (_uid: string, onData: (dogs: Dog[], fromCache?: boolean) => void) => {
    mocks.dogListener = onData
    return () => undefined
  },
  listenAppointments: async (_uid: string, onData: (items: Appointment[], fromCache?: boolean) => void) => {
    mocks.appointmentListener = onData
    return () => undefined
  },
  saveDog: mocks.saveDog,
  removeDog: mocks.removeDog,
  saveAppointment: mocks.saveAppointment,
  removeAppointment: mocks.removeAppointment,
}))

// Il caricamento in blocco passa da claimDogUpload: lo spio per sapere per quali cani è stato tentato.
vi.mock('../lib/pendingPhoto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/pendingPhoto')>()
  return { ...actual, claimDogUpload: vi.fn(actual.claimDogUpload) }
})

const PHOTO = 'data:image/png;base64,QQ=='
const LAURA = { uid: 'rob-uid', email: 'laura.masala@tiscali.it', salonId: 'shared' }
const ROBERTO = { uid: 'rob-uid', email: 'masala.roberto@hotmail.it', salonId: 'shared' }

function dogWrite(name: string): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Sara', phone: '333' },
  }
}

function visitWrite(dogId: string) {
  return {
    dogId,
    start: new Date('2026-10-03T09:30:00.000Z'),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
  }
}

// Ciò che resta sul telefono sotto l'uid: un cane con foto in attesa, una visita e il secchio delle foto.
function seedPhone() {
  const phoneOnly = createDog('rob-uid', { ...dogWrite('Rex'), photo: PHOTO })
  const visit = createAppointment('rob-uid', visitWrite(phoneOnly.id))
  localStorage.setItem('groomly.pending-photos.rob-uid', JSON.stringify({ [phoneOnly.id]: { photo: PHOTO, gallery: [] } }))
  return { phoneOnly, visit }
}

function cloudDog(name: string): Dog {
  const dog = createDog('cloud-scratch', dogWrite(name))
  localStorage.removeItem(storageKeys.dogs('cloud-scratch'))
  return dog
}

function cloudVisit(dogId: string): Appointment {
  const item = createAppointment('cloud-scratch', visitWrite(dogId))
  localStorage.removeItem(storageKeys.appointments('cloud-scratch'))
  return item
}

function claimedIds(): string[] {
  return vi.mocked(claimDogUpload).mock.calls.map(([, dog]) => dog.id)
}

describe('useDogs e useAppointments per Roberto dentro shared', () => {
  beforeEach(() => {
    localStorage.clear()
    resetPendingUploads()
    mocks.account = ROBERTO
    mocks.dogListener = null
    mocks.appointmentListener = null
    for (const fn of [mocks.saveDog, mocks.removeDog, mocks.saveAppointment, mocks.removeAppointment]) fn.mockClear()
    vi.mocked(claimDogUpload).mockClear()
  })

  it('cani: primo schermo vuoto, niente invio in blocco né segno del telefono, i salvataggi vanno al cloud', async () => {
    const { phoneOnly } = seedPhone()
    const shared = cloudDog('Marcello')
    localStorage.setItem('groomly.deleted', JSON.stringify({ ids: [shared.id], appointmentIds: [] }))
    const { result } = renderHook(() => useDogs('rob-uid'))

    expect(result.current.dogs).toEqual([])
    await waitFor(() => expect(mocks.dogListener).not.toBeNull())
    expect(claimedIds()).not.toContain(phoneOnly.id)
    expect(mocks.saveDog).not.toHaveBeenCalled()

    // Il cane cancellato sul telefono ma presente nel cloud resta visibile; quello solo sul telefono non torna.
    act(() => { mocks.dogListener?.([shared], false) })
    act(() => { mocks.dogListener?.([shared], false) })
    expect(result.current.dogs.map((dog) => dog.id)).toEqual([shared.id])
    expect(claimedIds()).not.toContain(phoneOnly.id)
    expect(mocks.saveDog).not.toHaveBeenCalled()

    let saved = false
    act(() => { saved = result.current.saveNew(dogWrite('Bea')) })
    expect(saved).toBe(true)
    await waitFor(() => expect(mocks.saveDog).toHaveBeenCalledTimes(1))
    const created = result.current.dogs.find((dog) => dog.name === 'Bea')
    expect(created).toBeDefined()
    expect(mocks.saveDog).toHaveBeenLastCalledWith('rob-uid', expect.objectContaining({ id: created?.id }))

    act(() => { result.current.archive(shared.id, 'non_in_cura') })
    await waitFor(() => expect(mocks.saveDog).toHaveBeenCalledTimes(2))
    act(() => { result.current.restore(shared.id) })
    await waitFor(() => expect(mocks.saveDog).toHaveBeenCalledTimes(3))

    act(() => { result.current.remove(created?.id ?? '') })
    await waitFor(() => expect(mocks.removeDog).toHaveBeenCalledWith('rob-uid', created?.id))
    expect(result.current.dogs.some((dog) => dog.id === phoneOnly.id)).toBe(false)
  })

  it('visite: primo schermo vuoto, il segno del telefono non filtra lo snapshot, i salvataggi vanno al cloud', async () => {
    const { visit } = seedPhone()
    const dog = cloudDog('Marcello')
    const shared = cloudVisit(dog.id)
    localStorage.setItem('groomly.deleted', JSON.stringify({ ids: [], appointmentIds: [shared.id] }))
    const { result } = renderHook(() => useAppointments('rob-uid'))

    expect(result.current.appointments).toEqual([])
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    expect(mocks.saveAppointment).not.toHaveBeenCalled()

    act(() => { mocks.appointmentListener?.([shared], false) })
    expect(result.current.appointments.map((item) => item.id)).toEqual([shared.id])
    expect(result.current.appointments.some((item) => item.id === visit.id)).toBe(false)

    let saved = false
    act(() => { saved = result.current.saveNew(visitWrite(dog.id)) })
    expect(saved).toBe(true)
    await waitFor(() => expect(mocks.saveAppointment).toHaveBeenCalledTimes(1))
    const created = result.current.appointments.find((item) => item.id !== shared.id)
    expect(created).toBeDefined()

    act(() => { result.current.remove(created?.id ?? '') })
    await waitFor(() => expect(mocks.removeAppointment).toHaveBeenCalledWith('rob-uid', created?.id))
  })

  it('Laura conserva il primo schermo dal telefono, il segno locale e l’invio in blocco', async () => {
    mocks.account = LAURA
    const { phoneOnly, visit } = seedPhone()
    const shared = cloudDog('Marcello')
    localStorage.setItem('groomly.deleted', JSON.stringify({ ids: [shared.id], appointmentIds: [] }))
    const dogs = renderHook(() => useDogs('rob-uid'))
    const visits = renderHook(() => useAppointments('rob-uid'))

    expect(dogs.result.current.dogs.map((dog) => dog.id)).toEqual([phoneOnly.id])
    expect(visits.result.current.appointments.map((item) => item.id)).toEqual([visit.id])
    expect(claimedIds()).toContain(phoneOnly.id)

    await waitFor(() => expect(mocks.dogListener).not.toBeNull())
    act(() => { mocks.dogListener?.([shared], false) })
    // Il cane del cloud cancellato sul telefono resta nascosto a Laura e quello locale non sparisce.
    expect(dogs.result.current.dogs.map((dog) => dog.id)).not.toContain(shared.id)
    expect(listAppointments('rob-uid')).toHaveLength(1)
  })
})
