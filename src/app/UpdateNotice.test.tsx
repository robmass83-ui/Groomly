// @vitest-environment happy-dom
import { Browser } from '@capacitor/browser'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UpdateNotice } from './UpdateNotice'

vi.mock('@capacitor/browser', () => ({
  Browser: { open: vi.fn() },
}))

describe('avviso di aggiornamento', () => {
  beforeEach(() => {
    vi.mocked(Browser.open).mockClear()
  })

  it('mostra la versione nuova e apre il file', async () => {
    const user = userEvent.setup()
    render(<UpdateNotice release={{ version: '9.0.0', url: 'https://github.com/robmass83-ui/Groomly/releases/download/v9.0.0/groomly.apk' }} />)
    expect(screen.getByRole('dialog', { name: 'Aggiornamento disponibile' })).toBeInTheDocument()
    expect(screen.getByText(/versione 9\.0\.0/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://github.com/robmass83-ui/Groomly/releases/download/v9.0.0/groomly.apk' })
  })

  it('non compare se la release è quella già installata e si chiude con Più tardi', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<UpdateNotice release={{ version: '1.1.0', url: 'https://github.com/apk' }} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<UpdateNotice release={{ version: '1.2.0', url: 'https://github.com/apk' }} />)
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
