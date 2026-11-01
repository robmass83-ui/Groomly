// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { saveClosureLocal } from '../data/local/closures'
import { createAccount } from '../data/local/auth'
import { listAppointments } from '../data/local/appointments'
import { storageKeys, writeJson } from '../data/local/storage'
import { formatHomeDate } from '../lib/format'

const pianoForzato = vi.hoisted(() => ({ salone: false }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  const { statoPiano } = await import('../lib/piano')
  return {
    ...actual,
    usePiano: () => {
      const valore = actual.usePiano()
      return pianoForzato.salone ? { ...valore, stato: statoPiano({ piano: 'salone', stato: 'attivo', fonte: 'manuale' }, new Date()) } : valore
    },
  }
})

function salone() {
  pianoForzato.salone = true
}

function storedMap(uid: string): Record<string, Record<string, unknown>> {
  const raw = localStorage.getItem(storageKeys.appointments(uid))
  return raw ? JSON.parse(raw) as Record<string, Record<string, unknown>> : {}
}

function seedPersonal(uid: string) {
  const start = new Date(2026, 9, 21, 18, 0, 0, 0).toISOString()
  const created = new Date(2026, 9, 1, 0, 0, 0, 0).toISOString()
  writeJson(storageKeys.appointments(uid), {
    p1: { id: 'p1', kind: 'personale', title: 'Dentista', start, createdAt: created, updatedAt: created },
  })
}

async function openSheet(path: string) {
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={path} />)
  const sheet = await screen.findByRole('dialog', { name: 'Appuntamento personale' })
  return { user, sheet }
}

