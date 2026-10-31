import type { ReactNode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bindSalon, clearSalon } from '../data/firebase/salonRoot'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PaywallPiano, PianoProvider, usePiano } from './usePiano'
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

vi.mock('./useSession', () => ({ useUidSessione: () => 'u9' }))

function ConFinestra({ children }: { children: ReactNode }) {
  return (
    <PianoProvider>
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<>{children}<PaywallPiano /></>} />
          <Route path="/impostazioni/abbonamento/:piano" element={<p>pagina piano</p>} />
        </Routes>
      </MemoryRouter>
    </PianoProvider>
  )
}

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

  it('salva sul telefono il documento del piano per il backup notturno', async () => {
    localStorage.clear()
    let onPro: (data: Record<string, unknown> | null) => void = () => undefined
    listenDocumentoPiano.mockImplementation(async (pro: (data: Record<string, unknown> | null) => void) => {
      onPro = pro
      return () => undefined
    })
    bindSalon('salon-1')
    render(<PianoProvider><Caricato /></PianoProvider>)
    await waitFor(() => expect(listenDocumentoPiano).toHaveBeenCalled(), { timeout: 2000 })
    act(() => { onPro({ piano: 'pro', stato: 'attivo', scadeIl: null }) })
    expect(JSON.parse(localStorage.getItem('groomly.piano.u9') ?? 'null')).toEqual({ piano: 'pro', stato: 'attivo', scadeIl: null })
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
    render(<ConFinestra><Apri feature="export" /></ConFinestra>)
    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Avvisami' }))
    expect(scriviInteresse).toHaveBeenCalledWith('export')
  })

  it('la prova apre il foglio sullo schermo e lo lascia aperto con l’esito', async () => {
    const user = userEvent.setup()
    render(<ConFinestra><Prova /></ConFinestra>)
    await user.click(screen.getByRole('button', { name: 'Prova' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Groomly Plus' })
    expect(dialogo.parentElement?.parentElement).toBe(document.body)
    expect(dialogo.parentElement?.getAttribute('style') ?? '').toContain('position: fixed')
    expect(callAvviaProva).toHaveBeenCalledOnce()
    expect(await screen.findByText('La prova Plus è attiva per 30 giorni. Puoi usare le funzioni Plus.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Groomly Plus' })).toBeInTheDocument()
  })

  it('se la prova non parte il foglio resta aperto con il motivo', async () => {
    callAvviaProva.mockRejectedValueOnce(new Error('Prova già usata'))
    const user = userEvent.setup()
    render(<ConFinestra><Prova /></ConFinestra>)
    await user.click(screen.getByRole('button', { name: 'Prova' }))
    expect(await screen.findByText('Prova già usata')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Groomly Plus' })).toBeInTheDocument()
  })

  it('la prova lascia aperta la finestra della funzione toccata', async () => {
    let onConfig: (data: Record<string, unknown> | null) => void = () => undefined
    listenDocumentoPiano.mockImplementation(async (pro: (data: Record<string, unknown> | null) => void, config?: (data: Record<string, unknown> | null) => void) => {
      pro(null)
      onConfig = config ?? (() => undefined)
      return () => undefined
    })
    bindSalon('salon-1')
    const user = userEvent.setup()
    render(<ConFinestra><Apri feature="export" /></ConFinestra>)
    await waitFor(() => expect(listenDocumentoPiano).toHaveBeenCalled(), { timeout: 2000 })
    act(() => { onConfig({ mostraPiani: true }) })
    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Prova Plus gratis per 30 giorni' }))
    expect(await screen.findByText('La prova Plus è attiva per 30 giorni. Puoi usare le funzioni Plus.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Esporta il report degli incassi' })).toBeInTheDocument()
  })

  it('Abbonati chiude la finestra e apre la pagina del piano senza ricaricare', async () => {
    let onConfig: (data: Record<string, unknown> | null) => void = () => undefined
    listenDocumentoPiano.mockImplementation(async (pro: (data: Record<string, unknown> | null) => void, config?: (data: Record<string, unknown> | null) => void) => {
      pro(null)
      onConfig = config ?? (() => undefined)
      return () => undefined
    })
    bindSalon('salon-1')
    const user = userEvent.setup()
    render(<ConFinestra><Apri feature="team" /></ConFinestra>)
    await waitFor(() => expect(listenDocumentoPiano).toHaveBeenCalled(), { timeout: 2000 })
    act(() => { onConfig({ abbonamentiAttivi: true }) })
    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Abbonati' }))
    expect(screen.getByText('pagina piano')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
