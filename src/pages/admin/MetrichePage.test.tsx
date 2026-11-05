// @vitest-environment happy-dom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/layout/Toast'
import { LinguaProvider } from '../../i18n/LinguaContext'
import type { StatisticheGiorno } from '../../lib/statisticheGiorno'
import { MetrichePage } from './MetrichePage'

const m = vi.hoisted(() => ({ elenco: vi.fn(), scarica: vi.fn() }))

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))
vi.mock('../../data/firebase/adminClient', () => ({ elencoStatistiche: m.elenco }))
vi.mock('../../lib/shareFile', async (original) => ({ ...await original<typeof import('../../lib/shareFile')>(), downloadAnchor: m.scarica }))

function riga(giorno: string, altro: Partial<StatisticheGiorno> = {}): StatisticheGiorno {
  return {
    giorno, saloni: 10, nuovi: 1, attivi1: 3, attivi7: 6, attivi30: 8, attivati: 5, appuntamenti: 12, mediaAppuntamenti: 4,
    coorti: [], avvisami: { plus: 2, salon: 1 }, esclusi: 3, calcolatoIl: `${giorno}T02:30:00.000Z`, ...altro,
  }
}

function apri() {
  render(<LinguaProvider><ToastProvider><MemoryRouter><MetrichePage /></MemoryRouter></ToastProvider></LinguaProvider>)
}

describe('MetrichePage', () => {
  beforeEach(() => {
    localStorage.setItem('groomly.lingua', 'it')
    m.elenco.mockReset()
    m.scarica.mockReset()
  })

  it('senza dati dice che arrivano dopo la prima notte', async () => {
    m.elenco.mockResolvedValue([])
    apri()
    expect(await screen.findByText('I numeri arrivano dopo la prima notte.')).toBeInTheDocument()
  })

  it('se la lettura fallisce lo dice', async () => {
    m.elenco.mockRejectedValue(new Error('no'))
    apri()
    expect(await screen.findByText('Non riesco a leggere i numeri.')).toBeInTheDocument()
  })

  it('le card mostrano l’ultimo giorno e il confronto', async () => {
    m.elenco.mockResolvedValue([riga('2026-10-05', { saloni: 7 }), riga('2026-11-04', { saloni: 10 })])
    apri()
    const carta = (await screen.findAllByText('Saloni'))[0]?.parentElement as HTMLElement
    expect(within(carta).getByText('10')).toBeInTheDocument()
    expect(within(carta).getByText('+3')).toBeInTheDocument()
  })

  it('passare a 90 giorni rilegge', async () => {
    m.elenco.mockResolvedValue([riga('2026-11-04')])
    apri()
    await screen.findAllByText('Saloni')
    expect(m.elenco).toHaveBeenLastCalledWith(30)
    await userEvent.click(screen.getByRole('button', { name: '90 giorni' }))
    await waitFor(() => { expect(m.elenco).toHaveBeenLastCalledWith(90) })
  })

  it('le coorti troppo giovani non mostrano una percentuale', async () => {
    m.elenco.mockResolvedValue([riga('2026-11-04', {
      coorti: [
        { settimana: '2026-09-21', saloni: 4, rimasti7: 2, rimasti30: 1 },
        { settimana: '2026-11-02', saloni: 2, rimasti7: 0, rimasti30: 0 },
      ],
    })])
    apri()
    const tabella = await screen.findByRole('table')
    expect(within(tabella).getByText('50%')).toBeInTheDocument()
    expect(within(tabella).getByText('25%')).toBeInTheDocument()
    expect(within(tabella).getAllByText('—')).toHaveLength(2)
    expect(screen.getByText(/stima/i)).toBeInTheDocument()
  })

  it('porta a Crashlytics e Analytics, senza contare i crash', async () => {
    m.elenco.mockResolvedValue([riga('2026-11-04')])
    apri()
    expect(await screen.findByRole('link', { name: 'Crashlytics' })).toHaveAttribute('href', expect.stringContaining('/crashlytics'))
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute('href', expect.stringContaining('/analytics'))
  })

  it('esporta un file Excel', async () => {
    m.elenco.mockResolvedValue([riga('2026-11-04')])
    apri()
    await userEvent.click(await screen.findByRole('button', { name: 'Esporta Excel' }))
    await waitFor(() => { expect(m.scarica).toHaveBeenCalled() })
    expect(m.scarica.mock.calls[0]?.[1]).toBe('groomly-metriche.xlsx')
  })
})
