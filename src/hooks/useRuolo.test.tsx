// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storageKeys } from '../data/local/storage'
import { writeSignInHint } from '../data/local/signInHint'
import { SessionProvider, useSession } from './useSession'
import { useRuolo } from './useRuolo'

const cloud = vi.hoisted(() => ({ onAccount: null as ((account: unknown) => void) | null }))

vi.mock('../data/firebase/enabled', async (importOriginal) => ({
  ...await importOriginal<typeof import('../data/firebase/enabled')>(),
  firebaseEnabled: () => true,
}))

vi.mock('../data/firebase/client', () => ({
  watchAuth: (listener: (account: unknown) => void) => {
    cloud.onAccount = listener
    return () => undefined
  },
  lastEmailVerified: () => true,
  salonDaRileggere: () => false,
}))

const ACCOUNT = { uid: 'u1', email: 'masala.roberto@hotmail.it', passwordHash: '', salt: '', iterations: 0, createdAt: '2026-01-01', salonId: '' }

function Sonda() {
  const { admin, caricato } = useRuolo()
  const { entry } = useSession()
  return <p data-testid="ruolo">{`${String(admin)}|${String(caricato)}|${entry.kind}`}</p>
}

async function monta() {
  render(<SessionProvider><Sonda /></SessionProvider>)
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useRuolo', () => {
  beforeEach(() => {
    localStorage.clear()
    cloud.onAccount = null
  })
  afterEach(cleanup)

  it('non è caricato finché Firebase non risponde, poi segue il claim', async () => {
    await monta()
    expect(screen.getByTestId('ruolo').textContent).toMatch(/^false\|false/)
    act(() => cloud.onAccount?.({ ...ACCOUNT, admin: true }))
    expect(screen.getByTestId('ruolo').textContent).toBe('true|true|admin')
  })

  it('chi non ha il claim non è admin', async () => {
    await monta()
    act(() => cloud.onAccount?.({ ...ACCOUNT, salonId: 'u1', email: 'ada@salone.it' }))
    expect(screen.getByTestId('ruolo').textContent).toBe('false|true|home')
  })

  it('all’avvio il segno dell’ultimo accesso admin tiene lontano dal salone', async () => {
    writeSignInHint({ uid: 'u1', email: ACCOUNT.email, admin: true })
    localStorage.setItem(storageKeys.auth, JSON.stringify(ACCOUNT))
    localStorage.setItem(storageKeys.session, 'u1')
    await monta()
    expect(screen.getByTestId('ruolo').textContent).toBe('true|false|admin')
  })

  it('il segno admin cede se Firebase dice il contrario', async () => {
    writeSignInHint({ uid: 'u1', email: ACCOUNT.email, admin: true })
    await monta()
    act(() => cloud.onAccount?.({ ...ACCOUNT, salonId: 'u1' }))
    expect(screen.getByTestId('ruolo').textContent).toBe('false|true|home')
  })
})
