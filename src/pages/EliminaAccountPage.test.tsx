// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'

const forzato = vi.hoisted(() => ({ ruolo: null as null | { role: string; salonId?: string }, salone: '' }))
vi.mock('../hooks/useSession', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSession')>('../hooks/useSession')
  return {
    ...actual,
    useSession: () => {
      const s = actual.useSession()
      if (!forzato.ruolo || s.gate.kind !== 'in') return s
      return { ...s, gate: { ...s.gate, account: { ...s.gate.account, ...forzato.ruolo } } }
    },
  }
})
vi.mock('../hooks/useSettings', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSettings')>('../hooks/useSettings')
  return {
    ...actual,
    useSettings: () => {
      const r = actual.useSettings()
      if (!forzato.salone) return r
      return { ...r, settings: { ...r.settings, business: { ...r.settings.business, salonName: forzato.salone } } }
    },
  }
})

describe('elimina account', () => {
  beforeEach(() => {
    localStorage.clear()
    forzato.ruolo = null
    forzato.salone = ''
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
    expect(await screen.findByRole('alert')).toHaveTextContent('Password sbagliata')
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

  it('titolare: elenco dati, passo backup e nome del salone valido', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    forzato.salone = 'Pelosetti'
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/account/elimina" />)
    expect(await screen.findByText(/Profilo, salone, cani/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.getByRole('heading', { name: /Prima salva/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await user.type(screen.getByLabelText('Password attuale'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    const conferma = await screen.findByRole('button', { name: 'Sì, elimina l’account' })
    await user.type(screen.getByLabelText('ELIMINA'), 'Pelosetti')
    expect(conferma).toBeEnabled()
  })

  it.each([
    ['collaboratore', { role: 'collaboratore', salonId: 'altro' }],
    ['socio di un salone altrui', { role: 'socio', salonId: 'altro' }],
  ])('%s: niente elenco né backup, si scrive solo ELIMINA', async (_n, ruolo) => {
    await createAccount('ada@salone.it', 'segretissimo')
    forzato.ruolo = ruolo
    forzato.salone = 'Pelosetti'
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/account/elimina" />)
    expect(await screen.findByText('Si cancella solo il tuo account. I dati del salone restano al titolare.')).toBeInTheDocument()
    expect(screen.queryByText(/Profilo, salone, cani/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.queryByRole('heading', { name: /Prima salva/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Salva/ })).not.toBeInTheDocument()
    // passo 3 (testo membro), poi password
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await user.type(screen.getByLabelText('Password attuale'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    expect(await screen.findByRole('heading', { name: 'Scrivi ELIMINA' })).toBeInTheDocument()
    const conferma = screen.getByRole('button', { name: 'Sì, elimina l’account' })
    await user.type(screen.getByLabelText('ELIMINA'), 'Pelosetti')
    expect(conferma).toBeDisabled()
    await user.clear(screen.getByLabelText('ELIMINA'))
    await user.type(screen.getByLabelText('ELIMINA'), ' ELIMINA ')
    expect(conferma).toBeEnabled()
  })
})
