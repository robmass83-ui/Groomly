import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bindSalon, clearSalon } from '../data/firebase/salonRoot'
import { PianoProvider, usePiano } from './usePiano'
import { haAccesso, type FeatureKey } from '../lib/piano'

const { scriviInteresse, callAvviaProva, listenDocumentoPiano } = vi.hoisted(() => ({
  scriviInteresse: vi.fn(async (_feature: string) => undefined),
  callAvviaProva: vi.fn(async () => undefined),
  listenDocumentoPiano: vi.fn(async (_onPro: (data: Record<string, unknown> | null) => void) => () => undefined),
}))

vi.mock('../data/firebase/enabled', () => ({
  firebaseEnabled: () => true,
}))

vi.mock('../data/firebase/client', () => ({
  listenDocumentoPiano,
  scriviInteresse,
  callAvviaProva,
}))

function Apri({ feature }: { feature: FeatureKey }) {
  const piano = usePiano()
  return <button type="button" onClick={() => piano.apriPaywall(feature)}>Apri</button>
}

function Prova() {
  const piano = usePiano()
  return <button type="button" onClick={() => { void piano.prova() }}>Prova</button>
}

function Caricato() {
  const piano = usePiano()
  return <span>{`${piano.pronto === false ? 'attesa' : 'pronto'}:${piano.stato.giorniProva ?? '-'}`}</span>
}

function PianoLetto() {
  const piano = usePiano()
  const aperte = haAccesso(piano.stato, 'prenotazioni')
  return <span>{`${piano.stato.livello}:${aperte ? 'prenotazioni' : 'chiuse'}`}</span>
}

describe('paywall avvisami', () => {
  beforeEach(() => {
    scriviInteresse.mockClear()
    callAvviaProva.mockReset()
    callAvviaProva.mockResolvedValue(undefined)
    listenDocumentoPiano.mockReset()
    listenDocumentoPiano.mockResolvedValue(() => undefined)
    clearSalon()
  })

  it('aggancia il piano quando il salone si apre dopo l’avvio', async () => {
    let onPro: (data: Record<string, unknown> | null) => void = () => undefined
    listenDocumentoPiano.mockImplementation(async (pro: (data: Record<string, unknown> | null) => void) => {
      onPro = pro
      return () => undefined
    })
    render(<PianoProvider><PianoLetto /></PianoProvider>)
    expect(listenDocumentoPiano).not.toHaveBeenCalled()
    bindSalon('salon-1')
    await waitFor(() => expect(listenDocumentoPiano).toHaveBeenCalled(), { timeout: 2000 })
    act(() => {
      onPro({
        piano: 'pro',
        stato: 'prova',
        fonte: 'prova',
        scadeIl: '2026-11-26T00:00:00.000Z',
      })
    })
    expect(screen.getByText('pro:prenotazioni')).toBeInTheDocument()
  })

  it('resta in attesa finché non arriva il documento del piano', async () => {
    let onPro: (data: Record<string, unknown> | null) => void = () => undefined
    listenDocumentoPiano.mockImplementation(async (pro: (data: Record<string, unknown> | null) => void) => {
      onPro = pro
      return () => undefined
    })
    bindSalon('salon-1')
    render(<PianoProvider><Caricato /></PianoProvider>)
    expect(screen.getByText('attesa:-')).toBeInTheDocument()
    await waitFor(() => expect(listenDocumentoPiano).toHaveBeenCalled(), { timeout: 2000 })
    act(() => { onPro(null) })
    expect(screen.getByText('pronto:-')).toBeInTheDocument()
  })

  it('i giorni della prova scendono anche se l’app resta aperta', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-11-01T10:00:00.000Z'))
    try {
      let onPro: (data: Record<string, unknown> | null) => void = () => undefined
      listenDocumentoPiano.mockImplementation(async (pro: (data: Record<string, unknown> | null) => void) => {
        onPro = pro
        return () => undefined
      })
      bindSalon('salon-1')
      render(<PianoProvider><Caricato /></PianoProvider>)
      await waitFor(() => expect(listenDocumentoPiano).toHaveBeenCalled(), { timeout: 2000 })
      act(() => { onPro({ piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: '2026-11-13T10:00:00.000Z', provaUsata: true }) })
      expect(screen.getByText('pronto:12')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(24 * 60 * 60 * 1000) })
      expect(screen.getByText('pronto:11')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('Avvisami scrive l’interesse della funzione', async () => {
    const user = userEvent.setup()
    render(<PianoProvider><Apri feature="export" /></PianoProvider>)
    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Avvisami' }))
    expect(scriviInteresse).toHaveBeenCalledWith('export')
  })

  it('la prova apre il foglio sullo schermo e lo lascia aperto con l’esito', async () => {
    const user = userEvent.setup()
    render(<PianoProvider><Prova /></PianoProvider>)
    await user.click(screen.getByRole('button', { name: 'Prova' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Abbonamenti in arrivo' })
    expect(dialogo.parentElement?.parentElement).toBe(document.body)
    expect(dialogo.parentElement?.getAttribute('style') ?? '').toContain('position: fixed')
    expect(callAvviaProva).toHaveBeenCalledOnce()
    expect(await screen.findByText('La prova Plus è attiva per 30 giorni. Puoi usare le funzioni Plus.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Abbonamenti in arrivo' })).toBeInTheDocument()
  })

  it('se la prova non parte il foglio resta aperto con il motivo', async () => {
    callAvviaProva.mockRejectedValueOnce(new Error('Prova già usata'))
    const user = userEvent.setup()
    render(<PianoProvider><Prova /></PianoProvider>)
    await user.click(screen.getByRole('button', { name: 'Prova' }))
    expect(await screen.findByText('Prova già usata')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Abbonamenti in arrivo' })).toBeInTheDocument()
  })
})