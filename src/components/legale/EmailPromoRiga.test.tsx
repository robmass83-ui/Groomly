// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EmailPromoRiga } from './EmailPromoRiga'

const m = vi.hoisted(() => ({
  account: { uid: 'u', role: 'collaboratore' } as Record<string, unknown>,
  chiama: vi.fn(async () => undefined),
  replaceAccount: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('../../hooks/useSession', () => ({ useSession: () => ({ gate: { kind: 'in', account: m.account }, replaceAccount: m.replaceAccount }) }))
vi.mock('../../data/firebase/enabled', () => ({ firebaseEnabled: () => true }))
vi.mock('../../data/firebase/client', () => ({ callImpostaEmailPromo: m.chiama }))
vi.mock('../layout/Toast', () => ({ useToast: () => ({ show: m.toast }) }))

describe('EmailPromoRiga', () => {
  beforeEach(() => {
    localStorage.setItem('groomly.lingua', 'it')
    m.account = { uid: 'u', role: 'collaboratore' }
    m.chiama.mockReset()
    m.chiama.mockResolvedValue(undefined)
    m.replaceAccount.mockClear()
  })

  it('senza risposta è spento, anche il collaboratore lo vede e lo accende', async () => {
    const user = userEvent.setup()
    render(<EmailPromoRiga />)
    const interruttore = screen.getByRole('switch', { name: 'Email con promozioni e novità' })
    expect(interruttore).toHaveAttribute('aria-checked', 'false')
    await user.click(interruttore)
    expect(m.chiama).toHaveBeenCalledWith(true, 'account')
    await waitFor(() => expect(m.replaceAccount).toHaveBeenCalled())
  })

  it('se il server fallisce torna com’era', async () => {
    m.chiama.mockRejectedValue(new Error('no'))
    const user = userEvent.setup()
    render(<EmailPromoRiga />)
    await user.click(screen.getByRole('switch'))
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false'))
    expect(m.toast).toHaveBeenCalled()
  })
})