describe('foglio appuntamento personale', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.salone = false
  })

  it('mostra titolo, data, ora di inizio, ora di fine e la scelta tra impegno e promemoria', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const { sheet } = await openSheet('/appuntamenti/personale/nuovo')
    expect(within(sheet).getByLabelText('Titolo')).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Data')).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Ora di inizio')).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Ora di fine')).toBeInTheDocument()
    expect(within(sheet).getByRole('radio', { name: 'Impegno' })).toBeChecked()
    expect(within(sheet).getByRole('radio', { name: 'Promemoria' })).not.toBeChecked()
    expect(within(sheet).getByText('L’impegno toglie l’orario dalle prenotazioni online. Il promemoria resta solo in agenda.')).toBeInTheDocument()
  })

  it('salvare senza titolo mostra l’errore sotto il campo e non chiude', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const alert = within(sheet).getAllByRole('alert')[0]
    expect(alert).toHaveTextContent('Scrivi un titolo.')
    expect(document.getElementById('Titolo')?.closest('label')).toContainElement(alert)
    expect(screen.getByRole('dialog', { name: 'Appuntamento personale' })).toBeInTheDocument()
    expect(storedMap(account.uid)).toEqual({})
  })

  it('salva Dentista il 21 ottobre 2026 alle 18:00 senza plannedEnd', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    await user.click(within(sheet).getByRole('radio', { name: 'Promemoria' }))
    await user.type(within(sheet).getByLabelText('Titolo'), 'Dentista')
    fireEvent.change(within(sheet).getByLabelText('Data'), { target: { value: '2026-10-21' } })
    fireEvent.change(within(sheet).getByLabelText('Ora di inizio'), { target: { value: '18:00' } })
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))

    const saved = Object.values(storedMap(account.uid))
    expect(saved).toHaveLength(1)
    expect(saved[0].kind).toBe('personale')
    expect(saved[0].title).toBe('Dentista')
    expect(saved[0].plannedEnd).toBeUndefined()
    expect(saved[0].end).toBeUndefined()
    expect(saved[0].dogId).toBeUndefined()
    expect(saved[0].services).toBeUndefined()
    expect(saved[0].status).toBeUndefined()
    const start = new Date(String(saved[0].start))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(9)
    expect(start.getDate()).toBe(21)
    expect(start.getHours()).toBe(18)
    expect(start.getMinutes()).toBe(0)
    expect(listAppointments(account.uid)[0].plannedEnd).toBeUndefined()
  })

  it('una fine alle 18:00 non salva e mostra l’errore sotto l’ora di fine', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    await user.type(within(sheet).getByLabelText('Titolo'), 'Dentista')
    fireEvent.change(within(sheet).getByLabelText('Data'), { target: { value: '2026-10-21' } })
    fireEvent.change(within(sheet).getByLabelText('Ora di inizio'), { target: { value: '18:00' } })
    fireEvent.change(within(sheet).getByLabelText('Ora di fine'), { target: { value: '18:00' } })
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))

    const alert = within(sheet).getByRole('alert')
    expect(alert).toHaveTextContent("L'ora di fine è dopo l'inizio.")
    expect(document.getElementById('Ora di fine')?.closest('label')).toContainElement(alert)
    expect(screen.getByRole('dialog', { name: 'Appuntamento personale' })).toBeInTheDocument()
    expect(storedMap(account.uid)).toEqual({})
  })

  it('una fine alle 19:00 salva plannedEnd alle 19:00', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    await user.type(within(sheet).getByLabelText('Titolo'), 'Dentista')
    fireEvent.change(within(sheet).getByLabelText('Data'), { target: { value: '2026-10-21' } })
    fireEvent.change(within(sheet).getByLabelText('Ora di inizio'), { target: { value: '18:00' } })
    fireEvent.change(within(sheet).getByLabelText('Ora di fine'), { target: { value: '19:00' } })
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))

    const saved = Object.values(storedMap(account.uid))
    expect(saved).toHaveLength(1)
    const plannedEnd = new Date(String(saved[0].plannedEnd))
    expect(plannedEnd.getFullYear()).toBe(2026)
    expect(plannedEnd.getMonth()).toBe(9)
    expect(plannedEnd.getDate()).toBe(21)
    expect(plannedEnd.getHours()).toBe(19)
    expect(plannedEnd.getMinutes()).toBe(0)
    expect(saved[0].end).toBeUndefined()
    expect(listAppointments(account.uid)[0].end).toBeUndefined()
    expect(listAppointments(account.uid)[0].plannedEnd).toEqual(plannedEnd)
  })

  it('con ?data=2026-10-21 la data è già quella e una chiusura Ferie non chiede Salone chiuso', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    saveClosureLocal(account.uid, {
      id: 'c1',
      reason: 'Ferie',
      startDay: '2026-10-21',
      endDay: '2026-10-21',
      createdAt: new Date(2026, 9, 1),
      updatedAt: new Date(2026, 9, 1),
    })
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo?data=2026-10-21')
    expect(within(sheet).getByLabelText('Data')).toHaveValue('2026-10-21')
    expect(screen.queryByRole('dialog', { name: 'Salone chiuso' })).not.toBeInTheDocument()
    await user.type(within(sheet).getByLabelText('Titolo'), 'Dentista')
    fireEvent.change(within(sheet).getByLabelText('Ora di inizio'), { target: { value: '18:00' } })
    fireEvent.change(within(sheet).getByLabelText('Ora di fine'), { target: { value: '19:00' } })
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog', { name: 'Salone chiuso' })).not.toBeInTheDocument()
    expect(Object.values(storedMap(account.uid))).toHaveLength(1)
  })

  async function compila(user: ReturnType<typeof userEvent.setup>, sheet: HTMLElement, fine: string | null) {
    await user.type(within(sheet).getByLabelText('Titolo'), 'Dentista')
    fireEvent.change(within(sheet).getByLabelText('Data'), { target: { value: '2026-10-21' } })
    fireEvent.change(within(sheet).getByLabelText('Ora di inizio'), { target: { value: '18:00' } })
    if (fine) fireEvent.change(within(sheet).getByLabelText('Ora di fine'), { target: { value: fine } })
  }

  it('nuovo impegno: senza ora di fine non si salva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    await compila(user, sheet, null)
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(within(sheet).getByRole('alert')).toHaveTextContent("L'ora di fine è dopo l'inizio.")
    expect(storedMap(account.uid)).toEqual({})
  })

  it('un promemoria si salva senza ora di fine e con promemoria true', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    await user.click(within(sheet).getByRole('radio', { name: 'Promemoria' }))
    expect(within(sheet).queryByLabelText('Ora di fine')).not.toBeInTheDocument()
    await compila(user, sheet, null)
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const saved = Object.values(storedMap(account.uid))
    expect(saved).toHaveLength(1)
    expect(saved[0].promemoria).toBe(true)
    expect(saved[0].plannedEnd).toBeUndefined()
    expect(saved[0].bloccaOnline).toBeUndefined()
  })

  it('nel Salone l’interruttore è acceso e spegnendolo si salva bloccaOnline false', async () => {
    salone()
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    const interruttore = within(sheet).getByRole('switch', { name: 'Blocca l’orario per le prenotazioni online' })
    expect(interruttore).toHaveAttribute('aria-checked', 'true')
    await user.click(interruttore)
    await compila(user, sheet, '19:00')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const saved = Object.values(storedMap(account.uid))
    expect(saved).toHaveLength(1)
    expect(saved[0].bloccaOnline).toBe(false)
    expect(saved[0].promemoria).toBeUndefined()
  })

  it('nel Salone con l’interruttore acceso l’impegno non ha bloccaOnline', async () => {
    salone()
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    await compila(user, sheet, '19:00')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(Object.values(storedMap(account.uid))[0].bloccaOnline).toBeUndefined()
  })

  it('fuori dal Salone l’interruttore non c’è e l’impegno non ha bloccaOnline', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    expect(within(sheet).queryByRole('switch')).not.toBeInTheDocument()
    await compila(user, sheet, '19:00')
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const saved = Object.values(storedMap(account.uid))
    expect(saved).toHaveLength(1)
    expect(saved[0].bloccaOnline).toBeUndefined()
    expect(saved[0].promemoria).toBeUndefined()
  })

  it('un impegno vecchio senza fine aperto e salvato chiede la fine', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPersonal(account.uid)
    const { user, sheet } = await openSheet('/appuntamenti/personale/p1')
    expect(within(sheet).getByRole('radio', { name: 'Impegno' })).toBeChecked()
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(within(sheet).getByRole('alert')).toHaveTextContent("L'ora di fine è dopo l'inizio.")
    expect(storedMap(account.uid).p1.plannedEnd).toBeUndefined()
  })

  it('un promemoria salvato si riapre come promemoria', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPersonal(account.uid)
    const map = storedMap(account.uid)
    writeJson(storageKeys.appointments(account.uid), { p1: { ...map.p1, promemoria: true } })
    const { sheet } = await openSheet('/appuntamenti/personale/p1')
    expect(within(sheet).getByRole('radio', { name: 'Promemoria' })).toBeChecked()
  })

  it('nel Salone riaprire e salvare senza toccare tiene bloccaOnline false e il promemoria', async () => {
    salone()
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPersonal(account.uid)
    const fine = new Date(2026, 9, 21, 19, 0, 0, 0).toISOString()
    const map = storedMap(account.uid)
    writeJson(storageKeys.appointments(account.uid), {
      p1: { ...map.p1, plannedEnd: fine, bloccaOnline: false },
      p2: { ...map.p1, id: 'p2', title: 'Telefonare', promemoria: true },
    })
    const primo = await openSheet('/appuntamenti/personale/p1')
    expect(within(primo.sheet).getByRole('switch', { name: 'Blocca l’orario per le prenotazioni online' })).toHaveAttribute('aria-checked', 'false')
    await primo.user.click(within(primo.sheet).getByRole('button', { name: 'Salva' }))
    expect(storedMap(account.uid).p1.bloccaOnline).toBe(false)
    expect(storedMap(account.uid).p1.promemoria).toBeUndefined()
    cleanup()
    const secondo = await openSheet('/appuntamenti/personale/p2')
    await secondo.user.click(within(secondo.sheet).getByRole('button', { name: 'Salva' }))
    expect(storedMap(account.uid).p2.promemoria).toBe(true)
    expect(storedMap(account.uid).p2.bloccaOnline).toBeUndefined()
  })

  it('il testo dell’interruttore è una etichetta che lo comanda', async () => {
    salone()
    await createAccount('maria@salone.it', 'segretissimo')
    const { user, sheet } = await openSheet('/appuntamenti/personale/nuovo')
    const interruttore = within(sheet).getByRole('switch', { name: 'Blocca l’orario per le prenotazioni online' })
    await user.click(sheet.querySelector('label[for="pers-blocca-online"]') as HTMLElement)
    expect(interruttore).toHaveAttribute('aria-checked', 'false')
  })

  it('aprire il personale mostra il titolo e Elimina toglie il record', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPersonal(account.uid)
    const when = formatHomeDate(new Date(2026, 9, 21, 18, 0))
    const { user, sheet } = await openSheet('/appuntamenti/personale/p1')
    expect(within(sheet).getByLabelText('Titolo')).toHaveValue('Dentista')
    await user.click(within(sheet).getByRole('button', { name: 'Elimina' }))
    const confirm = screen.getByRole('dialog', { name: `Eliminare Dentista del ${when} alle 18:00?` })
    await user.click(within(confirm).getByRole('button', { name: 'Elimina' }))
    expect(storedMap(account.uid).p1).toBeUndefined()
    expect(listAppointments(account.uid).map((item) => item.id)).not.toContain('p1')
  })
})
