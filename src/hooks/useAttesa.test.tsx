// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listAttesa, type IscrittoAttesaDoc } from '../data/local/attesa'
import type { NuovoIscritto, useAttesa as UseAttesa } from './useAttesa'

const mocks = vi.hoisted(() => ({
  saveAttesa: vi.fn((..._args: unknown[]): Promise<void> => new Promise<void>(() => undefined)),
  notifySaveFailed: vi.fn(),
  ascolta: 0,
}))

const NUOVO: NuovoIscritto = {
  nome: 'Anna Verdi',
  phone: '3331234567',
  email: 'anna@example.com',
  nomeCane: 'Rex',
  specie: 'cane',
  taglia: 'media',
  servizioId: 'bagno',
  trattamento: 'Bagno',
  durataMin: 45,
}

let useAttesa: typeof UseAttesa

/** Risolve `true` se la promessa si chiude entro un attimo, `false` se resta appesa. */
async function siChiude(promessa: Promise<unknown>): Promise<boolean> {
  return Promise.race([
    promessa.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 200)),
  ])
}

describe('useAttesa senza rete', () => {
  beforeEach(async () => {
    localStorage.clear()
    mocks.saveAttesa.mockReset()
    mocks.saveAttesa.mockImplementation(() => new Promise<void>(() => undefined))
    mocks.notifySaveFailed.mockReset()
    mocks.ascolta = 0
    // Ogni test aspetta che l'hook abbia caricato il finto client (l'ascolto parte subito): senza, il primo import dinamico può prendere il client vero.
    // L'hook importa il client con un import dinamico: i finti vanno registrati prima di caricarlo.
    vi.resetModules()
    vi.doMock('../data/firebase/enabled', () => ({
      firebaseEnabled: () => true,
      notifySaveFailed: () => mocks.notifySaveFailed(),
    }))
    vi.doMock('../data/firebase/client', () => ({
      listenAttesa: async () => { mocks.ascolta += 1; return () => undefined },
      listenAvvisiAttesa: async () => () => undefined,
      saveAttesa: (...args: unknown[]) => mocks.saveAttesa(...args),
    }))
    useAttesa = (await import('./useAttesa')).useAttesa
  })

  it('aggiungi si chiude anche se il cloud non risponde e la riga è già in lista', async () => {
    const { result } = renderHook(() => useAttesa('uid-1'))
    await waitFor(() => expect(mocks.ascolta).toBeGreaterThan(0))
    let chiusa = false
    await act(async () => {
      chiusa = await siChiude(result.current.aggiungi(NUOVO))
    })
    expect(chiusa).toBe(true)
    expect(result.current.iscritti.map((item) => item.nomeCane)).toEqual(['Rex'])
    expect(listAttesa('uid-1')).toHaveLength(1)
    // la scrittura sul cloud parte comunque, ma nessuno la aspetta
    await waitFor(() => expect(mocks.saveAttesa).toHaveBeenCalledTimes(1))
    expect(mocks.notifySaveFailed).not.toHaveBeenCalled()
  })

  it('togli si chiude anche se il cloud non risponde e la riga esce dalla lista', async () => {
    const { result } = renderHook(() => useAttesa('uid-1'))
    await waitFor(() => expect(mocks.ascolta).toBeGreaterThan(0))
    await act(async () => {
      await siChiude(result.current.aggiungi(NUOVO))
    })
    const id = result.current.iscritti[0].id
    let chiusa = false
    await act(async () => {
      chiusa = await siChiude(result.current.togli(id))
    })
    expect(chiusa).toBe(true)
    expect(result.current.iscritti).toHaveLength(0)
    const salvati: IscrittoAttesaDoc[] = listAttesa('uid-1')
    expect(salvati).toHaveLength(1)
    expect(salvati[0].attivo).toBe(false)
    await waitFor(() => expect(mocks.saveAttesa).toHaveBeenCalledTimes(2))
  })

  it('se il cloud rifiuta, avvisa che il salvataggio non è riuscito e la riga resta in locale', async () => {
    mocks.saveAttesa.mockImplementation(() => Promise.reject(new Error('rete')))
    const { result } = renderHook(() => useAttesa('uid-1'))
    await waitFor(() => expect(mocks.ascolta).toBeGreaterThan(0))
    await act(async () => {
      await result.current.aggiungi(NUOVO)
    })
    await waitFor(() => expect(mocks.notifySaveFailed).toHaveBeenCalledTimes(1))
    expect(result.current.iscritti).toHaveLength(1)
  })
})
