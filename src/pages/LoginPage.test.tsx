// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { storageKeys } from '../data/local/storage'

describe('login', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('crea l\u2019account e al rimontaggio resta in Home', async () => {
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} />)
    await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
    await user.type(screen.getByLabelText('Password'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    view.unmount()
    render(<App memory isDev={false} />)
    expect(screen.getByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crea accesso' })).not.toBeInTheDocument()
  })

  it('rifiuta la password sbagliata e non apre le rotte senza sessione', async () => {
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} />)
    await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
    await user.type(screen.getByLabelText('Password'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
    await screen.findByRole('heading', { name: 'Groomly' })
    view.unmount()
    localStorage.removeItem(storageKeys.session)
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(screen.getByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crea accesso' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Password'), 'sbagliata')
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(await screen.findByText('Email o password non corretti')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
  })

  it('mostra i dati illeggibili senza cancellarli', () => {
    localStorage.setItem(storageKeys.auth, '{')
    render(<App memory isDev={false} />)
    expect(screen.getByText('Dati locali illeggibili')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.auth)).toBe('{')
  })

  it('non registra /dev/kit quando non è sviluppo', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/dev/kit" />)
    await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
    await user.type(screen.getByLabelText('Password'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Kit' })).not.toBeInTheDocument()
  })
})
