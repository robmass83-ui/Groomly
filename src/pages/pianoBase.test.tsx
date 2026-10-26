// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'
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
    const apriPaywall = vi.fn()
    pianoForzato.valore = {
      mostraPiani: true,
      abbonamentiAttivi: false,
      stato: statoPiano(undefined, new Date(2026, 9, 25)),
      funzioni: {},
      provaUsata: false,
      paywall: null,
      apriPaywall,
      chiudiPaywall: () => undefined,
      avvisa: async () => undefined,
    }
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Funzioni Pro/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abbonamento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Il tuo piano' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Piano, Base' }))
    expect(await screen.findByRole('heading', { name: 'Piano' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Funzioni base/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Funzioni Pro/ })).toBeInTheDocument()
    expect(screen.getByText('Promemoria')).toBeInTheDocument()
    expect(screen.getByText('Prenotazioni online')).toBeInTheDocument()
    expect(screen.getByText('Tessera fedeltà')).toBeInTheDocument()
    expect(screen.getByText('Prima dell’appuntamento')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Prova Pro gratis per 30 giorni' }))
    expect(apriPaywall).toHaveBeenCalledOnce()
  })
})
