// @vitest-environment happy-dom
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { savePushPrefs } from '../data/pushPrefs'
import { createAccount } from '../data/local/auth'
import { saveClosureLocal } from '../data/local/closures'
import { archiveDog, createDog } from '../data/local/dogs'
import { blankSettings, getSettings, rememberDog } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { PianoValore } from '../hooks/usePiano'
import { statoPiano } from '../lib/piano'
import type { DogWrite } from '../types/models'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

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
    pianoForzato.valore = null
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tiene l’ordine: Oggi, banner, Da chiudere, statistiche; i completati restano all’orario e altro', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const bea = createDog(account.uid, dog('Bea'))
    const ciro = createDog(account.uid, dog('Ciro'))
    const ada = createDog(account.uid, dog('Ada', { clientType: 'mensile' }))
    const rex = createDog(account.uid, dog('Rex'))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, {
      dogId: bea.id,
      start: new Date(2026, 9, 10, 11, 30, 0, 0),
      services: LINE,
      extraNotes: [{ id: 'n1', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
    })
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
    const beaRow = screen.getByRole('button', { name: 'Apri Bea' })
    const beaName = within(beaRow).getByText('Bea')
    const altro = within(beaRow).getByText('altro')
    expect(beaName.parentElement?.contains(altro)).toBe(true)
    expect(within(beaRow).queryByText('Pelo cortissimo')).not.toBeInTheDocument()
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

  it('da chiudere in home usa gli stessi minuti della notifica', async () => {
    vi.setSystemTime(new Date(2026, 9, 29, 14, 20, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    savePushPrefs(account.uid, { enabled: true, updates: false, complete: true, completeAfterMin: 15 })
    const ciccio = createDog(account.uid, dog('Ciccio'))
    createAppointment(account.uid, {
      dogId: ciccio.id,
      start: new Date(2026, 9, 29, 13, 0, 0, 0),
      services: LINE,
    })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completato Ciccio' })).toBeInTheDocument()
  })

  it('un cane con extraNotes e una visita senza note non mostra altro', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const bea = createDog(account.uid, dog('Bea', {
      extraNotes: [{ id: 'n1', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
    }))
    createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 10, 11, 30, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    const beaRow = await screen.findByRole('button', { name: 'Apri Bea' })
    expect(within(beaRow).getByText('Bea')).toBeInTheDocument()
    expect(within(beaRow).queryByText('altro')).not.toBeInTheDocument()
    expect(within(beaRow).queryByText('Pelo cortissimo')).not.toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'Non venuto Rex' }).parentElement).toBe(actions)
    expect(screen.getByRole('button', { name: 'Disdetto Rex' }).parentElement).toBe(actions)
    expect(actions.getAttribute('style')).toContain('display: flex')
    expect(actions.getAttribute('style')).not.toContain('flex-direction: column')
    expect(actions.style.flexWrap).toBe('nowrap')
    expect(actions.style.flexWrap).not.toBe('wrap')
    expect(actions.getAttribute('style')).toContain('gap: 6px')
    expect(within(actions).getAllByRole('button').map((button) => button.textContent)).toEqual(['Completato', 'Non venuto', 'Disdetto'])
    for (const button of within(actions).getAllByRole('button')) {
      const style = button.getAttribute('style') ?? ''
      expect(style).toContain('flex-grow: 1')
      expect(style).not.toMatch(/min-height:\s*44px/)
      expect(button.style.minHeight).not.toBe('44px')
      expect(style).toMatch(/(?:^|; )width: auto/)
      expect(style).toContain('white-space: nowrap')
      expect(style).toContain('padding: 4px 6px')
      expect(style).toContain('font-size: 12px')
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

  it('Da chiudere senza scheda spiega che il cane manca e non offre la chiusura', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createAppointment(account.uid, { dogId: 'cane-sparito', start: new Date(2026, 9, 8, 9, 15, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    expect(screen.getByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(screen.getByText('Cane assente')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completato cane' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Non venuto cane' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disdetto cane' })).not.toBeInTheDocument()
    expect(screen.getByText('La scheda non è più nel salone')).toBeInTheDocument()
    const rimuovi = screen.getByRole('button', { name: 'Rimuovi dalla lista' })
    const rimuoviStyle = rimuovi.getAttribute('style') ?? ''
    expect(rimuoviStyle).not.toMatch(/min-height:\s*44px/)
    expect(rimuovi.style.width).toBe('auto')
    expect(rimuoviStyle).not.toMatch(/(?:^|; )width:\s*100%/)
    expect(rimuoviStyle).toContain('white-space: nowrap')
    expect(rimuoviStyle).toContain('padding: 4px 6px')
    expect(rimuoviStyle).toContain('font-size: 12px')
    expect(rimuoviStyle).toContain('flex-grow: 1')
  })

  it('Rimuovi dalla lista toglie la visita senza scheda e non la conta negli incassi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE }).id)
    const orfana = createAppointment(account.uid, {
      dogId: 'cane-sparito',
      start: new Date(2026, 9, 8, 9, 15, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 80 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(screen.getByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rimuovi dalla lista' }))
    expect(screen.getByRole('heading', { name: 'Togliere questa visita dalla lista?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Rimuovi$/ }))
    expect(screen.queryByRole('heading', { name: /Da chiudere/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Cane assente')).not.toBeInTheDocument()
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(map[orfana.id]).toBeUndefined()
    expect(Object.values(map).every((item) => item.status !== 'completato' || !('total' in item) || (item as { total?: number }).total !== 80)).toBe(true)
    expect(screen.getByRole('link', { name: 'Incassi di oggi: 20 euro. Apri incassi' })).toBeInTheDocument()
    expect(screen.queryByText('€ 80')).not.toBeInTheDocument()
    expect(screen.queryByText('€ 100')).not.toBeInTheDocument()
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
    expect(screen.queryByRole('dialog', { name: 'Cane pronto' })).not.toBeInTheDocument()
  })

  it('Usa premio premuto sulla tessera azzera la visita anche chiudendo da home', async () => {
    pianoForzato.valore = {
      mostraPiani: false,
      abbonamentiAttivi: true,
      stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, new Date(2026, 9, 10, 12, 0, 0, 0)),
      funzioni: {},
      provaUsata: true,
      paywall: null,
      esitoProva: 'spento',
      messaggioProva: '',
      apriPaywall: () => undefined,
      chiudiPaywall: () => undefined,
      prova: async () => undefined,
      avvisa: async () => undefined,
    }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    const past = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...settings,
      fedeltaAccesa: true,
      premiInAttesa: { [rex.id]: true, [luna.id]: true },
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('button', { name: 'Completato Rex' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Completato Rex' }))
    await user.click(screen.getByRole('button', { name: 'POS' }))
    await user.click(screen.getByRole('button', { name: 'Nessuna modifica' }))
    const salvata = (JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; total?: number; adjustmentNote?: string }>)[past.id]
    expect(salvata).toMatchObject({ status: 'completato', total: 0, adjustmentNote: 'Premio fedeltà' })
    expect(getSettings(account.uid).premiInAttesa).toEqual({ [luna.id]: true })
  })

  it('con il pronto manuale, dopo Completato chiede se mandare la mail', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { contact: { name: 'Ada', phone: '333', email: 'ada@cliente.it' } }))
    const past = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...settings,
      serviziEmail: { pronto: { modo: 'manuale' } },
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('button', { name: 'Completato Rex' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Completato Rex' }))
    await user.click(screen.getByRole('button', { name: 'POS' }))
    await user.click(screen.getByRole('button', { name: 'Nessuna modifica' }))
    expect(statusOf(account.uid, past.id).status).toBe('completato')
    expect(screen.getByRole('dialog', { name: 'Cane pronto' })).toBeInTheDocument()
    expect(screen.getByText('Vuoi mandare la mail che Rex è pronto?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Non ora' }))
    expect(screen.queryByRole('dialog', { name: 'Cane pronto' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).codaEmail?.some((riga) => riga.tipo === 'pronto')).toBeFalsy()
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

  it('il collaboratore non vede la fascia fiscale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(screen.queryByText('Aggiungi partita IVA o codice fiscale')).not.toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Gestisci account Groomly' })).toBeInTheDocument()
    const dialog = await screen.findByRole('dialog', { name: 'Toelettatura' })
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
    expect(personal.getAttribute('style')).toContain('background: var(--personal-s)')
    expect(within(personal).getByText('Personale')).toBeInTheDocument()
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

  it('in inglese titolo, stato vuoto e pulsante seguono la lingua e il nome del cane resta', async () => {
    localStorage.setItem('groomly.lingua', 'en')
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Calendar ›' })).toBeInTheDocument()
    expect(screen.getAllByText('Luna').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open Luna' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Oggi' })).not.toBeInTheDocument()
    expect(screen.queryByText('No appointments')).not.toBeInTheDocument()
  })

  it('in inglese un oggi vuoto dice No appointments e offre New appointment', async () => {
    localStorage.setItem('groomly.lingua', 'en')
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('No appointments')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New appointment' })).toBeInTheDocument()
  })

  it('con il piano Pro la home non scrive le frasi dei servizi ancora vuoti', async () => {
    pianoForzato.valore = {
      mostraPiani: false,
      abbonamentiAttivi: true,
      stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, new Date(2026, 9, 10, 12, 0, 0, 0)),
      funzioni: {},
      provaUsata: true,
      paywall: null,
      esitoProva: 'spento',
      messaggioProva: '',
      apriPaywall: () => undefined,
      chiudiPaywall: () => undefined,
      prova: async () => undefined,
      avvisa: async () => undefined,
    }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { contact: { name: 'Anna', phone: '3331234567' } }))
    createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 11, 10, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Avvisi di domani' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Prenotazioni online' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Lista d’attesa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Strumenti' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Apri WhatsApp' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Segna inviato' })).not.toBeInTheDocument()
    expect(screen.queryByText('Nessuna richiesta')).not.toBeInTheDocument()
    expect(screen.queryByText('Nessun avviso per domani')).not.toBeInTheDocument()
    expect(screen.queryByText(/parte automatica non è ancora pronta/)).not.toBeInTheDocument()
    expect(screen.queryByText('Scrivi su WhatsApp')).not.toBeInTheDocument()
    expect(screen.queryByText('Nota vocale')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuova pagella' })).not.toBeInTheDocument()
    expect(screen.getByText('Mensili ott')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Listino/ }).length).toBeGreaterThan(0)
  })

  it('con importi nascosti il riquadro mostra •••', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.settings(account.uid), { ...blankSettings('auto', '2026-10-10T00:00:00.000Z'), ui: { hideAmounts: true } })
    render(<App memory isDev={false} initialPath="/" />)
    const tile = await screen.findByRole('link', { name: 'Incassi di oggi: nascosti. Apri incassi' })
    expect(within(tile).getByText('•••')).toBeInTheDocument()
  })
})

describe('home, coda del salone', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-27T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('con piano Pro, promemoria automatico e una visita di domani con email mostra il cane e Promemoria; spento non mostra la card; Ferma salva fermata', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const nina = createDog(account.uid, dog('Nina', { contact: { name: 'Ada', phone: '333', email: 'nina@cliente.it' } }))
    createAppointment(account.uid, { dogId: nina.id, start: new Date('2026-10-28T08:00:00.000Z'), services: LINE })
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...settings,
      serviziEmail: { promemoria: { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' } },
    })
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('Nina')).toBeInTheDocument()
    expect(screen.getByText('Promemoria')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ferma' }))
    const salvate = JSON.parse(localStorage.getItem(storageKeys.settings(account.uid))!) as {
      codaEmail?: { stato?: string; motivo?: string; nomeCane?: string }[]
    }
    expect(salvate.codaEmail).toEqual(expect.arrayContaining([
      expect.objectContaining({ stato: 'fermata', motivo: 'fermata', nomeCane: 'Nina' }),
    ]))
    view.unmount()
    const spente = JSON.parse(localStorage.getItem(storageKeys.settings(account.uid))!) as { serviziEmail?: unknown }
    writeJson(storageKeys.settings(account.uid), {
      ...getSettings(account.uid),
      ...spente,
      serviziEmail: { promemoria: { modo: 'spento' } },
    })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByText('Nina')).not.toBeInTheDocument()
    expect(screen.queryByText('Promemoria')).not.toBeInTheDocument()
  })
})
