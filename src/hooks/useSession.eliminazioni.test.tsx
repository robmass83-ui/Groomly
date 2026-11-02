// @vitest-environment happy-dom
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chiaveEliminazioni, impostaAccountEliminazioni, readDeletion, rememberDeletion } from '../lib/tombstone'

const gateMock = vi.hoisted(() => ({ uid: 'A' as string | null }))

vi.mock('../data/local/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('../data/local/auth')>()
  return {
    ...original,
    reconcileSession: () => (gateMock.uid
      ? { kind: 'in', account: { uid: gateMock.uid, email: 'a@x.it', firstName: '', lastName: '' } }
      : { kind: 'out' }),
  }
})

import { SessionProvider } from './useSession'

describe('SessionProvider e lista delle eliminazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    impostaAccountEliminazioni(null)
  })

  it('la lista dell’account è già attiva quando i figli leggono al primo render', () => {
    localStorage.setItem(chiaveEliminazioni('A'), JSON.stringify({ ids: ['d1'] }))
    gateMock.uid = 'A'
    let letto: string[] = []
    function Figlio() {
      letto = readDeletion().ids
      return null
    }
    render(<SessionProvider><Figlio /></SessionProvider>)
    expect(letto).toEqual(['d1'])
  })

  it('senza accesso la lista è vuota e non si scrive', () => {
    gateMock.uid = null
    render(<SessionProvider><span /></SessionProvider>)
    act(() => { rememberDeletion({ ids: ['x'] }) })
    expect(readDeletion().ids).toEqual([])
  })
})
