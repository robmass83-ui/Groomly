// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dog } from '../../types/models'
import { EmailCliente } from './EmailCliente'

const m = vi.hoisted(() => ({
  account: { uid: 'u', role: 'titolare', salonId: 'u' } as Record<string, unknown>,
  chiama: vi.fn(async () => undefined),
  toast: vi.fn(),
}))

vi.mock('../../hooks/useSession', () => ({ useSession: () => ({ gate: { kind: 'in', account: m.account } }) }))
vi.mock('../../data/firebase/enabled', () => ({ firebaseEnabled: () => true }))
vi.mock('../../data/firebase/client', () => ({ callImpostaEmailCliente: m.chiama }))
vi.mock('../layout/Toast', () => ({ useToast: () => ({ show: m.toast }) }))

function cane(extra: Partial<Dog> = {}): Dog {
  return { id: 'd', contact: { name: 'Ada', phone: '3', email: 'ada@cliente.it' }, ...extra } as Dog
}

describe('EmailCliente', () => {
  beforeEach(() => {
    localStorage.setItem('groomly.lingua', 'it')
    m.account = { uid: 'u', role: 'titolare', salonId: 'u' }
    m.chiama.mockReset()
    m.chiama.mockResolvedValue(undefined)
    m.toast.mockClear()
  })

  it('titolare e socio lo vedono se c’è un’email', () => {
    render(<EmailCliente dog={cane()} salvaLocale={() => true} />)
    expect(screen.getByRole('switch', { name: 'Email al cliente' })).toHaveAttribute('aria-checked', 'true')
  })

  it('non si vede senza email, al collaboratore e in shared', () => {
    const { unmount } = render(<EmailCliente dog={cane({ contact: { name: 'A', phone: '3' } })} salvaLocale={() => true} />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    unmount()
    m.account = { uid: 'u', role: 'collaboratore', salonId: 's' }
    const secondo = render(<EmailCliente dog={cane()} salvaLocale={() => true} />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    secondo.unmount()
    m.account = { uid: 'u', role: 'titolare', salonId: 'shared' }
    render(<EmailCliente dog={cane()} salvaLocale={() => true} />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('toccarlo chiama il server con il blocco opposto', async () => {
    const user = userEvent.setup()
    render(<EmailCliente dog={cane({ emailBloccata: true })} salvaLocale={() => true} />)
    const interruttore = screen.getByRole('switch')
    expect(interruttore).toHaveAttribute('aria-checked', 'false')
    await user.click(interruttore)
    expect(m.chiama).toHaveBeenCalledWith('d', false)
    expect(interruttore).toHaveAttribute('aria-checked', 'true')
  })

  it('se il server fallisce torna com’era e avvisa', async () => {
    m.chiama.mockRejectedValue(new Error('no'))
    const user = userEvent.setup()
    render(<EmailCliente dog={cane()} salvaLocale={() => true} />)
    await user.click(screen.getByRole('switch'))
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'))
    expect(m.toast).toHaveBeenCalled()
  })

  it('un’email appena cambiata resta spenta finché il salone non la riaccende', () => {
    render(<EmailCliente dog={cane({ emailBloccata: true, contact: { name: 'Ada', phone: '3', email: 'nuova@cliente.it' } })} salvaLocale={() => true} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })
})
