// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { completeAppointment, createAppointment, saveClose, setAppointmentStatus } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import type { DogWrite } from '../types/models'

function dog(name: string): DogWrite {
  return { name, species: 'cane', breed: '', ageCategory: 'adulto', size: 'piccola', temperament: 'bravo', clientType: 'occasionale', contact: { name: '', phone: '333' } }
}

function line(price: number) {
  return [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }]
}

async function seed() {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const uid = account.uid
  const [rex, zeus, luna, otto, fido] = ['Rex', 'Zeus', 'Luna', 'Otto', 'Fido'].map((name) => createDog(uid, dog(name)))
  completeAppointment(uid, createAppointment(uid, { dogId: rex.id, start: new Date(2026, 9, 12, 10, 0), services: line(40) }).id)
  completeAppointment(uid, createAppointment(uid, { dogId: zeus.id, start: new Date(2026, 9, 13, 9, 0), services: line(55) }).id)
  createAppointment(uid, { dogId: luna.id, start: new Date(2026, 9, 13, 15, 30), services: line(30) })
  createAppointment(uid, { dogId: otto.id, start: new Date(2026, 9, 14, 10, 0), services: line(160) })
  setAppointmentStatus(uid, createAppointment(uid, { dogId: fido.id, start: new Date(2026, 9, 15, 11, 0), services: line(35) }).id, 'disdetto', 'cliente')
  return uid
}

describe('pagina Incassi', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 15, 5))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('settimana: numeri, fumetto e tocco su una barra', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    expect(await screen.findByRole('heading', { name: 'Incassi' })).toBeInTheDocument()
    expect(screen.getByText('12 – 18 ottobre')).toBeInTheDocument()
    expect(screen.getByTestId('earnings-total')).toHaveTextContent('€ 95')
    expect(screen.getByText('2 di 4')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Martedì 13 · oggi')
    await user.click(screen.getByRole('button', { name: 'Mercoledì 14: 0 euro incassati, 160 previsti' }))
    expect(screen.getByRole('status')).toHaveTextContent('nessun incasso · +€ 160 previsti')
  })

  it('tap su un giorno apre Giorno su quella data; Segmented mantiene la data', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    const monday = await screen.findAllByRole('button', { name: /^Lunedì 12/ })
    await user.click(monday.at(-1)!)
    expect(await screen.findByText('Lun 12 ottobre')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Appuntamenti di lun 12' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Settimana' }))
    await user.click(screen.getByRole('button', { name: 'Periodo successivo' }))
    await user.click(screen.getByRole('radio', { name: 'Giorno' }))
    expect(screen.getByText('Lun 19 ottobre')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Oggi' }))
    expect(screen.getByText('Oggi · mar 13 ottobre')).toBeInTheDocument()
  })

  it('› si ferma oltre 4 settimane da oggi', async () => {
    await seed()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-11-09" />)
    expect(await screen.findByRole('button', { name: 'Periodo successivo' })).toBeDisabled()
  })

  it('Persi apre il foglio con il disdetto dal cliente', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    await user.click(await screen.findByRole('button', { name: /^Persi/ }))
    const sheet = screen.getByRole('dialog', { name: 'Persi' })
    expect(within(sheet).getByText('Fido')).toBeInTheDocument()
    expect(within(sheet).getByText('gio 15 ott · disdetto dal cliente')).toBeInTheDocument()
  })

  it('l’occhio nasconde gli importi e salva la scelta del salone', async () => {
    const uid = await seed()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    await user.click(await screen.findByRole('button', { name: 'Nascondi importi' }))
    expect(screen.getByTestId('earnings-total')).toHaveTextContent('•••')
    expect(screen.getByRole('button', { name: 'Mostra importi' })).toHaveAttribute('aria-pressed', 'true')
    expect(getSettings(uid).ui.hideAmounts).toBe(true)
  })

  it('un programmato di ieri compare nell’avviso da chiudere', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 12, 10, 0), services: line(30) })
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    expect(await screen.findByText('1 appuntamento da chiudere · € 30 non ancora contati')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chiudi ›' })).toHaveAttribute('href', '/')
  })

  it('mostra la cifra incassata e non la nota della variazione', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 13, 10, 0), services: line(40) })
    saveClose(account.uid, created.id, { total: 70, actualDurationMin: 55, adjustmentNote: 'Pieno di nodi' }, true)
    render(<App memory isDev={false} initialPath="/incassi?periodo=giorno&data=2026-10-13" />)
    expect(await screen.findByTestId('earnings-total')).toHaveTextContent('€ 70')
    expect(screen.getByText('10:00 · Rex')).toBeInTheDocument()
    expect(screen.queryByText('Pieno di nodi')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Pieno di nodi')
  })

  it('giorno: POS, contanti, non indicato e offerti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const uid = account.uid
    const rex = createDog(uid, dog('Rex'))
    const make = (hour: number, price: number) => createAppointment(uid, { dogId: rex.id, start: new Date(2026, 9, 13, hour, 0), services: line(price) })
    saveClose(uid, make(9, 40).id, { total: 40, actualDurationMin: 30, adjustmentNote: null, paymentMethod: 'pos' }, true)
    saveClose(uid, make(10, 25).id, { total: 25, actualDurationMin: 30, adjustmentNote: null, paymentMethod: 'contanti' }, true)
    completeAppointment(uid, make(11, 15).id)
    saveClose(uid, make(12, 0).id, { total: 0, actualDurationMin: 30, adjustmentNote: null, paymentMethod: 'na' }, true)
    make(13, 80)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=giorno&data=2026-10-13" />)
    expect(await screen.findByRole('heading', { name: 'Incassi' })).toBeInTheDocument()
    expect(screen.getByText('POS')).toBeInTheDocument()
    expect(screen.getByText('Contanti')).toBeInTheDocument()
    const pos = screen.getByText('POS').parentElement!
    const contanti = screen.getByText('Contanti').parentElement!
    expect(pos).toHaveTextContent('€ 40')
    expect(contanti).toHaveTextContent('€ 25')
    expect(pos).toHaveTextContent('1 cane')
    expect(contanti).toHaveTextContent('1 cane')
    expect(screen.getByText(/Non indicato/)).toHaveTextContent('Non indicato € 15')
    expect(screen.getByText(/Offerti \(N\/A\)/)).toHaveTextContent('Offerti (N/A) 1')
    await user.click(screen.getByRole('button', { name: 'Nascondi importi' }))
    expect(pos).toHaveTextContent('•••')
    expect(contanti).toHaveTextContent('•••')
    expect(pos).not.toHaveTextContent('€ 40')
    expect(contanti).not.toHaveTextContent('€ 25')
    expect(pos).toHaveTextContent('1 cane')
    expect(contanti).toHaveTextContent('1 cane')
  })

  it('in fondo c’è il link al report', async () => {
    await seed()
    render(<App memory isDev={false} initialPath="/incassi" />)
    expect(await screen.findByRole('link', { name: 'Report ed esportazione ›' })).toHaveAttribute('href', '/incassi/report')
  })

  it('senza appuntamenti mostra lo stato vuoto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/incassi" />)
    expect(await screen.findByText('Nessun appuntamento in questo periodo')).toBeInTheDocument()
    expect(screen.getByText('Gli incassi compaiono quando segni un appuntamento come Completato')).toBeInTheDocument()
  })
})
