// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { AppError } from '../data/errors'
import { createAccount } from '../data/local/auth'

const directory = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../data/firebase/client')>('../data/firebase/client')
  return { ...actual, listSalonDirectory: (...args: unknown[]) => directory.load(...args) }
})

describe('utenti', () => {
  beforeEach(() => {
    localStorage.clear()
    directory.load.mockReset()
  })

  it('nasconde Utenti e rimanda un non operatore alle impostazioni senza caricare la directory', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const view = render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(screen.queryByRole('link', { name: 'Utenti' })).not.toBeInTheDocument()

    view.unmount()
    render(<App memory isDev={false} initialPath="/impostazioni/utenti" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(directory.load).not.toHaveBeenCalled()
  })

  it('mostra Utenti all’operatrice e segnala che l’elenco non è disponibile', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockRejectedValue(new AppError('Connessione assente', 'auth_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })

    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    expect(await screen.findByText('Elenco non disponibile')).toBeInTheDocument()
    expect(screen.queryByText('Connessione assente')).not.toBeInTheDocument()
  })

  it('mostra il riepilogo e le toelettature senza rendere cliccabili i titolari', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 2,
      salonCount: 1,
      entries: [{ uid: 'a', ownerName: 'Ada Neri', salonName: 'Bauci' }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })

    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    expect(await screen.findByText('2 account creati')).toBeInTheDocument()
    expect(screen.getByText('1 toelettatura creata')).toBeInTheDocument()
    expect(screen.getByText('Ada Neri')).toBeInTheDocument()
    expect(screen.getByText('Bauci')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ada Neri/ })).not.toBeInTheDocument()
  })

  it('cerca per titolare o salone senza troncare i nomi', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 2,
      salonCount: 2,
      entries: [
        { uid: 'a', ownerName: 'Ada Neri', salonName: 'Bauci' },
        { uid: 'b', ownerName: 'Leo Verdi', salonName: 'Pelo Lungo Quattro Parole' },
      ],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    const search = await screen.findByRole('textbox', { name: 'Cerca' })
    const salon = screen.getByText('Pelo Lungo Quattro Parole')
    expect(salon.getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')
    expect(salon.getAttribute('style') ?? '').not.toContain('ellipsis')
    expect(salon.getAttribute('style') ?? '').not.toContain('nowrap')
    expect(screen.getByText('Leo Verdi').getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')
    await user.type(search, 'ADA')
    expect(screen.getByText('Ada Neri')).toBeInTheDocument()
    expect(screen.queryByText('Leo Verdi')).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'quattro')
    expect(screen.queryByText('Ada Neri')).not.toBeInTheDocument()
    expect(screen.getByText('Pelo Lungo Quattro Parole')).toBeInTheDocument()
  })
})
