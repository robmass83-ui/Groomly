// @vitest-environment happy-dom
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/layout/Toast'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { CONFIG_PIANI_DEFAULT } from '../../lib/configPiani'
import { ComunicazioniPage } from './ComunicazioniPage'

const c = vi.hoisted(() => ({
  anteprima: vi.fn(async (_input: unknown): Promise<unknown> => ({ account: 3, email: 2, inItaliano: 1, senzaConsenso: 1, restanoOggi: 180, massimo: 90, bloccata: false })),
  invia: vi.fn(async (_input: unknown) => ({ inviate: 2, nonInviate: 0 })),
  riprendi: vi.fn(async (_id: string) => ({ inviate: 2, nonInviate: 0 })),
  elimina: vi.fn(async (_id: string) => undefined),
  elenco: vi.fn(async (): Promise<unknown[]> => []),
  riconferma: vi.fn(async <T,>(azione: () => Promise<T>) => azione()),
}))

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))
vi.mock('../../components/admin/RiconfermaPassword', () => ({ useRiconferma: () => ({ conRiconferma: c.riconferma, dialogo: null }) }))
vi.mock('../../data/firebase/adminClient', () => ({
  callAnteprimaComunicazione: c.anteprima,
  callInviaComunicazione: c.invia,
  callRiprendiComunicazione: c.riprendi,
  callEliminaComunicazione: c.elimina,
  callAnnunciaPagamenti: vi.fn(),
  elencoComunicazioni: c.elenco,
}))

const RIGHE = ['ada', 'leo'].map((id) => ({ row: { salonId: id, ownerName: id, salonName: `Salone ${id}`, livello: 'base', fonte: null, traccia: {} }, livello: 'base', beta: 'mai', info: {} }))

vi.mock('../../components/admin/AdminDati', () => ({
  useAdminDati: () => ({
    righe: RIGHE,
    directory: {},
    erroreDirectory: false,
    invitiPer: new Map(),
    contatori: null,
    adesso: new Date('2026-11-05T10:00:00.000Z'),
    config: { mostraPiani: false, abbonamentiAttivi: false, piani: CONFIG_PIANI_DEFAULT },
  }),
}))

function apri() {
  render(<LinguaProvider><ToastProvider><MemoryRouter><ComunicazioniPage /></MemoryRouter></ToastProvider></LinguaProvider>)
  return userEvent.setup()
}

async function scrivi(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: 'Titolo' }), 'Manutenzione')
}

beforeEach(() => {
  for (const f of [c.anteprima, c.invia, c.riprendi, c.elimina, c.elenco, c.riconferma]) f.mockClear()
  c.elenco.mockResolvedValue([])
  c.anteprima.mockResolvedValue({ account: 3, email: 2, inItaliano: 1, senzaConsenso: 1, restanoOggi: 180, massimo: 90, bloccata: false })
})

