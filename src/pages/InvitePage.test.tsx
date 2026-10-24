// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount, type LocalAccount } from '../data/local/auth'
import { storageKeys } from '../data/local/storage'

const desk = vi.hoisted(() => ({
  accept: vi.fn(async (_token?: string) => undefined),
  reload: vi.fn(async (): Promise<LocalAccount | null> => null),
}))

vi.mock('../data/firebase/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/firebase/client')>()
  return {
    ...actual,
    callAcceptInvite: (token: string) => desk.accept(token),
    reloadSignedInAccount: () => desk.reload(),
  }
})

describe('pagina invito', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    desk.accept.mockReset()
    desk.accept.mockResolvedValue(undefined)
    desk.reload.mockReset()
    desk.reload.mockResolvedValue(null)
  })

  it('fuori sessione mostra Invito e il link Entra, senza chiamare e senza il token', () => {
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(screen.getByRole('heading', { name: 'Invito' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entra' })).toHaveAttribute('href', '/login')
    expect(desk.accept).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('dentro sessione accetta una volta e apre la home del salone', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const before = localStorage.getItem(storageKeys.auth)
    desk.reload.mockResolvedValue({ ...account, salonId: 'salone-invitato', role: 'collaboratore' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(desk.accept).toHaveBeenCalledTimes(1)
    expect(desk.accept).toHaveBeenCalledWith('tokensegreto')
    expect(desk.reload).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(storageKeys.auth)).toBe(before)
    expect(document.body.textContent).not.toContain('tokensegreto')
    await user.click(screen.getByRole('link', { name: /^Impostazioni/ }))
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByText('Funzioni Pro')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica attività' })).not.toBeInTheDocument()
  })

  it('invito scaduto resta in pagina e non scrive l’account', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const before = localStorage.getItem(storageKeys.auth)
    desk.accept.mockRejectedValue(new Error('Invito scaduto'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByText('Invito scaduto')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.auth)).toBe(before)
    expect(desk.reload).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Groomly' })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('invito non valido mostra solo quel messaggio', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    desk.accept.mockRejectedValue(new Error('Invito non valido'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByText('Invito non valido')).toBeInTheDocument()
    expect(screen.getByRole('paragraph').textContent).toBe('Invito non valido')
    expect(screen.queryByText('Aspetta un momento e riprova')).not.toBeInTheDocument()
    expect(screen.queryByText('Invio non riuscito')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('functions/')
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('toglie il prefisso della funzione e lascia Invito scaduto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    desk.accept.mockRejectedValue(new Error('functions/failed-precondition: Invito scaduto'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByText('Invito scaduto')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('functions/')
    expect(document.body.textContent).not.toContain('failed-precondition')
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('se la rilettura fallisce apre comunque la home', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const before = localStorage.getItem(storageKeys.auth)
    desk.reload.mockRejectedValue(new Error('rete'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(desk.accept).toHaveBeenCalledTimes(1)
    expect(desk.accept).toHaveBeenCalledWith('tokensegreto')
    expect(screen.queryByText('rete')).not.toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.auth)).toBe(before)
  })
})
