// @vitest-environment happy-dom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import logoTestata from '../assets/brand/groomly-logo-testata.svg'
import { App } from '../app/App'
import { Providers } from '../app/providers'
import { buildRoutes } from '../app/router'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { saveClosureLocal } from '../data/local/closures'
import { createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...extra,
  }
}

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Non hai un account? Crea account' }))
  await user.type(screen.getByLabelText('Nome'), 'Maria')
  await user.type(screen.getByLabelText('Cognome'), 'Rossi')
  await user.type(screen.getByLabelText('Nome della toelettatura'), 'Il Cane Felice')
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('checkbox', { name: 'Accetto privacy e termini' }))
  await user.click(screen.getByRole('button', { name: 'Crea account' }))
  await screen.findByRole('heading', { name: 'Groomly' })
}

describe('guscio', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 1, 12))
  })

  it('mostra la data, nasconde il campanello e apre Animali dalla ricerca', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByText('Giovedì 1 ottobre')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Notifiche' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mensili' })).toBeInTheDocument()
    expect(screen.queryByTestId('bell-count')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in archivio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aggiungi il primo animale' })).toBeInTheDocument()
    expect(screen.queryByText('Nessun cane')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Cerca' })).toHaveFocus())
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
  })

  it('in Home il logo grande è il titolo e sotto c’è la data', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    const heading = screen.getByRole('heading', { name: 'Groomly' })
    const logo = within(heading).getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('src', logoTestata)
    expect(logo).toHaveAttribute('height', '44')
    expect(heading.closest('header')).toHaveTextContent('Giovedì 1 ottobre')
    expect(screen.queryByText(/^Ciao/)).not.toBeInTheDocument()
  })

  it('nelle altre pagine il logo sta sopra il titolo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('link', { name: 'Animali' }))
    const title = await screen.findByRole('heading', { name: 'Animali' })
    const header = title.closest('header')!
    const logo = within(header).getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('height', '30')
    expect(logo.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(screen.getByRole('link', { name: 'Agenda' }))
    await screen.findByRole('heading', { name: 'Ottobre 2026' })
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '30')
  })

  it('nuovo appuntamento apre il modulo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(within(screen.getByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Fissa un appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('il «+» offre le quattro voci in ordine', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(within(screen.getByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    const dialog = screen.getByRole('dialog', { name: 'Cosa aggiungi?' })
    const pelosetto = within(dialog).getByRole('button', { name: 'Fissa un appuntamento' })
    const personale = within(dialog).getByRole('button', { name: 'Appuntamento personale, un impegno fuori dal salone' })
    const chiusura = within(dialog).getByRole('button', { name: 'Chiusura, quel giorno il salone non lavora' })
    const dog = within(dialog).getByRole('button', { name: 'Nuovo cane, apri una scheda' })
    expect(pelosetto).toHaveTextContent('Fissa un appuntamento')
    expect(pelosetto).toHaveTextContent('Metti un cane in agenda')
    expect(personale).toHaveTextContent('Appuntamento personale')
    expect(personale).toHaveTextContent('Un impegno fuori dal salone')
    expect(chiusura).toHaveTextContent('Chiusura')
    expect(dog).toHaveTextContent('Nuovo cane')
    expect(within(dialog).queryByRole('button', { name: 'Appuntamento' })).not.toBeInTheDocument()
    const buttons = [pelosetto, personale, chiusura, dog]
    for (let i = 0; i < buttons.length - 1; i++) {
      expect(buttons[i].compareDocumentPosition(buttons[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(dialog.parentElement).toHaveStyle({ alignItems: 'center' })
    for (const button of buttons) {
      expect(button.querySelector('svg')).not.toBeNull()
      expect(button).toHaveStyle({ minHeight: '44px' })
    }
  })

  async function accendiAttesa(ruolo?: 'collaboratore') {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.settings(account.uid), { ...getSettings(account.uid), serviziEmail: { attesa: { modo: 'manuale' } } })
    if (ruolo) writeJson(storageKeys.auth, { ...account, role: ruolo })
    return account
  }

  it('col servizio acceso il «+» aggiunge «Lista d’attesa» per ultima e la apre', async () => {
    await accendiAttesa()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await user.click(within(await screen.findByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    const dialog = screen.getByRole('dialog', { name: 'Cosa aggiungi?' })
    const bottoni = within(dialog).getAllByRole('button').filter((item) => item.textContent !== '' && item.getAttribute('aria-label') !== 'Chiudi')
    const lista = within(dialog).getByRole('button', { name: 'Lista d’attesa' })
    expect(bottoni[bottoni.length - 1]).toBe(lista)
    expect(bottoni.filter((item) => item.style.minHeight === '44px')).toHaveLength(5)
    expect(lista).toHaveStyle({ minHeight: '44px' })
    expect(lista.querySelector('svg')).not.toBeNull()
    await user.click(lista)
    expect(await screen.findByRole('heading', { name: 'Lista d’attesa' })).toBeInTheDocument()
  })

  it('il collaboratore vede «Lista d’attesa» nel «+»', async () => {
    await accendiAttesa('collaboratore')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await user.click(within(await screen.findByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    const dialog = screen.getByRole('dialog', { name: 'Cosa aggiungi?' })
    expect(within(dialog).getByRole('button', { name: 'Lista d’attesa' })).toBeInTheDocument()
  })

  it('col servizio spento il «+» non ha «Lista d’attesa»', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await user.click(within(await screen.findByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    const dialog = screen.getByRole('dialog', { name: 'Cosa aggiungi?' })
    expect(within(dialog).queryByRole('button', { name: 'Lista d’attesa' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Nuovo cane, apri una scheda' })).toBeInTheDocument()
  })

  it('in Animali col servizio acceso c’è «In attesa» e non «Archivio»', async () => {
    await accendiAttesa()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'In attesa' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Archivio/ })).not.toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in attesa')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'In attesa' }))
    expect(await screen.findByRole('heading', { name: 'Lista d’attesa' })).toBeInTheDocument()
  })

  it('in Animali col servizio spento c’è «Archivio» e non «In attesa»', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Archivio 0' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /In attesa/ })).not.toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in archivio')).toBeInTheDocument()
  })
  it('Appuntamento personale apre il foglio col suo titolo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(within(screen.getByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Appuntamento personale, un impegno fuori dal salone' }))
    expect(await screen.findByRole('heading', { name: 'Appuntamento personale' })).toBeInTheDocument()
  })

  it('Chiusura del salone apre il foglio col suo titolo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(within(screen.getByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Chiusura, quel giorno il salone non lavora' }))
    expect(await screen.findByRole('heading', { name: 'Chiusura del salone' })).toBeInTheDocument()
  })

  it('il collaboratore non crea chiusure e vede quella esistente senza Salva né Riapri', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore', salonId: 'titolare-uid' })
    saveClosureLocal(account.uid, { id: 'ch1', reason: 'Ferie', startDay: '2026-10-21', endDay: '2026-10-21', createdAt: new Date(2026, 9, 1), updatedAt: new Date(2026, 9, 1) })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const view = render(<App memory isDev={false} />)
    await user.click(await within(await screen.findByRole('navigation', { name: 'Navigazione principale' })).findByRole('button', { name: 'Aggiungi' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cosa aggiungi?' })
    expect(within(dialog).queryByRole('button', { name: 'Chiusura, quel giorno il salone non lavora' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Fissa un appuntamento' })).toBeInTheDocument()
    view.unmount()
    render(<App memory isDev={false} initialPath="/chiusure/ch1" />)
    expect(await screen.findByRole('heading', { name: 'Chiusura del salone' })).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Salva' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Riapri' })).not.toBeInTheDocument()
  })

  it('dal calendario il personale tiene la data, dalla home no', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const calendar = createMemoryRouter(buildRoutes(false), { initialEntries: ['/calendario?data=2026-10-21'] })
    const view = render(<Providers><RouterProvider router={calendar} /></Providers>)
    await user.click(within(await screen.findByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Appuntamento personale, un impegno fuori dal salone' }))
    expect(await screen.findByRole('heading', { name: 'Appuntamento personale' })).toBeInTheDocument()
    expect(calendar.state.location.pathname).toBe('/appuntamenti/personale/nuovo')
    expect(calendar.state.location.search).toContain('data=2026-10-21')
    view.unmount()

    const home = createMemoryRouter(buildRoutes(false), { initialEntries: ['/'] })
    render(<Providers><RouterProvider router={home} /></Providers>)
    await user.click(within(await screen.findByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Appuntamento personale, un impegno fuori dal salone' }))
    expect(await screen.findByRole('heading', { name: 'Appuntamento personale' })).toBeInTheDocument()
    expect(home.state.location.pathname).toBe('/appuntamenti/personale/nuovo')
    expect(home.state.location.search).not.toContain('data=')
  })

  it('dal calendario la chiusura tiene la data, dalla home no', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const calendar = createMemoryRouter(buildRoutes(false), { initialEntries: ['/calendario?data=2026-10-21'] })
    const view = render(<Providers><RouterProvider router={calendar} /></Providers>)
    await user.click(within(await screen.findByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Chiusura, quel giorno il salone non lavora' }))
    expect(await screen.findByRole('heading', { name: 'Chiusura del salone' })).toBeInTheDocument()
    expect(calendar.state.location.pathname).toBe('/chiusure/nuovo')
    expect(calendar.state.location.search).toContain('data=2026-10-21')
    view.unmount()

    const home = createMemoryRouter(buildRoutes(false), { initialEntries: ['/'] })
    render(<Providers><RouterProvider router={home} /></Providers>)
    await user.click(within(await screen.findByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Chiusura, quel giorno il salone non lavora' }))
    expect(await screen.findByRole('heading', { name: 'Chiusura del salone' })).toBeInTheDocument()
    expect(home.state.location.pathname).toBe('/chiusure/nuovo')
    expect(home.state.location.search).not.toContain('data=')
  })

  it('il campanello segna i mensili in arrivo e la riga di oggi apre la scheda', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const birba = createDog(account.uid, dog('Birba'))
    const luna = createDog(account.uid, dog('Luna', { clientType: 'mensile' }))
    const done = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 7, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, done.id)
    createAppointment(account.uid, {
      dogId: birba.id,
      start: new Date(2026, 9, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 45, price: 20 }],
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mensili, 1 da fissare' })).toHaveAttribute('href', '/mensili')
    expect(screen.getByTestId('bell-count')).toHaveTextContent('1')
    expect(screen.getByText('scadono entro 7 gg')).toBeInTheDocument()
    expect(screen.getByText('Cerca cane, proprietario, razza…')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Oggi/ })).toHaveAttribute('href', '/calendario?data=2026-10-01')
    expect(screen.getByText('1 · 45m')).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
    expect(screen.getByText('Mensili ott')).toBeInTheDocument()
    expect(screen.getByText('Apri')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Calendario ›' })).toHaveAttribute('href', '/calendario?data=2026-10-01')
    expect(screen.queryByRole('heading', { name: 'Visti di recente' })).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Apri Birba' })[0])
    expect(screen.getByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    const back = screen.getByRole('link', { name: 'Torna agli animali' })
    expect(back.closest('header')).toBeNull()
    expect(screen.queryByTestId('back-bar')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull()
    const scheda = screen.getByTestId('scheda')
    expect(scheda).toHaveClass('scheda-enter')
    expect(scheda.getAttribute('style')).toContain('calc(72px + env(safe-area-inset-bottom, 0px))')
    await user.click(back)
    await user.click(await screen.findByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Visti di recente' })).not.toBeInTheDocument()
  })

  it('nuovo cane apre la scheda vuota', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(within(screen.getByRole('navigation', { name: 'Navigazione principale' })).getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo cane, apri una scheda' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    const back = screen.getByRole('link', { name: 'Torna agli animali' })
    expect(back.closest('header')).toBeNull()
    expect(screen.queryByTestId('back-bar')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull()
    const scheda = screen.getByTestId('scheda')
    expect(scheda).toHaveClass('scheda-enter')
    expect(scheda.getAttribute('style')).toContain('calc(72px + env(safe-area-inset-bottom, 0px))')
    await user.click(back)
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
  })
})

afterEach(() => {
  vi.useRealTimers()
})