describe('Comunicazioni', () => {
  it('senza titolo italiano non si invia', async () => {
    apri()
    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
  })

  it('accendendo l’email è preselezionata Promozionale', async () => {
    const user = apri()
    await user.click(screen.getByRole('switch', { name: 'Invia anche via email' }))
    expect(screen.getByRole('radio', { name: 'Promozionale' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText(/Niente offerte/)).not.toBeInTheDocument()
  })

  it('scegliendo Servizio compare il promemoria', async () => {
    const user = apri()
    await user.click(screen.getByRole('switch', { name: 'Invia anche via email' }))
    await user.click(screen.getByRole('radio', { name: 'Di servizio' }))
    expect(screen.getByText(/Niente offerte/)).toBeInTheDocument()
  })

  it('l’anteprima dice quanti riceveranno, in italiano, senza consenso e quante email restano', async () => {
    const user = apri()
    await scrivi(user)
    await user.click(screen.getByRole('switch', { name: 'Invia anche via email' }))
    expect(await screen.findByText('Avviso nell’app per 3 account')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Email a 2 persone')).toBeInTheDocument())
    expect(screen.getByText('1 riceveranno l’italiano')).toBeInTheDocument()
    expect(screen.getByText('1 senza consenso, escluse dall’email')).toBeInTheDocument()
    expect(screen.getByText('Oggi restano 180 email, ne puoi mandare 90')).toBeInTheDocument()
  })

  it('l’anteprima si aggiorna cambiando tipo di email', async () => {
    const user = apri()
    await scrivi(user)
    await user.click(screen.getByRole('switch', { name: 'Invia anche via email' }))
    await user.click(screen.getByRole('radio', { name: 'Di servizio' }))
    await waitFor(() => expect(c.anteprima.mock.lastCall?.[0]).toMatchObject({ email: 'servizio', salonIds: 'tutti' }))
  })

  it('bloccata: bottone spento col motivo, ma senza email si può inviare', async () => {
    c.anteprima.mockResolvedValue({ account: 3, email: 200, inItaliano: 0, senzaConsenso: 0, restanoOggi: 10, massimo: 5, bloccata: true })
    const user = apri()
    await scrivi(user)
    await user.click(screen.getByRole('switch', { name: 'Invia anche via email' }))
    expect(await screen.findByText(/Troppe email per oggi/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
    c.anteprima.mockResolvedValue({ account: 3, email: 0, inItaliano: 0, senzaConsenso: 0, restanoOggi: 10, massimo: 5, bloccata: false })
    await user.click(screen.getByRole('switch', { name: 'Invia anche via email' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia' })).toBeEnabled())
  })

  it('a tutti passa dalla riconferma e manda solo le lingue scritte', async () => {
    const user = apri()
    await scrivi(user)
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }))
    await user.type(screen.getByRole('textbox', { name: 'Titolo' }), 'Wartung')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Invia' }))
    await waitFor(() => expect(c.invia).toHaveBeenCalledTimes(1))
    expect(c.riconferma).toHaveBeenCalledTimes(1)
    const input = c.invia.mock.calls[0]?.[0] as { salonIds: string; testi: Record<string, unknown>; email: string; idRichiesta: string }
    expect(input.salonIds).toBe('tutti')
    expect(Object.keys(input.testi).sort()).toEqual(['de', 'it'])
    expect(input.email).toBe('nessuna')
    expect(input.idRichiesta).not.toBe('')
  })

  it('ai saloni scelti: senza nessuno scelto non si invia', async () => {
    const user = apri()
    await scrivi(user)
    await user.click(screen.getByRole('radio', { name: 'Saloni scelti' }))
    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Scegli tutti quelli visibili' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Invia' }))
    await waitFor(() => expect(c.invia.mock.calls[0]?.[0]).toMatchObject({ salonIds: ['ada', 'leo'] }))
  })

  it('il doppio tocco fa una sola chiamata e dopo l’invio il modulo si svuota con un id nuovo', async () => {
    let finisci: (valore: { inviate: number; nonInviate: number }) => void = () => undefined
    c.invia.mockImplementationOnce(() => new Promise((ok) => { finisci = ok }))
    const user = apri()
    await scrivi(user)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia' })).toBeEnabled())
    const invia = screen.getByRole('button', { name: 'Invia' })
    await user.click(invia)
    await user.click(invia)
    await act(async () => { finisci({ inviate: 0, nonInviate: 0 }) })
    expect(c.invia).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('textbox', { name: 'Titolo' })).toHaveValue('')
    expect(c.elenco.mock.calls.length).toBeGreaterThan(1)
  })

  it('un invio fallito lascia il testo e lo stesso id per riprovare', async () => {
    c.invia.mockRejectedValueOnce(new Error('Limite di email di oggi raggiunto'))
    const user = apri()
    await scrivi(user)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Invia' }))
    expect(await screen.findByText('Limite di email di oggi raggiunto')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Titolo' })).toHaveValue('Manutenzione')
    await user.click(screen.getByRole('button', { name: 'Invia' }))
    await waitFor(() => expect(c.invia).toHaveBeenCalledTimes(2))
    expect((c.invia.mock.calls[0]?.[0] as { idRichiesta: string }).idRichiesta).toBe((c.invia.mock.calls[1]?.[0] as { idRichiesta: string }).idRichiesta)
  })

  it('lo storico mostra i conteggi, Riprendi se mancano email ed Elimina dopo la conferma', async () => {
    c.elenco.mockResolvedValue([
      { id: 'c1', quando: '2026-11-05T09:00:00.000Z', tipo: 'novita', titolo: 'Interrotta', saloni: 2, emailTipo: 'servizio', account: 3, email: 90, inviate: 40, eliminata: false },
      { id: 'c2', quando: '2026-11-04T09:00:00.000Z', tipo: 'novita', titolo: 'Finita', saloni: 'tutti', emailTipo: 'nessuna', account: 3, email: 0, inviate: 0, eliminata: false },
    ])
    const user = apri()
    expect(await screen.findByText('Inviate 40 su 90')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Riprendi' }))
    await waitFor(() => expect(c.riprendi).toHaveBeenCalledWith('c1'))
    expect(screen.getAllByRole('button', { name: 'Riprendi' })).toHaveLength(1)
    await user.click(screen.getAllByRole('button', { name: 'Elimina' })[1] as HTMLElement)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Elimina' }))
    await waitFor(() => expect(c.elimina).toHaveBeenCalledWith('c2'))
  })

  it('c’è l’Annuncio pagamenti', async () => {
    apri()
    expect(await screen.findByText('Annuncio pagamenti')).toBeInTheDocument()
  })
})
