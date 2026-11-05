// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/layout/Toast'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { APP_VERSION } from '../../lib/appVersion'
import { SistemaPage } from './SistemaPage'

const dati = vi.hoisted(() => ({ contatori: { emailOggi: 120, feedbackOrfani: 0 } as { emailOggi: number; feedbackOrfani: number } | null }))

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))
vi.mock('../../data/firebase/client', () => ({ callImpostaTour: vi.fn() }))
vi.mock('../../components/admin/AdminDati', () => ({
  useAdminDati: () => ({ config: { tour: { acceso: false, dal: null } }, contatori: dati.contatori }),
}))

function apri(risposta: () => Promise<unknown>) {
  vi.stubGlobal('fetch', vi.fn(risposta))
  render(<LinguaProvider><ToastProvider><MemoryRouter><SistemaPage /></MemoryRouter></ToastProvider></LinguaProvider>)
}

const release = async () => ({ ok: true, json: async () => ({ version: '9.9.9' }) })

describe('Sistema', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    dati.contatori = { emailOggi: 120, feedbackOrfani: 0 }
  })

  it('mostra la versione installata e quella pubblicata', async () => {
    apri(release)
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument()
    expect(await screen.findByText('9.9.9')).toBeInTheDocument()
  })

  it('se release.json non risponde resta un trattino', async () => {
    apri(async () => { throw new Error('rete') })
    expect(await screen.findByText('—')).toBeInTheDocument()
  })

  it('ha il tour e l’email di oggi', () => {
    apri(release)
    expect(screen.getByRole('switch', { name: 'Tour di benvenuto per i nuovi iscritti' })).toBeInTheDocument()
    expect(screen.getByText('Email oggi: 120 su 300')).toBeInTheDocument()
  })

  it('i link rapidi si aprono fuori e senza referrer', () => {
    apri(release)
    for (const nome of ['Firebase', 'Play Console', 'Brevo', 'RevenueCat']) {
      const link = screen.getByRole('link', { name: nome })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noreferrer')
    }
  })

  it('segnala i feedback rimasti di saloni eliminati solo se ci sono', () => {
    dati.contatori = { emailOggi: 0, feedbackOrfani: 3 }
    apri(release)
    expect(screen.getByText('Feedback di saloni eliminati: 3')).toBeInTheDocument()
  })
})
