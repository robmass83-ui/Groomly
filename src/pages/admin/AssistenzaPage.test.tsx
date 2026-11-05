// @vitest-environment happy-dom
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { ToastProvider } from '../../components/layout/Toast'
import { unisciRichieste, type DocAssistenza } from '../../lib/assistenza'
import { AssistenzaPage } from './AssistenzaPage'
import { RichiestaPage } from './RichiestaPage'

const client = vi.hoisted(() => ({
  rispondi: vi.fn(async (_input: unknown): Promise<unknown> => null),
  stato: vi.fn(async (_input: unknown) => undefined),
  modelli: vi.fn(async (): Promise<unknown[]> => []),
  salva: vi.fn(async (_input: unknown) => 'm1'),
}))
const dati = vi.hoisted(() => ({ documenti: {} as Record<string, unknown>, ricarica: vi.fn() }))
const scarica = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))
vi.mock('../../lib/shareFile', async (original) => ({ ...await original<typeof import('../../lib/shareFile')>(), downloadAnchor: scarica }))
vi.mock('../../data/firebase/adminClient', () => ({
  callRispondiAssistenza: client.rispondi,
  callImpostaStatoAssistenza: client.stato,
  callSalvaModelloAssistenza: client.salva,
  callEliminaModelloAssistenza: vi.fn(),
  elencoModelliAssistenza: client.modelli,
}))

const NOTE = [
  { id: 'a', email: 'a@a.it', categoria: 'bug', testo: 'Si blocca', salonId: 'ada', creato: Date.parse('2026-11-06T10:00:00.000Z') },
  { id: 'b', email: 'b@b.it', categoria: 'altro', testo: 'Vecchia idea', salonId: 'leo', creato: Date.parse('2026-11-01T10:00:00.000Z') },
]

vi.mock('../../components/admin/AdminDati', () => ({
  useAdminDati: () => ({
    richieste: unisciRichieste(NOTE, [], dati.documenti as Record<string, DocAssistenza>, '2026-11-05T00:00:00.000Z'),
    richiestePronte: true,
    nomeDi: (id: string) => ({ ada: 'Bauci', leo: 'Pelo' })[id] ?? '',
    feedback: [],
    feedbackPronti: true,
    erroreFeedback: false,
    ricaricaAssistenza: dati.ricarica,
  }),
}))

function apri(indirizzo: string) {
  return render(
    <LinguaProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[indirizzo]}>
          <Routes>
            <Route path="/admin/assistenza" element={<AssistenzaPage />} />
            <Route path="/admin/assistenza/:id" element={<RichiestaPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </LinguaProvider>,
  )
}

beforeEach(() => {
  dati.documenti = {}
  dati.ricarica.mockClear()
  scarica.mockClear()
  client.rispondi.mockReset()
  client.rispondi.mockResolvedValue(null)
  client.stato.mockClear()
  client.modelli.mockResolvedValue([])
})

