// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScaricaAccount } from './ScaricaAccount'

const m = vi.hoisted(() => ({
  leggi: vi.fn(async () => ({ email: 'a@b.it' })),
  scarica: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('../../data/firebase/enabled', () => ({ firebaseEnabled: () => true }))
vi.mock('../../data/firebase/client', () => ({ leggiMioAccount: m.leggi }))
vi.mock('../../lib/shareFile', () => ({ downloadAnchor: m.scarica, shareFiles: vi.fn(), isShareCancel: () => false }))
vi.mock('../layout/Toast', () => ({ useToast: () => ({ show: m.toast }) }))

describe('ScaricaAccount', () => {
  beforeEach(() => {
    localStorage.setItem('groomly.lingua', 'it')
    m.scarica.mockClear()
    m.toast.mockClear()
    m.leggi.mockClear()
  })

  it('scarica il file con i dati dell’account', async () => {
    const user = userEvent.setup()
    render(<ScaricaAccount />)
    await user.click(screen.getByRole('button', { name: /Scarica i miei dati/ }))
    await waitFor(() => expect(m.scarica).toHaveBeenCalledTimes(1))
    expect(m.scarica.mock.calls[0]?.[1]).toBe('groomly-account.json')
  })

  it('se la lettura fallisce avvisa', async () => {
    m.leggi.mockRejectedValueOnce(new Error('no'))
    const user = userEvent.setup()
    render(<ScaricaAccount />)
    await user.click(screen.getByRole('button', { name: /Scarica i miei dati/ }))
    await waitFor(() => expect(m.toast).toHaveBeenCalled())
    expect(m.scarica).not.toHaveBeenCalled()
  })
})
