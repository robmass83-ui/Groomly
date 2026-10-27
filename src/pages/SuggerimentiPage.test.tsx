// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'

describe('Suggerimenti', () => {
  it('è un modulo, senza guida, novità e notifiche', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const account = getAccount()
    if (!account) throw new Error('account assente')
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    render(<App memory isDev={false} initialPath="/impostazioni/suggerimenti" />)
    expect(await screen.findByRole('radiogroup', { name: 'Che cosa vorresti suggerire?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Agenda, orari o appuntamenti' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Qualcosa non funziona' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Guida rapida')).not.toBeInTheDocument()
    expect(screen.queryByText('Novità')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Notifiche' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Schede degli animali' }))
    expect(screen.getByRole('radio', { name: 'Schede degli animali' })).toHaveAttribute('aria-checked', 'true')
  })
})
