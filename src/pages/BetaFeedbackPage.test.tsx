// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../app/providers'
import type { ValoreBeta } from '../components/beta/BetaProvider'
import { ConBeta, pianoFinto, valoreBeta } from '../components/beta/provaBeta'
import { createAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'
import type { PianoValore } from '../hooks/usePiano'
import { APP_VERSION } from '../lib/appVersion'
import { BetaFeedbackPage } from './BetaFeedbackPage'
import { BetaFinePage } from './BetaFinePage'

const { inviaFeedbackBeta } = vi.hoisted(() => ({ inviaFeedbackBeta: vi.fn(async (_input: unknown) => ({ ok: true as const })) }))
vi.mock('../data/firebase/betaClient', () => ({ inviaFeedbackBeta }))

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return { ...actual, usePiano: () => pianoForzato.valore ?? actual.usePiano() }
})

const ricordaFeedback = vi.fn()
const inCorso = (campi: Partial<ValoreBeta> = {}) => valoreBeta({ fase: 'in-corso', piano: 'pro', feedbackVisibile: true, giorniRimasti: 10, giorniTotali: 30, fine: new Date(Date.now() + 10 * 86400000), ricordaFeedback, ...campi })

async function monta(valore: ValoreBeta, percorso = '/impostazioni/beta/feedback', ruolo?: 'collaboratore' | 'socio') {
  const account = await createAccount('ada@salone.it', 'segretissimo')
  if (ruolo) writeJson(storageKeys.auth, { ...account, role: ruolo })
  pianoForzato.valore = pianoFinto()
  render(
    <Providers>
      <MemoryRouter initialEntries={['/impostazioni', percorso]} initialIndex={1}>
        <ConBeta valore={valore}>
          <Routes>
            <Route path="/" element={<p>home</p>} />
            <Route path="/impostazioni" element={<p>impostazioni</p>} />
            <Route path="/impostazioni/beta/feedback" element={<BetaFeedbackPage />} />
            <Route path="/impostazioni/beta/fine" element={<BetaFinePage />} />
          </Routes>
        </ConBeta>
      </MemoryRouter>
    </Providers>,
  )
}

