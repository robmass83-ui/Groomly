// @vitest-environment happy-dom
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { Providers } from '../app/providers'
import { buildRoutes } from '../app/router'
import { sheetEntries } from '../app/sheetHistory'
import { createAccount } from '../data/local/auth'
import { listAppointments } from '../data/local/appointments'
import { listClosures, saveClosureLocal } from '../data/local/closures'
import { createDog } from '../data/local/dogs'
import { storageKeys, writeJson } from '../data/local/storage'
import { formatHomeDate } from '../lib/format'
import type { Closure } from '../lib/closures'

const RANGE_ERROR = 'La fine del periodo è il giorno di inizio o un giorno dopo.'
const ONE_VISIT = "In questi giorni c'è già 1 visita. La chiusura non le toglie."

function mount(path: string) {
  const entries = sheetEntries(path)
  const router = createMemoryRouter(buildRoutes(false), {
    initialEntries: entries,
    initialIndex: entries.length - 1,
  })
  render(<Providers><RouterProvider router={router} /></Providers>)
  return router
}

async function openSheet(path: string) {
  const user = userEvent.setup()
  const router = mount(path)
  const sheet = await screen.findByRole('dialog', { name: 'Chiusura del salone' })
  return { user, sheet, router }
}

function seedClosure(uid: string, closure: Closure) {
  saveClosureLocal(uid, closure)
}

function closure(partial: Partial<Closure> & Pick<Closure, 'id' | 'startDay' | 'endDay'>): Closure {
  const createdAt = new Date(2026, 7, 1, 0, 0, 0, 0)
  return { reason: 'Ferie', createdAt, updatedAt: createdAt, ...partial }
}

function seedDog(uid: string) {
  return createDog(uid, {
    name: 'Birba',
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Maria', phone: '333' },
  })
}

function seedAppointment(uid: string, id: string, dogId: string, start: Date, extra: Record<string, unknown> = {}) {
  const created = new Date(2026, 7, 1).toISOString()
  const raw = localStorage.getItem(storageKeys.appointments(uid))
  const map = raw ? JSON.parse(raw) as Record<string, unknown> : {}
  map[id] = {
    id,
    dogId,
    start: start.toISOString(),
    services: [],
    status: 'programmato',
    createdAt: created,
    updatedAt: created,
    ...extra,
  }
  writeJson(storageKeys.appointments(uid), map)
}

async function typeReason(user: ReturnType<typeof userEvent.setup>, reason: string) {
  const field = document.getElementById('Motivo')
  if (!(field instanceof HTMLInputElement)) throw new Error('Manca il motivo')
  await user.clear(field)
  if (reason) await user.type(field, reason)
}

function setDay(sheet: HTMLElement, label: string, value: string) {
  fireEvent.change(within(sheet).getByLabelText(label), { target: { value } })
}

