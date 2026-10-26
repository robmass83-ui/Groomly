// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'

describe('elimina account', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('blocca l’account di Laura prima di ogni passo', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/account/elimina" />)
    expect(await screen.findByText(/non si può eliminare/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continua' })).not.toBeInTheDocument()
    expect(getAccount()?.email).toBe('laura.masala@tiscali.it')
  })

  it('chiede la password e la parola, e senza nuvola non cancella', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/account/elimina" />)
    await user.click(await screen.findByRole('button', { name: 'Continua' }))
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await user.type(screen.getByLabelText('Password attuale'), 'sbagliata')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o password non corretti')
    await user.clear(screen.getByLabelText('Password attuale'))
    await user.type(screen.getByLabelText('Password attuale'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    const conferma = await screen.findByRole('button', { name: 'Sì, elimina l’account' })
    expect(conferma).toBeDisabled()
    await user.type(screen.getByLabelText('ELIMINA'), 'elimina')
    expect(conferma).toBeDisabled()
    await user.clear(screen.getByLabelText('ELIMINA'))
    await user.type(screen.getByLabelText('ELIMINA'), 'ELIMINA')
    expect(conferma).toBeEnabled()
    await user.click(conferma)
    expect(await screen.findByRole('status')).toHaveTextContent('Serve la connessione per eliminare l’account')
    expect(getAccount()?.email).toBe('ada@salone.it')
  })
})