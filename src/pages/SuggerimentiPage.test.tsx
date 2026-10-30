// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'

async function apriPagina() {
  await createAccount('maria@salone.it', 'segretissimo')
  const account = getAccount()
  if (!account) throw new Error('account assente')
  writeJson(storageKeys.auth, { ...account, role: 'titolare' })
  render(<App memory isDev={false} initialPath="/impostazioni/suggerimenti" />)
}

describe('Suggerimenti', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('prima si sceglie la categoria, senza guida, novità e notifiche', async () => {
    await apriPagina()
    expect(await screen.findByRole('group', { name: 'Che cosa vorresti suggerire?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Qualcosa non funziona/ })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Guida rapida')).not.toBeInTheDocument()
    expect(screen.queryByText('Novità')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Notifiche' })).not.toBeInTheDocument()
  })

  it('una categoria apre il popup per scrivere', async () => {
    await apriPagina()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Qualcosa non funziona/ }))
    const popup = screen.getByRole('dialog', { name: 'Qualcosa non funziona' })
    await user.type(within(popup).getByRole('textbox', { name: 'Scrivi qui' }), 'corto')
    await user.click(within(popup).getByRole('button', { name: 'Invia' }))
    expect(within(popup).getByText('Scrivi almeno 10 caratteri.')).toBeInTheDocument()
    await user.click(within(popup).getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('le parti dell’app si aprono e portano al loro popup', async () => {
    await apriPagina()
    const user = userEvent.setup()
    expect(screen.queryByRole('button', { name: /Schede degli animali/ })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /Una parte dell’app/ }))
    await user.click(screen.getByRole('button', { name: /Schede degli animali/ }))
    expect(screen.getByRole('dialog', { name: 'Schede degli animali' })).toBeInTheDocument()
  })
})
