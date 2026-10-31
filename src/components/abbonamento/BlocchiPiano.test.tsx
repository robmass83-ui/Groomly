// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/providers'
import { createAccount } from '../../data/local/auth'
import { getSettings } from '../../data/local/settings'
import { storageKeys, writeJson } from '../../data/local/storage'
import type { PianoValore } from '../../hooks/usePiano'
import { statoPiano } from '../../lib/piano'
import { BloccoGo, BloccoPlus, BloccoSalone } from './BlocchiPiano'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/usePiano')>('../../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

function pianoGo(apriPaywall: (feature: string) => void): PianoValore {
  return { ...pianoCon('pro'), stato: statoPiano(undefined, new Date(2026, 9, 27)), apriPaywall, livelloNome: 'base' }
}

function pianoCon(piano: 'pro' | 'salone'): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: false,
    tour: { acceso: false, dal: null },
    stato: statoPiano({ piano, stato: 'attivo', fonte: 'manuale' }, new Date(2026, 9, 27)),
    provaUsata: true,
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall: () => undefined,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
    livelloNome: piano,
  }
}

function monta(children: ReactNode) {
  return render(
    <Providers>
      <MemoryRouter>{children}</MemoryRouter>
    </Providers>,
  )
}

describe('blocco Go', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('ha i messaggi accesi e l’affidabilità spenta, senza toccare le impostazioni', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    monta(<BloccoGo />)
    expect(await screen.findByRole('switch', { name: 'Messaggi WhatsApp' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'Affidabilità' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByText('Note vocali')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Informazioni su Affidabilità' })).toBeInTheDocument()
    expect(getSettings(account.uid).strumenti).toBeUndefined()
  })
})

describe('blocco Plus', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('mostra i servizi Plus, le righe in sviluppo e niente Pagella', async () => {
    await createAccount('paola@salone.it', 'segretissimo')
    pianoForzato.valore = pianoCon('pro')
    monta(<BloccoPlus />)
    expect(await screen.findByRole('switch', { name: 'Cane pronto' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Prenotazioni online' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('button', { name: 'Informazioni su Promemoria' })).toBeInTheDocument()
    expect(screen.getByText('WhatsApp automatico')).toBeInTheDocument()
    expect(screen.getAllByText('In sviluppo')).toHaveLength(2)
    expect(screen.getByText('WhatsApp automatico').closest('button')).toBeNull()
    expect(screen.getByText('Richiamo').closest('button')).toBeNull()
    expect(screen.queryByText('Pagella')).not.toBeInTheDocument()
    expect(screen.queryByText('Copie delle foto')).not.toBeInTheDocument()
  })

  it('il collaboratore vede gli interruttori bloccati e il tocco non apre il foglio', async () => {
    const account = await createAccount('leo@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    pianoForzato.valore = pianoCon('pro')
    const user = userEvent.setup()
    monta(<BloccoPlus />)
    const promemoria = await screen.findByRole('switch', { name: 'Promemoria' })
    expect(promemoria).toHaveAttribute('aria-disabled', 'true')
    await user.click(promemoria)
    expect(screen.queryByRole('dialog', { name: 'Promemoria' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).serviziEmail?.promemoria).toBeUndefined()
  })

  it('il titolare accende il servizio e la fedeltà scrive anche il flag della scheda', async () => {
    const account = await createAccount('ada@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    pianoForzato.valore = pianoCon('pro')
    const user = userEvent.setup()
    monta(<BloccoPlus />)
    await user.click(await screen.findByRole('button', { name: 'Informazioni su Promemoria' }))
    expect(await screen.findByRole('dialog', { name: 'Promemoria' })).toHaveTextContent('Manda da solo un promemoria alla proprietaria prima dell’appuntamento.')
    await user.click(screen.getByRole('button', { name: 'Ho capito' }))
    await user.click(screen.getByRole('switch', { name: 'Promemoria' }))
    expect(getSettings(account.uid).serviziEmail?.promemoria).toEqual({ modo: 'automatico', anticipoGiorni: 1, ora: '18:00' })
    await user.click(screen.getByRole('radio', { name: 'Due giorni prima' }))
    expect(getSettings(account.uid).serviziEmail?.promemoria).toEqual({ modo: 'automatico', anticipoGiorni: 2, ora: '18:00' })
    await user.click(screen.getByRole('switch', { name: 'Cane pronto' }))
    await user.click(await screen.findByRole('button', { name: 'Automatico. La mail parte da sola.' }))
    expect(getSettings(account.uid).serviziEmail?.pronto).toEqual({ modo: 'automatico' })
    await user.click(screen.getByRole('switch', { name: 'Tessera fedeltà' }))
    expect(getSettings(account.uid).fedeltaAccesa).toBe(true)
    expect(getSettings(account.uid).serviziEmail?.fedelta).toEqual({ modo: 'manuale' })
  })
})

describe('blocco Plus in Go', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('le email rimaste accese dalla prova risultano spente, ogni riga ha il segno Plus e il tocco apre solo la finestra', async () => {
    const account = await createAccount('gina@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    const servizi = { promemoria: { modo: 'automatico' as const, anticipoGiorni: 1 as const, ora: '18:00' }, pronto: { modo: 'manuale' as const } }
    writeJson(storageKeys.settings(account.uid), { ...getSettings(account.uid), serviziEmail: servizi })
    const apriPaywall = vi.fn()
    pianoForzato.valore = pianoGo(apriPaywall)
    const user = userEvent.setup()
    monta(<BloccoPlus />)
    const promemoria = await screen.findByRole('switch', { name: 'Promemoria' })
    expect(promemoria).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Cane pronto' })).toHaveAttribute('aria-checked', 'false')
    for (const nome of ['Promemoria', 'Cane pronto', 'Prenotazioni online', 'Lista d’attesa', 'Recensione Google', 'Tessera fedeltà']) {
      const riga = screen.getByRole('switch', { name: nome }).closest('div')
      expect(riga?.textContent).toContain('Plus')
    }
    await user.click(promemoria)
    expect(apriPaywall).toHaveBeenCalledWith('promemoriaAuto')
    expect(getSettings(account.uid).serviziEmail).toEqual(servizi)
  })
})

describe('blocco Salone', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('con Salone attivo Collaboratori risulta incluso', async () => {
    await createAccount('rita@salone.it', 'segretissimo')
    pianoForzato.valore = pianoCon('salone')
    monta(<BloccoSalone />)
    expect(await screen.findByText('Collaboratori')).toBeInTheDocument()
    expect(screen.getAllByText('Inclusa nel piano').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Posti in più')).toBeInTheDocument()
  })

  it('in Go i posti extra non compaiono, Collaboratori ha il segno Salone', async () => {
    await createAccount('lia@salone.it', 'segretissimo')
    pianoForzato.valore = pianoGo(() => undefined)
    monta(<BloccoSalone />)
    expect(await screen.findByText('Collaboratori')).toBeInTheDocument()
    expect(screen.getByLabelText('Salone')).toBeInTheDocument()
    expect(screen.queryByText('Posti in più')).not.toBeInTheDocument()
  })
})
