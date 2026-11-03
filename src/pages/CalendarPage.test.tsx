// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAppointment } from '../data/local/appointments'
import { createAccount, getAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { storageKeys, writeJson } from '../data/local/storage'
import { daySegments, topEtichettaChiusura } from '../lib/calendarLayout'
import type { SalonAccess } from '../lib/salonRoster'
import { SIZES } from '../theme/sizes'
import type { DogWrite } from '../types/models'

const salonDesk = vi.hoisted(() => ({ access: null as unknown }))

vi.mock('../data/firebase/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/firebase/client')>()
  return {
    ...actual,
    watchSalonAccess: async (_salonId: string, onChange: (access: unknown) => void) => {
      onChange(salonDesk.access)
      return () => {}
    },
  }
})

function dog(name: string): DogWrite {
  return { name, species: 'cane', breed: '', ageCategory: 'adulto', size: 'piccola', temperament: 'bravo', clientType: 'occasionale', contact: { name: '', phone: '333' } }
}

const bagno = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]

function accessCon(ownerUid: string): SalonAccess {
  return {
    enabled: true,
    openInviteExpiries: [],
    members: [
      { uid: ownerUid, email: 'maria@salone.it', role: 'titolare', firstName: 'Maria', lastName: 'Verdi', status: 'attivo' },
      { uid: 'anna', email: 'anna@salone.it', role: 'collaboratore', firstName: 'Anna', lastName: 'Rossi', status: 'attivo' },
      { uid: 'teo', email: 'teo@salone.it', role: 'socio', firstName: 'Teo', lastName: 'Bianchi', status: 'attivo' },
    ],
  }
}

async function seed() {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const uid = account.uid
  const rex = createDog(uid, dog('Rex'))
  const zeus = createDog(uid, dog('Zeus'))
  const luna = createDog(uid, dog('Luna'))
  createAppointment(uid, { dogId: rex.id, start: new Date(2026, 9, 5, 9, 0), services: bagno, assigneeUid: 'anna' })
  createAppointment(uid, { dogId: zeus.id, start: new Date(2026, 9, 5, 11, 0), services: bagno, assigneeUid: 'teo' })
  createAppointment(uid, { dogId: luna.id, start: new Date(2026, 9, 5, 14, 0), services: bagno })
  return uid
}

describe('Calendario con il Salone: persona della visita e filtro', () => {
  beforeEach(async () => {
    localStorage.clear()
    salonDesk.access = { enabled: false, members: [], openInviteExpiries: [] }
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
    const client = await import('../data/firebase/client')
    vi.spyOn(client, 'watchAuth').mockImplementation(async () => () => {})
    vi.spyOn(client, 'listenClosures').mockImplementation(async () => () => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('con due persone: chip Tutti e nomi, il tocco filtra, la scelta resta e la visita mostra le iniziali', async () => {
    const uid = await seed()
    salonDesk.access = accessCon(uid)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const filtro = await screen.findByRole('group', { name: 'Filtra per persona' })
    expect(within(filtro).getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(filtro).getByRole('button', { name: 'Anna Rossi' })).toBeInTheDocument()
    expect(within(filtro).getByRole('button', { name: 'Teo Bianchi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Apri Rex/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Apri Zeus/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Apri Luna/ })).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /^Apri Rex/ })).getByLabelText('Visita di Anna Rossi')).toHaveTextContent('AR')
    expect(within(screen.getByRole('button', { name: /^Apri Zeus/ })).getByLabelText('Visita di Teo Bianchi')).toHaveTextContent('TB')
    expect(within(screen.getByRole('button', { name: /^Apri Luna/ })).getByLabelText('Visita di Maria Verdi')).toHaveTextContent('MV')

    await user.click(within(filtro).getByRole('button', { name: 'Anna Rossi' }))
    expect(screen.getByRole('button', { name: /^Apri Rex/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Apri Zeus/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Apri Luna/ })).not.toBeInTheDocument()

    cleanup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const dopo = await screen.findByRole('group', { name: 'Filtra per persona' })
    expect(within(dopo).getByRole('button', { name: 'Anna Rossi' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: /^Apri Zeus/ })).not.toBeInTheDocument()
  })

  it('anche la Settimana mostra le iniziali e segue il filtro', async () => {
    const uid = await seed()
    salonDesk.access = accessCon(uid)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=settimana" />)
    const filtro = await screen.findByRole('group', { name: 'Filtra per persona' })
    expect(within(screen.getByRole('button', { name: /^Apri Rex/ })).getByLabelText('Visita di Anna Rossi')).toHaveTextContent('AR')
    await user.click(within(filtro).getByRole('button', { name: 'Teo Bianchi' }))
    expect(screen.getByRole('button', { name: /^Apri Zeus/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Apri Rex/ })).not.toBeInTheDocument()
  })

  it('Giorno vuoto: l’etichetta 19:00 sta come le altre ore e la colonna delle ore non la ritaglia', async () => {
    await seed()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-06" />)
    const chiusura = await screen.findByText('19:00')
    const { segments, height } = daySegments([], SIZES.calendar.startHour, SIZES.calendar.endHour)
    const atteso = topEtichettaChiusura(segments, height)
    expect(atteso).toBeGreaterThan(height)
    expect(parseFloat(chiusura.style.top)).toBe(atteso)
    expect(chiusura.style.transform).toBe('translateY(-50%)')
    const colonna = chiusura.parentElement as HTMLElement
    expect(parseFloat(colonna.style.height)).toBeGreaterThanOrEqual(atteso + parseFloat(chiusura.style.fontSize))
  })

  it('la vista Mese non porta iniziali', async () => {
    const uid = await seed()
    salonDesk.access = accessCon(uid)
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=mese" />)
    await screen.findByRole('group', { name: 'Filtra per persona' })
    expect(screen.queryByLabelText('Visita di Anna Rossi')).not.toBeInTheDocument()
  })

  it('una persona ricordata che non c’è più vale Tutti', async () => {
    const uid = await seed()
    salonDesk.access = accessCon(uid)
    localStorage.setItem(`groomly.filtroPersona.${uid}`, 'ex-collaboratore')
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const filtro = await screen.findByRole('group', { name: 'Filtra per persona' })
    expect(within(filtro).getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Apri Rex/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Apri Zeus/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Apri Luna/ })).toBeInTheDocument()
  })

  it('il collaboratore non ha il filtro', async () => {
    const uid = await seed()
    salonDesk.access = accessCon(uid)
    const account = getAccount()
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore', salonId: uid })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    await screen.findByRole('heading', { name: 'Ottobre 2026' })
    expect(screen.queryByRole('group', { name: 'Filtra per persona' })).not.toBeInTheDocument()
  })

  it('senza Salone niente filtro né iniziali', async () => {
    await seed()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    expect(await screen.findByRole('button', { name: /^Apri Rex/ })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Filtra per persona' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Visita di /)).not.toBeInTheDocument()
  })
})