describe('casella di Assistenza', () => {
  it('parte dalle nuove: quelle vecchie valgono risolte', () => {
    apri('/admin/assistenza')
    expect(screen.getByText('Si blocca')).toBeInTheDocument()
    expect(screen.queryByText('Vecchia idea')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Nuove 1' })).toHaveAttribute('aria-checked', 'true')
  })

  it('filtra per stato, categoria e salone letti dall’indirizzo', async () => {
    apri('/admin/assistenza?stato=tutte&cat=altro')
    expect(screen.getByText('Vecchia idea')).toBeInTheDocument()
    expect(screen.queryByText('Si blocca')).not.toBeInTheDocument()
    await userEvent.setup().type(screen.getByPlaceholderText('Cerca salone'), 'xyz')
    expect(screen.getByText('Nessuna richiesta')).toBeInTheDocument()
  })

  it('il vecchio link dei suggerimenti apre la fonte giusta', () => {
    apri('/admin/assistenza?fonte=suggerimenti&cat=bug')
    expect(screen.getByRole('radio', { name: 'Suggerimenti' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Si blocca')).toBeInTheDocument()
  })

  it('esporta ciò che si vede', async () => {
    const user = userEvent.setup()
    apri('/admin/assistenza')
    await user.click(screen.getByRole('button', { name: 'Esporta' }))
    const finestra = screen.getByRole('dialog', { name: 'Esporta' })
    expect(within(finestra).getByText('Richieste nel file: 1')).toBeInTheDocument()
    await user.click(within(finestra).getByRole('button', { name: 'Esporta' }))
    await waitFor(() => expect(scarica).toHaveBeenCalledTimes(1))
  })
})

describe('una richiesta', () => {
  const APERTA = '/admin/assistenza/suggerimento_a'

  it('aprirla non cambia lo stato', async () => {
    apri(APERTA)
    expect(await screen.findByText('Si blocca')).toBeInTheDocument()
    expect(client.stato).not.toHaveBeenCalled()
  })

  it('l’autore assente lascia il testo scritto e dice perché', async () => {
    client.rispondi.mockRejectedValue(new Error('L’account di chi ha scritto non esiste più'))
    const user = userEvent.setup()
    apri(APERTA)
    await user.type(screen.getByLabelText('Testo della risposta'), 'Ciao')
    await user.click(screen.getByRole('button', { name: 'Invia la risposta' }))
    expect(await screen.findByText('L’account di chi ha scritto non esiste più')).toBeInTheDocument()
    expect(screen.getByLabelText('Testo della risposta')).toHaveValue('Ciao')
  })

  it('risponde, svuota il campo e rilegge lo storico; il doppio tocco fa una sola chiamata', async () => {
    let finisci: (valore: unknown) => void = () => undefined
    client.rispondi.mockImplementation(() => new Promise((ok) => { finisci = ok }))
    const user = userEvent.setup()
    apri(APERTA)
    await user.type(screen.getByLabelText('Testo della risposta'), 'Sistemato')
    await user.click(screen.getByRole('switch', { name: 'Invia anche via email' }))
    const invia = screen.getByRole('button', { name: 'Invia la risposta' })
    await user.click(invia)
    await user.click(invia)
    await act(async () => { finisci('inviata') })
    expect(client.rispondi).toHaveBeenCalledTimes(1)
    expect(client.rispondi.mock.calls[0]?.[0]).toMatchObject({ fonte: 'suggerimento', id: 'a', testo: 'Sistemato', anchEmail: true })
    expect((client.rispondi.mock.calls[0]?.[0] as { idRichiesta: string }).idRichiesta).not.toBe('')
    expect(screen.getByLabelText('Testo della risposta')).toHaveValue('')
    expect(dati.ricarica).toHaveBeenCalled()
  })

  it('al limite di oggi lo dice', async () => {
    client.rispondi.mockResolvedValue('limite')
    const user = userEvent.setup()
    apri(APERTA)
    await user.type(screen.getByLabelText('Testo della risposta'), 'Ciao')
    await user.click(screen.getByRole('button', { name: 'Invia la risposta' }))
    expect(await screen.findByText('Risposta inviata, email non partita: limite di oggi')).toBeInTheDocument()
  })

  it('una risposta rapida riempie il campo, che resta modificabile', async () => {
    client.modelli.mockResolvedValue([{ id: 'm', titolo: 'Grazie', testo: 'Ti ringrazio' }])
    const user = userEvent.setup()
    apri(APERTA)
    await user.click(await screen.findByRole('button', { name: 'Grazie' }))
    const campo = screen.getByLabelText('Testo della risposta')
    expect(campo).toHaveValue('Ti ringrazio')
    await user.type(campo, '!')
    expect(campo).toHaveValue('Ti ringrazio!')
  })

  it('mostra la nota sull’APK e lo storico delle risposte', () => {
    dati.documenti = { suggerimento_a: { stato: 'risolto', risposte: [{ testo: 'Già fatto', quando: '2026-11-07T10:00:00.000Z', email: 'inviata' }] } }
    apri(APERTA)
    expect(screen.getByText('Già fatto')).toBeInTheDocument()
    expect(screen.getByText(/· anche via email/)).toBeInTheDocument()
    expect(screen.getByText(/Chi non ha aggiornato l’app/)).toBeInTheDocument()
  })

  it('cambia lo stato con un’azione esplicita', async () => {
    const user = userEvent.setup()
    apri(APERTA)
    await user.click(screen.getByRole('radio', { name: 'In corso' }))
    await waitFor(() => expect(client.stato).toHaveBeenCalledWith({ fonte: 'suggerimento', id: 'a', stato: 'in-corso' }))
  })
})
