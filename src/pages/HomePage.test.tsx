// @vitest-environment happy-dom
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { saveClosureLocal } from '../data/local/closures'
import { archiveDog, createDog } from '../data/local/dogs'
import { blankSettings, getSettings, rememberDog } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'

const LINE = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }]

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

function statusOf(uid: string, id: string): { status: string; cancelReason?: string } {
  return (JSON.parse(localStorage.getItem(storageKeys.appointments(uid))!) as Record<string, { status: string; cancelReason?: string }>)[id]
}

describe('home', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tiene l’ordine: Oggi, banner, Da chiudere, statistiche; i completati restano all’orario', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const bea = createDog(account.uid, dog('Bea'))
    const ciro = createDog(account.uid, dog('Ciro'))
    const ada = createDog(account.uid, dog('Ada', { clientType: 'mensile' }))
    const rex = createDog(account.uid, dog('Rex'))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 10, 11, 30, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: ciro.id, start: new Date(2026, 9, 10, 14, 0, 0, 0), services: LINE })
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: ada.id, start: new Date(2026, 7, 1, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    const oggi = await screen.findByRole('heading', { name: 'Oggi' })
    const fiscal = screen.getByRole('region', { name: 'Completa l\'attività' })
    const banner = screen.getByRole('region', { name: 'Mensili da programmare' })
    const closing = screen.getByRole('heading', { name: 'Da chiudere (1)' })
    expect(screen.getByRole('region', { name: 'Da chiudere' })).toHaveAttribute('id', 'da-chiudere')
    expect(screen.queryByRole('button', { name: 'Nuovo appuntamento' })).not.toBeInTheDocument()
    const stats = screen.getByText('Mensili ott')
    expect(screen.queryByRole('region', { name: 'Conferma la tua email' })).not.toBeInTheDocument()
    expect(oggi.compareDocumentPosition(fiscal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(fiscal.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(oggi.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(banner.compareDocumentPosition(closing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(closing.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const labels = screen.getAllByRole('button', { name: /^Apri (Bea|Ciro|Luna)/ }).map((item) => item.getAttribute('aria-label'))
    expect(labels).toEqual(['Apri Luna', 'Apri Bea', 'Apri Ciro'])
    const lunaRow = screen.getByRole('button', { name: 'Apri Luna' }).closest('div')!
    expect(within(lunaRow).getByText('Completato')).toBeInTheDocument()
    expect(lunaRow.getAttribute('style') ?? '').not.toContain('opacity')
    expect(within(screen.getByRole('button', { name: 'Apri Bea' }).closest('div')!).queryByText('Completato')).not.toBeInTheDocument()
    const current = document.querySelectorAll('[data-current="true"]')
    expect(current).toHaveLength(1)
    expect(within(current[0] as HTMLElement).getByText('11:30').parentElement?.getAttribute('style')).toContain('background: var(--pri-solid)')
    expect(within(current[0] as HTMLElement).getByRole('button', { name: 'Apri Bea' })).toBeInTheDocument()
  })

  it('ordina Oggi per orario, mette la pill sul prossimo e colora Da chiudere', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { breed: 'Maltese', contact: { name: 'Mario Bianchi', phone: '333' } }))
    createDog(account.uid, dog('Luna', { breed: 'Barboncino', contact: { name: 'Anna Usai', phone: '333' } }))
    const bea = createDog(account.uid, dog('Bea'))
    const ciro = createDog(account.uid, dog('Ciro'))
    const rex = createDog(account.uid, dog('Rex'))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 10, 12, 0, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: ciro.id, start: new Date(2026, 9, 10, 14, 0, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    const view = render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    const nine = screen.getByRole('button', { name: 'Apri Luna, Maltese, Bianchi' })
    const noon = screen.getByRole('button', { name: 'Apri Bea' })
    expect(nine.compareDocumentPosition(noon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(noon).getByText('ora')).toBeInTheDocument()
    const done = screen.getByRole('button', { name: 'Completato Rex' })
    expect(done.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Non venuto Rex' }).querySelector('svg')).toBeNull()
    expect(screen.getByRole('button', { name: 'Disdetto Rex' }).querySelector('svg')).toBeNull()
    const actions = done.parentElement!
    expect(actions.getAttribute('style')).toContain('display: flex')
    expect(actions.getAttribute('style')).not.toContain('flex-direction: column')
    expect(actions.getAttribute('style')).toContain('gap: 8px')
    expect(within(actions).getAllByRole('button').map((button) => button.textContent)).toEqual(['Completato', 'Non venuto', 'Disdetto'])
    for (const button of within(actions).getAllByRole('button')) {
      expect(button.getAttribute('style')).toContain('flex-grow: 1')
      expect(button.getAttribute('style')).toContain('min-height: 44px')
      expect(button.getAttribute('style')).toMatch(/(?:^|; )width: auto/)
    }
    for (const opener of [nine, noon, screen.getByRole('button', { name: 'Apri Ciro' })]) {
      expect(opener.querySelector('[style*="text-overflow: ellipsis"]')).toBeNull()
      expect(opener.getAttribute('style') ?? '').not.toContain('text-overflow: ellipsis')
    }
    view.unmount()
    localStorage.clear()
    const later = await createAccount('maria@salone.it', 'segretissimo')
    const nina = createDog(later.uid, dog('Nina'))
    createAppointment(later.uid, { dogId: nina.id, start: new Date(2026, 9, 10, 14, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    expect(within(await screen.findByRole('button', { name: 'Apri Nina' })).getByText((text) => text.includes('tra ') && text.includes(' min'))).toBeInTheDocument()
  })

  it('senza un appuntamento in corso il bordo blu va al prossimo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const bea = createDog(account.uid, dog('Bea'))
    const ciro = createDog(account.uid, dog('Ciro'))
    createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: ciro.id, start: new Date(2026, 9, 10, 14, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    const current = document.querySelectorAll('[data-current="true"]')
    expect(current).toHaveLength(1)
    expect(within(current[0] as HTMLElement).getByRole('button', { name: 'Apri Ciro' })).toBeInTheDocument()
  })

  it('Da chiudere compare un’ora dopo la fine in calendario e l’appuntamento resta in Oggi', async () => {
    vi.setSystemTime(new Date(2026, 9, 10, 13, 59, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const sally = createDog(account.uid, dog('Sally'))
    const fiocco = createDog(account.uid, dog('Fiocco'))
    createAppointment(account.uid, { dogId: sally.id, start: new Date(2026, 9, 10, 12, 0, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: fiocco.id, start: new Date(2026, 9, 10, 15, 0, 0, 0), services: LINE })
    const early = render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(screen.getByRole('button', { name: 'Apri Sally' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Da chiudere/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completato Sally' })).not.toBeInTheDocument()
    early.unmount()
    vi.setSystemTime(new Date(2026, 9, 10, 14, 0, 0, 0))
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completato Sally' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non venuto Sally' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disdetto Sally' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completato Fiocco' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Apri Sally' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Apri Fiocco' })).toBeInTheDocument()
  })

  it('con la home aperta Da chiudere compare allo scoccare dell’ora', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const sally = createDog(account.uid, dog('Sally'))
    createAppointment(account.uid, { dogId: sally.id, start: new Date(2026, 9, 10, 12, 0, 0, 0), services: LINE })
    vi.useRealTimers()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 13, 59, 0, 0))
    render(<App memory isDev={false} initialPath="/" />)
    expect(screen.getByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Da chiudere/ })).not.toBeInTheDocument()
    await act(async () => {
      vi.setSystemTime(new Date(2026, 9, 10, 14, 0, 0, 0))
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(screen.getByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completato Sally' })).toBeInTheDocument()
  })

  it('Da chiudere offre Completato, Non venuto e Disdetto sui giorni già scaduti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const zoe = createDog(account.uid, dog('Zoe'))
    const past = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    const future = createAppointment(account.uid, { dogId: zoe.id, start: new Date(2026, 9, 20, 9, 0, 0, 0), services: LINE })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^(Completato|Non venuto|Disdetto) / })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Zoe/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Completato Rex' }))
    expect(statusOf(account.uid, past.id).status).toBe('programmato')
    expect(screen.getByRole('dialog', { name: 'Completare' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'POS' }))
    await user.click(screen.getByRole('button', { name: 'Nessuna modifica' }))
    expect(statusOf(account.uid, past.id).status).toBe('completato')
    expect(statusOf(account.uid, future.id).status).toBe('programmato')
    expect(screen.queryByRole('heading', { name: /Da chiudere/ })).not.toBeInTheDocument()
  })

  it('Non venuto e Disdetto usano gli stessi stati della scheda e Annulla li riporta programmato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const past = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    const other = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 7, 9, 0, 0, 0), services: LINE })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Da chiudere (2)' })).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Non venuto Rex' })
    await user.click(buttons[1])
    expect(statusOf(account.uid, past.id).status).toBe('non_venuto')
    expect(screen.queryByRole('dialog', { name: 'Completare' })).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('Non venuto')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(statusOf(account.uid, past.id).status).toBe('programmato')
    await user.click(screen.getAllByRole('button', { name: 'Disdetto Rex' })[0])
    expect(screen.getByRole('button', { name: 'Cliente' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salone' }))
    expect(statusOf(account.uid, other.id)).toMatchObject({ status: 'disdetto', cancelReason: 'salone' })
    expect(screen.queryByRole('dialog', { name: 'Completare' })).not.toBeInTheDocument()
    expect(statusOf(account.uid, past.id).status).toBe('programmato')
    expect(await screen.findByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
  })

  it('un mensile da fissare e un passato da chiudere convivono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const ada = createDog(account.uid, dog('Ada', { clientType: 'mensile' }))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: ada.id, start: new Date(2026, 8, 1, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: ada.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('1 mensile da programmare')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Da chiudere' })).toHaveAttribute('id', 'da-chiudere')
    expect(screen.queryByRole('region', { name: 'Mensili da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fissa Ada' })).not.toBeInTheDocument()
    expect(screen.getByTestId('bell-count')).toHaveTextContent('1')
    expect(screen.getByRole('link', { name: 'Mensili, 1 da fissare' })).toHaveAttribute('href', '/mensili')
    expect(screen.queryByRole('link', { name: 'Impostazioni' })).toBeNull()
  })

  it('l’appuntamento in home mostra la foto di galleria se manca il ritratto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', {
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,gal', takenAt: new Date('2026-03-01T09:30:00.000Z') }],
    }))
    const map = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { photo?: string }>
    delete map[rex.id].photo
    localStorage.setItem(storageKeys.dogs(account.uid), JSON.stringify(map))
    createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 10, 11, 30, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    const open = await screen.findByRole('button', { name: /Apri Rex/ })
    expect(open.querySelector('img')).toHaveAttribute('src', 'data:image/jpeg;base64,gal')
  })

  it('Visti di recente non compare in home', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const dogs = ['Uno', 'Due', 'Tre'].map((name) => createDog(account.uid, dog(name)))
    writeJson(storageKeys.settings(account.uid), rememberDog(rememberDog(rememberDog(getSettings(account.uid), dogs[0].id), dogs[1].id), dogs[2].id))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Visti di recente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Uno/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nuovo appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
  })

  it('due Luna attive mostrano il mark e una archiviata non marca l’unica attiva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const bianchi = createDog(account.uid, dog('Luna', { breed: 'Maltese', contact: { name: 'Mario Bianchi', phone: '333' } }))
    const usai = createDog(account.uid, dog('Luna', { breed: 'Barboncino', contact: { name: 'Anna Usai', phone: '333' } }))
    createAppointment(account.uid, { dogId: bianchi.id, start: new Date(2026, 9, 10, 10, 30, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: usai.id, start: new Date(2026, 9, 10, 11, 0, 0, 0), services: LINE })
    const view = render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('Maltese · Bianchi')).toBeInTheDocument()
    expect(screen.getByText('Barboncino · Usai')).toBeInTheDocument()
    const openers = screen.getAllByRole('button', { name: /^Apri Luna/ }).map((item) => item.getAttribute('aria-label'))
    expect(openers).toEqual(['Apri Luna, Maltese, Bianchi', 'Apri Luna, Barboncino, Usai'])
    view.unmount()

    localStorage.clear()
    const second = await createAccount('maria@salone.it', 'segretissimo')
    const active = createDog(second.uid, dog('Luna', { breed: 'Maltese', contact: { name: 'Mario Bianchi', phone: '333' } }))
    const archived = createDog(second.uid, dog('Luna', { breed: 'Barboncino', contact: { name: 'Anna Usai', phone: '333' } }))
    createAppointment(second.uid, { dogId: active.id, start: new Date(2026, 9, 10, 11, 30, 0, 0), services: LINE })
    archiveDog(second.uid, archived.id, 'non_in_cura')
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('button', { name: 'Apri Luna' })).toBeInTheDocument()
    expect(screen.queryByText('Maltese · Bianchi')).not.toBeInTheDocument()
    expect(screen.queryByText('Barboncino · Usai')).not.toBeInTheDocument()
  })

  it('un mensile con la visita di domani resta in lista come non fissato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const ada = createDog(account.uid, dog('Ada', { clientType: 'mensile', recurrenceWeeks: 4 }))
    createAppointment(account.uid, { dogId: ada.id, start: new Date(2026, 9, 11, 10, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mensili da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByText('Ada')).not.toBeInTheDocument()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as object)).toHaveLength(1)
  })

  it('il riquadro Incassi oggi somma i completati di oggi e porta alla pagina', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const bea = createDog(account.uid, dog('Bea'))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 10, 14, 0, 0, 0), services: LINE })
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 9, 9, 0, 0, 0), services: LINE }).id)
    render(<App memory isDev={false} initialPath="/" />)
    const tile = await screen.findByRole('link', { name: 'Incassi di oggi: 20 euro. Apri incassi' })
    expect(tile).toHaveAttribute('href', '/incassi?periodo=giorno')
    expect(within(tile).getByText('€ 20')).toBeInTheDocument()
    expect(within(tile).getByText('Incassi oggi')).toBeInTheDocument()
    expect(tile.parentElement?.getAttribute('style')).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(tile.getAttribute('style')).toContain('min-width: 0')
    expect(within(tile).getByText('€ 20').getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(within(tile).getByText('€ 20').getAttribute('style')).toContain('white-space: normal')
    expect(within(tile).getByText('Incassi oggi').getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(within(tile).getByText('Incassi oggi').getAttribute('style')).toContain('white-space: normal')
    const order = Array.from(tile.parentElement!.children).map((item) => item.textContent)
    expect(order[1]).toContain('Incassi oggi')
    expect(order[2]).toContain('Mensili')
  })

  it('la fascia fiscale c’è senza partita IVA e codice fiscale, con il bollino su Altro', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/" />)
    const fiscal = await screen.findByRole('region', { name: 'Completa l\'attività' })
    expect(within(fiscal).getByText('Aggiungi partita IVA o codice fiscale')).toBeInTheDocument()
    expect(within(fiscal).getByText('Per completare l\'attività')).toBeInTheDocument()
    expect(within(fiscal).getByRole('button', { name: 'Aggiungi' })).toBeInTheDocument()
    expect(fiscal.getAttribute('style')).toContain('background: var(--warn-s)')
    expect(fiscal.getAttribute('style')).toContain('color: var(--warn)')
    expect(within(screen.getByRole('link', { name: 'Impostazioni, dati da completare' })).getByTestId('tax-dot')).toBeInTheDocument()
  })

  it('con la partita IVA salvata non ci sono né fascia né bollino', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, business: { ...settings.business, vatNumber: '12345678901' } })
    render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(screen.queryByRole('region', { name: 'Completa l\'attività' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('tax-dot')).not.toBeInTheDocument()
  })

  it('con il solo codice fiscale salvato la fascia e il bollino spariscono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, business: { ...settings.business, taxCode: 'RSSMRA85T10A562S' } })
    render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(screen.queryByRole('region', { name: 'Completa l\'attività' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('tax-dot')).not.toBeInTheDocument()
  })

  it('indirizzo e telefono da soli non tolgono la fascia', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, business: { ...settings.business, phone: '333', address: 'Via Roma 1' } })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('region', { name: 'Completa l\'attività' })).toBeInTheDocument()
    expect(screen.getByTestId('tax-dot')).toBeInTheDocument()
  })

  it('Aggiungi porta in Impostazioni e apre il foglio Attività', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    const fiscal = await screen.findByRole('region', { name: 'Completa l\'attività' })
    await user.click(within(fiscal).getByRole('button', { name: 'Aggiungi' }))
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    const dialog = await screen.findByRole('dialog', { name: 'Attività' })
    expect(within(dialog).getByLabelText('Codice fiscale')).toBeInTheDocument()
  })

  it('Oggi elenca la visita e il personale per ora, la tessera non conta il dentista e le Ferie stanno sopra', async () => {
    vi.setSystemTime(new Date(2026, 9, 10, 10, 0, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 9, 9, 0, 0, 0), services: LINE })
    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 10, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
    })
    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 9, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
    })
    saveClosureLocal(account.uid, {
      id: 'ferie',
      reason: 'Ferie',
      startDay: '2026-10-10',
      endDay: '2026-10-10',
      createdAt: new Date(2026, 9, 1),
      updatedAt: new Date(2026, 9, 1),
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    const visit = screen.getByRole('button', { name: 'Apri Luna' })
    const personal = screen.getByRole('button', { name: 'Apri Dentista' })
    expect(visit.compareDocumentPosition(personal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(personal).getByText('Dentista')).toBeInTheDocument()
    expect(within(personal).getByText('18:00')).toBeInTheDocument()
    expect(personal.getAttribute('style')).toContain('background: var(--pri-s)')
    expect(within(personal).queryByText('Completato')).not.toBeInTheDocument()
    expect(within(personal).queryByText('Non venuto')).not.toBeInTheDocument()
    expect(within(personal).queryByText('Disdetto')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completato Dentista' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Non venuto Dentista' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disdetto Dentista' })).not.toBeInTheDocument()
    expect(screen.queryByText('Cane assente')).not.toBeInTheDocument()
    const tile = screen.getByRole('link', { name: /Oggi/ })
    expect(tile.textContent).toContain('1 · 1h')
    expect(tile.textContent).not.toContain('2 ·')
    expect(screen.getByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Da chiudere' })).queryByText('Dentista')).not.toBeInTheDocument()
    const banner = screen.getByRole('button', { name: 'Apri chiusura Ferie' })
    expect(banner).toHaveTextContent('Salone chiuso · Ferie')
    expect(banner.compareDocumentPosition(personal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(personal)
    expect(await screen.findByRole('heading', { name: 'Appuntamento personale' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Scheda' })).not.toBeInTheDocument()
  })

  it('un oggi di Ferie senza appuntamenti mette la chiusura prima di Nessun appuntamento', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    saveClosureLocal(account.uid, {
      id: 'ferie',
      reason: 'Ferie',
      startDay: '2026-10-10',
      endDay: '2026-10-10',
      createdAt: new Date(2026, 9, 1),
      updatedAt: new Date(2026, 9, 1),
    })
    render(<App memory isDev={false} initialPath="/" />)
    const banner = await screen.findByRole('button', { name: 'Apri chiusura Ferie' })
    const empty = screen.getByText('Nessun appuntamento')
    const create = screen.getByRole('button', { name: 'Nuovo appuntamento' })
    expect(banner.compareDocumentPosition(empty) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(empty.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('con importi nascosti il riquadro mostra •••', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.settings(account.uid), { ...blankSettings('auto', '2026-10-10T00:00:00.000Z'), ui: { hideAmounts: true } })
    render(<App memory isDev={false} initialPath="/" />)
    const tile = await screen.findByRole('link', { name: 'Incassi di oggi: nascosti. Apri incassi' })
    expect(within(tile).getByText('•••')).toBeInTheDocument()
  })
})
