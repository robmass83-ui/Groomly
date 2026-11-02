// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../i18n/LinguaContext'
import { useEsci } from './useEsci'

const logout = vi.hoisted(() => vi.fn())
const modifiche = vi.hoisted(() => vi.fn<(uid: string, attesaMs?: number) => Promise<boolean>>())

vi.mock('./useSession', () => ({
  useSession: () => ({ gate: { kind: 'in', account: { uid: 'u1' } }, logout }),
}))
vi.mock('../data/firebase/client', () => ({ modificheInSospeso: modifiche }))

function Prova() {
  const { esci, foglio, occupato } = useEsci()
  return (
    <>
      <button type="button" onClick={esci} disabled={occupato} data-occupato={occupato ? 'si' : 'no'}>Esci</button>
      {foglio}
    </>
  )
}

function monta() {
  return render(<LinguaProvider><Prova /></LinguaProvider>)
}

const TESTO = 'Ci sono modifiche non ancora salvate online: se esci adesso si perdono.'

describe('useEsci', () => {
  beforeEach(() => { logout.mockReset(); modifiche.mockReset() })
  afterEach(() => cleanup())

  it('senza modifiche in sospeso esce subito, senza foglio', async () => {
    modifiche.mockResolvedValue(false)
    monta()
    fireEvent.click(screen.getByText('Esci'))
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(TESTO)).toBeNull()
    expect(modifiche).toHaveBeenCalledWith('u1')
  })

  it('con modifiche in sospeso mostra l\'avviso; Resta chiude senza uscire', async () => {
    modifiche.mockResolvedValue(true)
    monta()
    fireEvent.click(screen.getByText('Esci'))
    expect(await screen.findByText(TESTO)).toBeTruthy()
    fireEvent.click(screen.getByText('Resta'))
    expect(screen.queryByText(TESTO)).toBeNull()
    expect(logout).not.toHaveBeenCalled()
  })

  it('Esci comunque esce una sola volta anche con doppio tocco', async () => {
    modifiche.mockResolvedValue(true)
    monta()
    fireEvent.click(screen.getByText('Esci'))
    await screen.findByText(TESTO)
    const comunque = screen.getByText('Esci comunque')
    fireEvent.click(comunque)
    fireEvent.click(comunque)
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('doppio tocco su Esci: un solo controllo', async () => {
    let risolvi: (v: boolean) => void = () => undefined
    modifiche.mockReturnValue(new Promise<boolean>((r) => { risolvi = r }))
    monta()
    const esci = screen.getByText('Esci')
    fireEvent.click(esci)
    fireEvent.click(esci)
    await waitFor(() => expect(modifiche).toHaveBeenCalledTimes(1))
    await act(async () => { risolvi(false) })
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('occupato durante il controllo e dopo l’avvio dell’uscita; libero quando compare l’avviso', async () => {
    let risolvi: (v: boolean) => void = () => undefined
    modifiche.mockReturnValueOnce(new Promise<boolean>((r) => { risolvi = r }))
    monta()
    const esci = screen.getByText('Esci')
    expect(esci.getAttribute('data-occupato')).toBe('no')
    fireEvent.click(esci)
    await waitFor(() => expect(esci.getAttribute('data-occupato')).toBe('si'))
    await act(async () => { risolvi(true) })
    expect(await screen.findByText(TESTO)).toBeTruthy()
    expect(esci.getAttribute('data-occupato')).toBe('no')
    fireEvent.click(screen.getByText('Esci comunque'))
    expect(logout).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(esci.getAttribute('data-occupato')).toBe('si'))
  })

  it('occupato resta dopo un’uscita senza avviso, fino alla ripartenza', async () => {
    modifiche.mockResolvedValue(false)
    monta()
    const esci = screen.getByText('Esci')
    fireEvent.click(esci)
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    expect(esci.getAttribute('data-occupato')).toBe('si')
  })

  it('se il controllo fallisce esce come prima, senza avviso', async () => {
    modifiche.mockRejectedValue(new Error('boom'))
    monta()
    fireEvent.click(screen.getByText('Esci'))
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(TESTO)).toBeNull()
  })
})
