// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/layout/Toast'
import { SettingsProvider } from '../hooks/useSettings'
import { HomePage } from './HomePage'

const mocks = vi.hoisted(() => ({
  firebase: true,
  legacy: true,
  emailVerified: false,
  resendVerification: vi.fn((): Promise<void> => Promise.resolve()),
}))

vi.mock('../data/firebase/enabled', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/firebase/enabled')>()
  return { ...actual, firebaseEnabled: () => mocks.firebase }
})

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    gate: { kind: 'in', account: { uid: 'u1', email: 'laura.masala@tiscali.it', firstName: '', lastName: '', salonId: 'u1', legacy: mocks.legacy } },
    entry: { kind: 'home' },
    emailVerified: mocks.emailVerified,
    legacy: mocks.legacy,
    hasAccountDoc: true,
    resendVerification: mocks.resendVerification,
  }),
}))

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <SettingsProvider>
        <ToastProvider>
          <HomePage />
        </ToastProvider>
      </SettingsProvider>
    </MemoryRouter>,
  )
}

describe('home, fascia email', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.firebase = true
    mocks.legacy = true
    mocks.emailVerified = false
    mocks.resendVerification.mockClear()
  })

  it('con Firebase, account storico e email non confermata la fascia sta sopra quella fiscale e Invia rimanda il link', async () => {
    const user = userEvent.setup()
    renderHome()
    const email = await screen.findByRole('region', { name: 'Conferma la tua email' })
    const fiscal = await screen.findByRole('region', { name: 'Completa l\'attività' }, { timeout: 4000 })
    expect(within(email).getByText('Conferma la tua email')).toBeInTheDocument()
    expect(within(email).getByText('Apri il link che ti abbiamo inviato')).toBeInTheDocument()
    expect(email.getAttribute('style')).toContain('background: var(--warn-s)')
    expect(email.compareDocumentPosition(fiscal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(within(email).getByRole('button', { name: 'Invia' }))
    expect(mocks.resendVerification).toHaveBeenCalledTimes(1)
  })

  it('non c’è con l’email già confermata', async () => {
    mocks.emailVerified = true
    renderHome()
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(screen.queryByRole('region', { name: 'Conferma la tua email' })).not.toBeInTheDocument()
  })

  it('non c’è per un account non storico', async () => {
    mocks.legacy = false
    renderHome()
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(screen.queryByRole('region', { name: 'Conferma la tua email' })).not.toBeInTheDocument()
  })

  it('non c’è con Firebase spento', async () => {
    mocks.firebase = false
    renderHome()
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(screen.queryByRole('region', { name: 'Conferma la tua email' })).not.toBeInTheDocument()
  })
})
