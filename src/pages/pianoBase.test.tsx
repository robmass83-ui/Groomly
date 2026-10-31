// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'
import { blankSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { PianoValore } from '../hooks/usePiano'
import { statoPiano } from '../lib/piano'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

describe('titolare base con i piani accesi', () => {
  afterEach(() => {
    pianoForzato.valore = null
    localStorage.clear()
  })

  it('ha la prova e non il link Funzioni Pro', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const account = getAccount()
    if (!account) throw new Error('account assente')
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    const prova = vi.fn(async () => undefined)
    pianoForzato.valore = {
      mostraPiani: true,
      abbonamentiAttivi: false,
      tour: { acceso: false, dal: null },
      stato: statoPiano(undefined, new Date(2026, 9, 25)),
      provaUsata: false,
      paywall: null,
      esitoProva: 'spento',
      messaggioProva: '',
      apriPaywall: vi.fn(),
      chiudiPaywall: () => undefined,
      prova,
      avvisa: async () => undefined,
    }
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Funzioni Plus/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Abbonamento/ })).toHaveAttribute('href', '/impostazioni/abbonamento')
    expect(screen.queryByRole('link', { name: 'Il tuo piano' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Piano, Base' })).not.toBeInTheDocument()
    cleanup()
    render(<App memory isDev={false} initialPath="/impostazioni/piano" />)
    expect(await screen.findByRole('heading', { name: 'Piano' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Profilo base' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Servizio base/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Servizio Plus/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Servizio Salone' })).toBeInTheDocument()
    expect(screen.getByText('Promemoria')).toBeInTheDocument()
    expect(screen.getByText('Prenotazioni online')).toBeInTheDocument()
    expect(screen.getByText('Tessera fedeltà')).toBeInTheDocument()
    expect(screen.getByText('Prima dell’appuntamento')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Prova Plus gratis per 30 giorni' }))
    expect(prova).toHaveBeenCalledOnce()
  })

  it('con il Pro mostra il link da condividere', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    const settings = blankSettings('auto', new Date().toISOString())
    settings.business.salonName = 'I Pelosetti'
    writeJson(storageKeys.settings(account.uid), settings)
    pianoForzato.valore = {
      mostraPiani: false,
      abbonamentiAttivi: false,
      tour: { acceso: false, dal: null },
      stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'omaggio' }, new Date(2026, 9, 25)),
      provaUsata: true,
      paywall: null,
      esitoProva: 'spento',
      messaggioProva: '',
      apriPaywall: () => undefined,
      chiudiPaywall: () => undefined,
      prova: async () => undefined,
      avvisa: async () => undefined,
    }
    render(<App memory isDev={false} initialPath="/impostazioni/piano" />)
    expect(await screen.findByText('https://groomlyapp.it/s/i-pelosetti')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Condividi' })).toBeInTheDocument()
    expect(screen.getByText('Metti questo link nella bio di Instagram o di Facebook.')).toBeInTheDocument()
  })
})