describe('foglio chiusura del salone', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('mostra motivo, questo giorno, un periodo e, solo nel periodo, dal e al', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    expect(within(sheet).getByLabelText('Motivo')).toBeInTheDocument()
    expect(within(sheet).getByRole('radio', { name: 'Questo giorno' })).toHaveAttribute('aria-checked', 'true')
    expect(within(sheet).getByRole('radio', { name: 'Un periodo' })).toHaveAttribute('aria-checked', 'false')
    expect(within(sheet).getByLabelText('Data')).toBeInTheDocument()
    expect(within(sheet).queryByLabelText('Dal')).not.toBeInTheDocument()
    expect(within(sheet).queryByLabelText('Al')).not.toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Riapri' })).not.toBeInTheDocument()

    await user.click(within(sheet).getByRole('radio', { name: 'Un periodo' }))
    expect(within(sheet).getByLabelText('Dal')).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Al')).toBeInTheDocument()
    expect(within(sheet).queryByLabelText('Data')).not.toBeInTheDocument()
  })

  it('un motivo vuoto mostra l’errore sotto il campo e non salva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const alert = within(sheet).getByRole('alert')
    expect(alert).toHaveTextContent('Scrivi un motivo.')
    expect(document.getElementById('Motivo')?.closest('label')).toContainElement(alert)
    expect(screen.getByRole('dialog', { name: 'Chiusura del salone' })).toBeInTheDocument()
    expect(listClosures(account.uid)).toEqual([])
  })

  it('un motivo di soli spazi o più lungo di 40 caratteri non salva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, '   ')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Scrivi un motivo.')
    expect(listClosures(account.uid)).toEqual([])

    await typeReason(user, 'a'.repeat(41))
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Scrivi un motivo.')
    expect(listClosures(account.uid)).toEqual([])
  })

  it('un periodo dal 24 al 20 mostra l’errore sotto Al e non salva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Ferie')
    await user.click(within(sheet).getByRole('radio', { name: 'Un periodo' }))
    setDay(sheet, 'Dal', '2026-10-24')
    setDay(sheet, 'Al', '2026-10-20')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const alert = within(sheet).getByRole('alert')
    expect(alert).toHaveTextContent(RANGE_ERROR)
    expect(document.getElementById('Al')?.closest('label')).toContainElement(alert)
    expect(screen.getByRole('dialog', { name: 'Chiusura del salone' })).toBeInTheDocument()
    expect(listClosures(account.uid)).toEqual([])
  })

  it('salva Ferie sul 21 ottobre come un solo giorno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, '  Ferie  ')
    setDay(sheet, 'Data', '2026-10-21')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const saved = listClosures(account.uid)
    expect(saved).toHaveLength(1)
    expect(saved[0].reason).toBe('Ferie')
    expect(saved[0].startDay).toBe('2026-10-21')
    expect(saved[0].endDay).toBe('2026-10-21')
    expect(saved[0].id.length).toBeGreaterThan(0)
    expect(Number.isNaN(saved[0].createdAt.getTime())).toBe(false)
    expect(Number.isNaN(saved[0].updatedAt.getTime())).toBe(false)
  })

  it('salva dal 20 al 24 un solo record', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Ferie')
    await user.click(within(sheet).getByRole('radio', { name: 'Un periodo' }))
    setDay(sheet, 'Dal', '2026-10-20')
    setDay(sheet, 'Al', '2026-10-24')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const saved = listClosures(account.uid)
    expect(saved).toHaveLength(1)
    expect(saved[0].startDay).toBe('2026-10-20')
    expect(saved[0].endDay).toBe('2026-10-24')
    expect(saved[0].reason).toBe('Ferie')
  })

  it('con ?data= la data di questo giorno è già scritta', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const { sheet } = await openSheet('/chiusure/nuovo?data=2026-08-25')
    expect(within(sheet).getByLabelText('Data')).toHaveValue('2026-08-25')
  })

  it('un periodo già chiuso sul 24 non si salva e Apri apre quella chiusura', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedClosure(account.uid, closure({ id: 'c1', startDay: '2026-08-20', endDay: '2026-08-24' }))
    const dal = formatHomeDate(new Date(2026, 7, 20))
    const al = formatHomeDate(new Date(2026, 7, 24))
    const message = `Questi giorni sono già chiusi (Ferie dal ${dal} al ${al}). Modifica quella chiusura.`
    const { user, sheet, router } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Festivo')
    setDay(sheet, 'Data', '2026-08-24')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))

    const ask = screen.getByRole('dialog', { name: message })
    expect(within(ask).getByRole('button', { name: 'Apri' })).toBeInTheDocument()
    expect(within(ask).getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
    expect(listClosures(account.uid)).toHaveLength(1)
    expect(listClosures(account.uid)[0].id).toBe('c1')

    await user.click(within(ask).getByRole('button', { name: 'Indietro' }))
    expect(screen.queryByRole('dialog', { name: message })).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/chiusure/nuovo')
    expect(listClosures(account.uid)).toHaveLength(1)

    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    await user.click(within(screen.getByRole('dialog', { name: message })).getByRole('button', { name: 'Apri' }))
    expect(router.state.location.pathname).toBe('/chiusure/c1')
    expect(listClosures(account.uid)).toHaveLength(1)
    const opened = await screen.findByRole('dialog', { name: 'Chiusura del salone' })
    expect(within(opened).getByLabelText('Motivo')).toHaveValue('Ferie')
    expect(within(opened).getByLabelText('Dal')).toHaveValue('2026-08-20')
    expect(within(opened).getByLabelText('Al')).toHaveValue('2026-08-24')
  })

  it('un giorno singolo già chiuso usa la frase del giorno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedClosure(account.uid, closure({ id: 'c1', reason: 'Festivo', startDay: '2026-08-24', endDay: '2026-08-24' }))
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Ferie')
    setDay(sheet, 'Data', '2026-08-24')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('dialog', { name: 'Questo giorno è già chiuso (Festivo). Modifica quella chiusura.' })).toBeInTheDocument()
    expect(listClosures(account.uid)).toHaveLength(1)
    expect(listClosures(account.uid)[0].reason).toBe('Festivo')
  })

  it('il 25, con la precedente che finisce il 24, si salva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedClosure(account.uid, closure({ id: 'c1', startDay: '2026-08-20', endDay: '2026-08-24' }))
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Festivo')
    setDay(sheet, 'Data', '2026-08-25')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const saved = listClosures(account.uid)
    expect(saved).toHaveLength(2)
    expect(saved.map((item) => item.startDay)).toEqual(['2026-08-20', '2026-08-25'])
    expect(saved[1].endDay).toBe('2026-08-25')
    expect(saved[1].reason).toBe('Festivo')
    expect(screen.queryByText(/già chius/)).not.toBeInTheDocument()
  })

  it('salvare la chiusura aperta non la tratta come sovrapposta a sé', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedClosure(account.uid, closure({ id: 'c1', startDay: '2026-08-20', endDay: '2026-08-24' }))
    const { user, sheet } = await openSheet('/chiusure/c1')
    expect(within(sheet).getByLabelText('Motivo')).toHaveValue('Ferie')
    await typeReason(user, 'Festivo')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const saved = listClosures(account.uid)
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe('c1')
    expect(saved[0].reason).toBe('Festivo')
    expect(saved[0].startDay).toBe('2026-08-20')
    expect(saved[0].endDay).toBe('2026-08-24')
    expect(saved[0].createdAt).toEqual(new Date(2026, 7, 1, 0, 0, 0, 0))
    expect(screen.queryByText(/già chius/)).not.toBeInTheDocument()
  })

  it('una visita il 21 chiede conferma, Salva crea la chiusura e la visita resta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const birba = seedDog(account.uid)
    seedAppointment(account.uid, 'v1', birba.id, new Date(2026, 9, 21, 10, 0, 0, 0))
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Ferie')
    setDay(sheet, 'Data', '2026-10-21')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))

    const ask = screen.getByRole('dialog', { name: ONE_VISIT })
    expect(within(ask).getByRole('button', { name: 'Salva' })).toBeInTheDocument()
    expect(within(ask).getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
    expect(listClosures(account.uid)).toEqual([])
    expect(listAppointments(account.uid).map((item) => item.id)).toEqual(['v1'])

    await user.click(within(ask).getByRole('button', { name: 'Indietro' }))
    expect(screen.queryByRole('dialog', { name: ONE_VISIT })).not.toBeInTheDocument()
    expect(listClosures(account.uid)).toEqual([])
    expect(listAppointments(account.uid)).toHaveLength(1)

    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    await user.click(within(screen.getByRole('dialog', { name: ONE_VISIT })).getByRole('button', { name: 'Salva' }))
    expect(listClosures(account.uid)).toHaveLength(1)
    expect(listClosures(account.uid)[0].startDay).toBe('2026-10-21')
    expect(listAppointments(account.uid).map((item) => item.id)).toEqual(['v1'])
  })

  it('più visite, anche senza kind o disdette, usano il plurale; il personale no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const birba = seedDog(account.uid)
    seedAppointment(account.uid, 'v1', birba.id, new Date(2026, 9, 21, 9, 0, 0, 0))
    seedAppointment(account.uid, 'v2', birba.id, new Date(2026, 9, 21, 11, 0, 0, 0), { status: 'disdetto', kind: 'pelosetto' })
    seedAppointment(account.uid, 'p1', '', new Date(2026, 9, 21, 18, 0, 0, 0), { kind: 'personale', title: 'Dentista', dogId: undefined })
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Ferie')
    setDay(sheet, 'Data', '2026-10-21')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('dialog', { name: 'In questi giorni ci sono già 2 visite. La chiusura non le toglie.' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: ONE_VISIT })).not.toBeInTheDocument()
    expect(listAppointments(account.uid)).toHaveLength(3)
    expect(listClosures(account.uid)).toEqual([])
  })

  it('un personale quel giorno non fa comparire la frase e la chiusura si salva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedAppointment(account.uid, 'p1', '', new Date(2026, 9, 21, 18, 0, 0, 0), { kind: 'personale', title: 'Dentista', dogId: undefined })
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Ferie')
    setDay(sheet, 'Data', '2026-10-21')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(screen.queryByText(ONE_VISIT)).not.toBeInTheDocument()
    expect(screen.queryByText(/ci sono già/)).not.toBeInTheDocument()
    expect(listClosures(account.uid)).toHaveLength(1)
    expect(listAppointments(account.uid).map((item) => item.id)).toEqual(['p1'])
  })

  it('la visita sull’ultimo giorno del periodo conta, quella del giorno dopo no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const birba = seedDog(account.uid)
    seedAppointment(account.uid, 'v24', birba.id, new Date(2026, 9, 24, 10, 0, 0, 0))
    seedAppointment(account.uid, 'v25', birba.id, new Date(2026, 9, 25, 10, 0, 0, 0))
    const { user, sheet } = await openSheet('/chiusure/nuovo')
    await typeReason(user, 'Ferie')
    await user.click(within(sheet).getByRole('radio', { name: 'Un periodo' }))
    setDay(sheet, 'Dal', '2026-10-20')
    setDay(sheet, 'Al', '2026-10-24')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('dialog', { name: ONE_VISIT })).toBeInTheDocument()
    expect(listAppointments(account.uid)).toHaveLength(2)
    expect(listClosures(account.uid)).toEqual([])
  })

  it('Riapri su un periodo chiede conferma e poi la lista è vuota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedClosure(account.uid, closure({ id: 'c1', startDay: '2026-08-20', endDay: '2026-08-24' }))
    const dal = formatHomeDate(new Date(2026, 7, 20))
    const al = formatHomeDate(new Date(2026, 7, 24))
    const message = `Riaprire toglie la chiusura da tutti i giorni, dal ${dal} al ${al}.`
    const { user, sheet } = await openSheet('/chiusure/c1')
    await user.click(within(sheet).getByRole('button', { name: 'Riapri' }))
    const ask = screen.getByRole('dialog', { name: message })
    expect(within(ask).getByRole('button', { name: 'Riapri' })).toBeInTheDocument()
    expect(within(ask).getByRole('button', { name: 'Annulla' })).toBeInTheDocument()
    expect(listClosures(account.uid)).toHaveLength(1)

    await user.click(within(ask).getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByRole('dialog', { name: message })).not.toBeInTheDocument()
    expect(listClosures(account.uid)).toHaveLength(1)

    await user.click(within(sheet).getByRole('button', { name: 'Riapri' }))
    await user.click(within(screen.getByRole('dialog', { name: message })).getByRole('button', { name: 'Riapri' }))
    expect(listClosures(account.uid)).toEqual([])
  })

  it('Riapri su un giorno usa la frase del giorno e toglie il record', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedClosure(account.uid, closure({ id: 'c1', startDay: '2026-10-21', endDay: '2026-10-21' }))
    const { user, sheet } = await openSheet('/chiusure/c1')
    expect(within(sheet).getByLabelText('Data')).toHaveValue('2026-10-21')
    expect(within(sheet).queryByLabelText('Dal')).not.toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Riapri' }))
    const ask = screen.getByRole('dialog', { name: 'Riaprire toglie la chiusura di questo giorno.' })
    await user.click(within(ask).getByRole('button', { name: 'Riapri' }))
    expect(listClosures(account.uid)).toEqual([])
  })
})
