// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../app/providers'
import { ConBeta, invitoDiProva, pianoFinto, valoreBeta } from '../components/beta/provaBeta'
import type { ValoreBeta } from '../components/beta/BetaProvider'
import { createAccount } from '../data/local/auth'
import type { PianoValore } from '../hooks/usePiano'
import { CONFIG_PIANI_DEFAULT } from '../lib/configPiani'
import { BetaInvitoPage } from './BetaInvitoPage'

const { rispondiInvitoBeta } = vi.hoisted(() => ({
  rispondiInvitoBeta: vi.fn(async (_input: unknown): Promise<{ ok: true; scadeIl: string | null }> => ({ ok: true, scadeIl: '2026-12-04T10:00:00.000Z' })),
}))
vi.mock('../data/firebase/betaClient', () => ({ rispondiInvitoBeta }))

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return { ...actual, usePiano: () => pianoForzato.valore ?? actual.usePiano() }
})

const segnaLetto = vi.fn()
const invitato = (campi: Partial<ValoreBeta> = {}) => valoreBeta({
  fase: 'invitato', invitoValido: true, piano: 'pro', giorniInvito: 30, invito: invitoDiProva({ messaggio: 'Ci farebbe piacere averti!' }),
  avvisi: [{ id: 'invito:x', tipo: 'invito', data: new Date(), link: '/impostazioni/beta' }], segnaLetto, ...campi,
})

async function monta(valore: ValoreBeta, piano: Partial<PianoValore> = {}) {
  await createAccount('ada@salone.it', 'segretissimo')
  pianoForzato.valore = pianoFinto(piano)
  render(
    <Providers>
      <MemoryRouter initialEntries={['/impostazioni/beta']}>
        <ConBeta valore={valore}>
          <Routes>
            <Route path="/" element={<p>home</p>} />
            <Route path="/impostazioni/abbonamento" element={<p>abbonamento</p>} />
            <Route path="/impostazioni/beta" element={<BetaInvitoPage />} />
          </Routes>
        </ConBeta>
      </MemoryRouter>
    </Providers>,
  )
}

describe('BetaInvitoPage', () => {
  beforeEach(() => {
    localStorage.clear()
    rispondiInvitoBeta.mockClear()
    segnaLetto.mockClear()
  })
  afterEach(cleanup)

  it('mostra invito, messaggio, funzioni e garanzie; aprirla segna letto l’avviso', async () => {
    await monta(invitato())
    expect(await screen.findByText('Beta su invito')).toBeInTheDocument()
    expect(screen.getByText('gratis per 30 giorni')).toBeInTheDocument()
    expect(screen.getByText('«Ci farebbe piacere averti!»')).toBeInTheDocument()
    expect(screen.getByText('Nessun pagamento, nessun rinnovo automatico')).toBeInTheDocument()
    expect(screen.getByText('In cambio: un feedback di 2 minuti')).toBeInTheDocument()
    expect(screen.getByText('Alcune funzioni possono ancora cambiare')).toBeInTheDocument()
    expect(segnaLetto).toHaveBeenCalledWith('invito:x')
  })

  it("l'offerta early adopter compare solo con il testo in config", async () => {
    await monta(invitato(), { configPiani: { ...CONFIG_PIANI_DEFAULT, offertaEarlyAdopter: { it: 'Prezzo fondatori: −30% per sempre', en: '', es: '' } } })
    expect(await screen.findByText('Prezzo fondatori: −30% per sempre')).toBeInTheDocument()
  })

  it('Partecipo serve la casella, chiama il server una volta e torna alla Home con il benvenuto', async () => {
    const user = userEvent.setup()
    await monta(invitato())
    const partecipo = await screen.findByRole('button', { name: 'Partecipo' })
    expect(partecipo).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'Ho capito: è gratis, senza rinnovo, e lascerò un feedback.' }))
    expect(partecipo).toBeEnabled()
    await user.dblClick(partecipo)
    expect(await screen.findByText('home')).toBeInTheDocument()
    expect(rispondiInvitoBeta).toHaveBeenCalledTimes(1)
    expect(rispondiInvitoBeta).toHaveBeenCalledWith({ accetta: true })
    expect(screen.getByRole('status')).toHaveTextContent('Ti diamo il benvenuto nella beta! Plus è attivo fino al 4 dicembre.')
  })

  it('se il server rifiuta si vede il suo messaggio e si può riprovare', async () => {
    const user = userEvent.setup()
    rispondiInvitoBeta.mockRejectedValueOnce(new Error('Hai già un abbonamento attivo dal Play Store'))
    await monta(invitato())
    await user.click(await screen.findByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Partecipo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Hai già un abbonamento attivo dal Play Store')
    expect(screen.getByRole('button', { name: 'Partecipo' })).toBeEnabled()
  })

  it('No grazie chiede il motivo; con Altro manda anche il testo', async () => {
    const user = userEvent.setup()
    rispondiInvitoBeta.mockResolvedValueOnce({ ok: true, scadeIl: null })
    await monta(invitato())
    await user.click(await screen.findByRole('button', { name: 'No grazie' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Ci dici perché? Ci aiuta a migliorare.')
    const rifiuta = screen.getByRole('button', { name: 'Rifiuta l’invito' })
    expect(rifiuta).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Altro' }))
    const campo = screen.getByRole('textbox', { name: 'Raccontaci il motivo (facoltativo)' })
    expect(campo).toHaveAttribute('maxLength', '300')
    await user.type(campo, 'Uso già un altro gestionale')
    await user.click(rifiuta)
    expect(await screen.findByText('home')).toBeInTheDocument()
    expect(rispondiInvitoBeta).toHaveBeenCalledWith({ accetta: false, motivo: 'altro', altro: 'Uso già un altro gestionale' })
  })

  it('un motivo semplice si manda senza testo', async () => {
    const user = userEvent.setup()
    await monta(invitato())
    await user.click(await screen.findByRole('button', { name: 'No grazie' }))
    await user.click(screen.getByRole('radio', { name: 'Non pagherei per queste funzioni' }))
    await user.click(screen.getByRole('button', { name: 'Rifiuta l’invito' }))
    await waitFor(() => expect(rispondiInvitoBeta).toHaveBeenCalledWith({ accetta: false, motivo: 'non-pagherei' }))
  })

  it.each([['scaduto'], ['revocato']] as const)('invito %s: non più valido', async (stato) => {
    await monta(valoreBeta({ fase: 'nessuna', invito: invitoDiProva({ stato }) }))
    expect(await screen.findByRole('heading', { name: 'Questo invito non è più valido' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Torna alla Home' }))
    expect(await screen.findByText('home')).toBeInTheDocument()
  })

  it('durante la beta rimanda alla pagina Abbonamento', async () => {
    await monta(valoreBeta({ fase: 'in-corso', piano: 'pro' }))
    expect(await screen.findByText('abbonamento')).toBeInTheDocument()
  })

  it('il socio e il collaboratore vanno alla Home', async () => {
    await monta(invitato({ titolare: false }))
    expect(await screen.findByText('home')).toBeInTheDocument()
  })
})