describe('BetaFeedbackPage', () => {
  beforeEach(() => {
    localStorage.clear()
    inviaFeedbackBeta.mockClear()
    ricordaFeedback.mockClear()
  })
  afterEach(cleanup)

  it('quattro passi: voto, funzioni, testi e Pagheresti; invia una volta solo le risposte date', async () => {
    const user = userEvent.setup()
    await monta(inCorso())
    expect(await screen.findByText('Passo 1 di 4 · circa 1 minuto')).toBeInTheDocument()
    const avanti = screen.getByRole('button', { name: 'Avanti' })
    expect(avanti).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: '4 stelle su 5' }))
    await user.click(avanti)

    expect(screen.getByText('Passo 2 di 4 · circa 1 minuto')).toBeInTheDocument()
    const esporta = screen.getByRole('radiogroup', { name: 'Esporta il report degli incassi' })
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)
    await user.click(esporta.querySelector('[role="radio"]') as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Avanti' }))

    expect(screen.getByText('Passo 3 di 4 · circa 1 minuto')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cosa non va?' }), '  Lento  ')
    expect(screen.getByRole('textbox', { name: 'Cosa manca?' })).toHaveAttribute('maxLength', '1000')
    await user.click(screen.getByRole('button', { name: 'Avanti' }))

    expect(screen.getByRole('heading', { name: 'Pagheresti per Plus?' })).toBeInTheDocument()
    const invia = screen.getByRole('button', { name: 'Invia feedback' })
    expect(invia).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Sì' }))
    await user.click(screen.getByRole('radio', { name: '5–10 €' }))
    await user.click(screen.getByRole('checkbox', { name: 'Potete ricontattarmi per parlarne' }))
    await user.dblClick(invia)

    const grazie = await screen.findByRole('dialog', { name: 'Feedback beta' })
    expect(inviaFeedbackBeta).toHaveBeenCalledTimes(1)
    expect(inviaFeedbackBeta).toHaveBeenCalledWith({
      voto: 4, funzioni: { export: 'utile' }, nonVa: 'Lento', manca: '', pagheresti: 'si', quanto: '5-10', ricontatto: true, fineBeta: false, versioneApp: APP_VERSION,
    })
    expect(ricordaFeedback).toHaveBeenCalled()
    expect(within(grazie).getByText('Grazie! L’ho ricevuto.')).toBeInTheDocument()
    expect(screen.queryByText('impostazioni')).not.toBeInTheDocument()
    await user.click(within(grazie).getAllByRole('button', { name: 'Chiudi' })[1])
    expect(await screen.findByText('impostazioni')).toBeInTheDocument()
  })

  it('mentre il feedback parte si vede il caricamento', async () => {
    let finisci: (esito: { ok: true }) => void = () => undefined
    inviaFeedbackBeta.mockImplementationOnce(() => new Promise((resolve) => { finisci = resolve }))
    const user = userEvent.setup()
    await monta(inCorso(), '/impostazioni/beta/feedback?pagheresti=no')
    await user.click(screen.getByRole('radio', { name: '4 stelle su 5' }))
    await user.click(screen.getByRole('button', { name: 'Avanti' }))
    await user.click(screen.getByRole('button', { name: 'Avanti' }))
    await user.click(screen.getByRole('button', { name: 'Avanti' }))
    await user.click(screen.getByRole('button', { name: 'Invia feedback' }))
    expect(await screen.findByText('Invio…')).toBeInTheDocument()
    finisci({ ok: true })
    expect(await screen.findByRole('dialog', { name: 'Feedback beta' })).toBeInTheDocument()
    expect(screen.queryByText('Invio…')).not.toBeInTheDocument()
  })

  it('con «No» la domanda Quanto non c’è e quanto vale null', async () => {
    const user = userEvent.setup()
    await monta(inCorso())
    await user.click(await screen.findByRole('radio', { name: '1 stella su 5' }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Avanti' }))
    await user.click(screen.getByRole('radio', { name: 'No' }))
    expect(screen.queryByRole('heading', { name: 'Quanto al mese?' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Invia feedback' }))
    await waitFor(() => expect(inviaFeedbackBeta).toHaveBeenCalledWith(expect.objectContaining({ voto: 1, funzioni: {}, pagheresti: 'no', quanto: null, ricontatto: false })))
  })

  it('dalla domanda di fine: si parte dal voto, «Forse» è già scelto e fineBeta è vero', async () => {
    const user = userEvent.setup()
    await monta(inCorso(), '/impostazioni/beta/feedback?pagheresti=forse&fine=1')
    expect(await screen.findByText('Passo 1 di 4 · circa 1 minuto')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '5 stelle su 5' }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Avanti' }))
    expect(screen.getByRole('radio', { name: 'Forse' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Invia feedback' }))
    await waitFor(() => expect(inviaFeedbackBeta).toHaveBeenCalledWith(expect.objectContaining({ pagheresti: 'forse', fineBeta: true })))
  })

  it("un errore del server si vede e il modulo resta aperto", async () => {
    const user = userEvent.setup()
    inviaFeedbackBeta.mockRejectedValueOnce(Object.assign(new Error('Hai già mandato 5 feedback oggi: riprova domani'), { code: 'functions/failed-precondition', details: { codice: 'beta_feedback_limite' } }))
    await monta(inCorso(), '/impostazioni/beta/feedback?pagheresti=no')
    await user.click(await screen.findByRole('radio', { name: '3 stelle su 5' }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Avanti' }))
    await user.click(screen.getByRole('button', { name: 'Invia feedback' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Hai già mandato 5 feedback oggi')
    expect(screen.getByRole('button', { name: 'Invia feedback' })).toBeEnabled()
  })

  it('Salon elenca anche collaboratori e posti', async () => {
    const user = userEvent.setup()
    await monta(inCorso({ piano: 'salone' }))
    await user.click(await screen.findByRole('radio', { name: '4 stelle su 5' }))
    await user.click(screen.getByRole('button', { name: 'Avanti' }))
    expect(screen.getAllByRole('radiogroup')).toHaveLength(11)
  })

  it('senza beta, o per il collaboratore, torna alle Impostazioni', async () => {
    await monta(valoreBeta())
    expect(await screen.findByText('impostazioni')).toBeInTheDocument()
    cleanup()
    localStorage.clear()
    await monta(inCorso(), '/impostazioni/beta/feedback', 'collaboratore')
    expect(await screen.findByText('impostazioni')).toBeInTheDocument()
  })
})

describe('BetaFinePage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it("l'ultimo giorno: «finisce domani», la domanda e tre risposte verso il modulo", async () => {
    const user = userEvent.setup()
    await monta(inCorso({ giorniRimasti: 1, domandaFine: true }), '/impostazioni/beta/fine')
    expect(await screen.findByRole('heading', { name: 'La tua beta Plus finisce domani' })).toBeInTheDocument()
    expect(screen.getByText('Vorresti continuare con Plus a pagamento?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Forse, dipende dal prezzo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No, mi basta Go' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sì, appena si può' }))
    expect(await screen.findByText('Passo 1 di 4 · circa 1 minuto')).toBeInTheDocument()
  })

  it('a beta finita: «è finita»; la riga fondatori solo con il testo', async () => {
    await monta(valoreBeta({ fase: 'finita', piano: 'salone', feedbackVisibile: true, domandaFine: true, fine: new Date(Date.now() - 86400000) }), '/impostazioni/beta/fine')
    expect(await screen.findByRole('heading', { name: 'La tua beta Salon è finita' })).toBeInTheDocument()
    expect(screen.queryByText(/prezzo fondatori/)).not.toBeInTheDocument()
  })

  it('senza la domanda di fine torna alla Home', async () => {
    await monta(inCorso(), '/impostazioni/beta/fine')
    expect(await screen.findByText('home')).toBeInTheDocument()
  })
})
