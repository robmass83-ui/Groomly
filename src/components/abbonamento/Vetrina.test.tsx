// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/providers'
import { createAccount } from '../../data/local/auth'
import type { PianoValore } from '../../hooks/usePiano'
import { provaConcessa, statoPiano, type ProMain } from '../../lib/piano'
import { ConBeta, invitoDiProva, valoreBeta } from '../beta/provaBeta'
import { CONFIG_PIANI_DEFAULT } from '../../lib/configPiani'
import { Vetrina } from './Vetrina'

const { scriviInteresse } = vi.hoisted(() => ({ scriviInteresse: vi.fn(async (_feature: string) => undefined) }))
vi.mock('../../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../../data/firebase/client')>('../../data/firebase/client')
  return { ...actual, scriviInteresse }
})

const { avviaAcquisto, ripristinaAcquisti } = vi.hoisted(() => ({
  avviaAcquisto: vi.fn(async (_d: unknown) => 'ok' as string),
  ripristinaAcquisti: vi.fn(async (_d: unknown) => 'ok' as string),
}))
vi.mock('../../lib/billing', async () => {
  const actual = await vi.importActual<typeof import('../../lib/billing')>('../../lib/billing')
  return { ...actual, avviaAcquisto, ripristinaAcquisti }
})

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/usePiano')>('../../hooks/usePiano')
  return { ...actual, usePiano: () => pianoForzato.valore ?? actual.usePiano() }
})

const adesso = new Date('2026-11-01T10:00:00.000Z')

function pianoDa(doc: ProMain | undefined, abbonamentiAttivi = false): PianoValore {
  return {
    mostraPiani: true,
    abbonamentiAttivi,
    tour: { acceso: false, dal: null },
    stato: statoPiano(doc, adesso),
    provaUsata: doc?.provaUsata === true,
    provaConcessa: provaConcessa(doc, adesso),
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall: () => undefined,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
    pronto: true,
    acquisto: { chiaveSdk: 'goog_x', offeringId: 'groomly_standard', earlyAdopter: false, offertaEarly: { it: '', en: '', es: '' }, pagamentiDal: null },
  }
}

async function monta(doc: ProMain | undefined, abbonamentiAttivi = false, piano: 'plus' | 'salone' = 'plus') {
  await createAccount('ada@salone.it', 'segretissimo')
  pianoForzato.valore = pianoDa(doc, abbonamentiAttivi)
  const vista = () => (
    <Providers>
      <MemoryRouter><Vetrina piano={piano} /></MemoryRouter>
    </Providers>
  )
  const { rerender } = render(vista())
  return { aggiorna: (nuovo: ProMain | undefined) => { pianoForzato.valore = pianoDa(nuovo, abbonamentiAttivi); rerender(vista()) } }
}

describe('Vetrina Plus', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
    scriviInteresse.mockClear()
    avviaAcquisto.mockReset()
    avviaAcquisto.mockResolvedValue('ok')
    ripristinaAcquisti.mockClear()
  })

  it('con Plus sospeso la vetrina di Plus non offre la prova gratis', async () => {
    // Plus a pagamento sospeso: oggi è Go, ma ha già avuto Plus.
    await monta({ piano: 'pro', stato: 'sospeso', fonte: 'play', scadeIl: '2026-10-20T00:00:00.000Z' }, true)
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByText('Prova Plus gratis per 30 giorni')).not.toBeInTheDocument()
    expect(screen.queryByText('30 giorni gratis, poi 9,99 €/mese')).not.toBeInTheDocument()
    expect(screen.queryByText('30 GIORNI GRATIS')).not.toBeInTheDocument()
  })

  it('un Go puro vede la prova gratis', async () => {
    await monta(undefined)
    expect(await screen.findByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).toBeInTheDocument()
  })

  it('con gli abbonamenti spenti Plus offre Avvisami e non Abbonati', async () => {
    await monta({ piano: 'pro', stato: 'sospeso', fonte: 'play', scadeIl: '2026-10-20T00:00:00.000Z' })
    expect(await screen.findByRole('button', { name: 'Avvisami' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abbonati' })).not.toBeInTheDocument()
  })

  it('Avvisami su Plus scrive l’interesse piano-plus e conferma con un toast, senza dialogo', async () => {
    const user = userEvent.setup()
    await monta({ piano: 'pro', stato: 'sospeso', fonte: 'play', scadeIl: '2026-10-20T00:00:00.000Z' })
    await user.click(await screen.findByRole('button', { name: 'Avvisami' }))
    await waitFor(() => expect(scriviInteresse).toHaveBeenCalledWith('piano-plus'))
    expect(await screen.findByRole('status')).toHaveTextContent('Ti avviseremo appena disponibile')
    expect(screen.getByRole('button', { name: 'Ti avviseremo' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con gli abbonamenti spenti: «In arrivo», niente prezzo e «Nessun pagamento ora»', async () => {
    await monta({ piano: 'pro', stato: 'sospeso', fonte: 'play', scadeIl: '2026-10-20T00:00:00.000Z' })
    expect(await screen.findByText('In arrivo')).toBeInTheDocument()
    expect(screen.getByText('Gli abbonamenti non sono ancora aperti. Tocca Avvisami: ti scriviamo appena puoi attivarlo.')).toBeInTheDocument()
    expect(screen.getByText('Prezzo annunciato all’apertura')).toBeInTheDocument()
    expect(screen.queryByText('9,99 €')).not.toBeInTheDocument()
    expect(screen.getByText('Nessun pagamento ora')).toBeInTheDocument()
  })

  it('con l’interruttore dei prezzi in beta il prezzo si vede anche ad abbonamenti spenti', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    pianoForzato.valore = { ...pianoDa(undefined), provaConcessa: false, configPiani: { ...CONFIG_PIANI_DEFAULT, showPrezziInBeta: true } }
    render(<Providers><MemoryRouter><Vetrina piano="plus" /></MemoryRouter></Providers>)
    expect(await screen.findByText('9,99 €')).toBeInTheDocument()
    expect(screen.queryByText('Prezzo annunciato all’apertura')).not.toBeInTheDocument()
  })

  it('con un invito aperto per Plus il piede porta all’invito invece di Avvisami', async () => {
    const user = userEvent.setup()
    await createAccount('ada@salone.it', 'segretissimo')
    pianoForzato.valore = { ...pianoDa(undefined), provaConcessa: false }
    render(
      <Providers>
        <MemoryRouter>
          <ConBeta valore={valoreBeta({ fase: 'invitato', invitoValido: true, piano: 'pro', invito: invitoDiProva() })}>
            <Routes>
              <Route path="/" element={<Vetrina piano="plus" />} />
              <Route path="/impostazioni/beta" element={<p>pagina invito</p>} />
            </Routes>
          </ConBeta>
        </MemoryRouter>
      </Providers>,
    )
    expect(screen.queryByRole('button', { name: 'Avvisami' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Apri l’invito' }))
    expect(screen.getByText('pagina invito')).toBeInTheDocument()
  })

  it('l’invito Plus non cambia la vetrina Salon', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    pianoForzato.valore = { ...pianoDa(undefined), provaConcessa: false }
    render(
      <Providers>
        <MemoryRouter>
          <ConBeta valore={valoreBeta({ fase: 'invitato', invitoValido: true, piano: 'pro', invito: invitoDiProva() })}>
            <Vetrina piano="salone" />
          </ConBeta>
        </MemoryRouter>
      </Providers>,
    )
    expect(await screen.findByRole('button', { name: 'Avvisami' })).toBeInTheDocument()
  })

  it('Avvisami su Salone scrive l’interesse piano-salone', async () => {
    const user = userEvent.setup()
    await monta(undefined, false, 'salone')
    await user.click(await screen.findByRole('button', { name: 'Avvisami' }))
    await waitFor(() => expect(scriviInteresse).toHaveBeenCalledWith('piano-salone'))
  })

  it('con gli abbonamenti attivi Plus offre Abbonati', async () => {
    await monta({ piano: 'pro', stato: 'sospeso', fonte: 'play', scadeIl: '2026-10-20T00:00:00.000Z' }, true)
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Avvisami' })).not.toBeInTheDocument()
  })
})

describe('Vetrina con gli abbonamenti accesi', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
    avviaAcquisto.mockReset()
    avviaAcquisto.mockResolvedValue('ok')
    ripristinaAcquisti.mockClear()
  })

  it('spenti: Avvisami non avvia nessun acquisto', async () => {
    const user = userEvent.setup()
    await monta(undefined, false, 'salone')
    await user.click(await screen.findByRole('button', { name: 'Avvisami' }))
    expect(avviaAcquisto).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Ripristina acquisti' })).not.toBeInTheDocument()
  })

  it('senza chiave o prodotti: messaggio gentile', async () => {
    const user = userEvent.setup()
    avviaAcquisto.mockResolvedValue('non-disponibile')
    await monta({ piano: 'base', provaUsata: true }, true, 'salone')
    await user.click(await screen.findByRole('button', { name: 'Abbonati' }))
    expect(await screen.findByText('Abbonamento momentaneamente non disponibile. Riprova più tardi.')).toBeInTheDocument()
    expect(avviaAcquisto).toHaveBeenCalledWith(expect.objectContaining({ piano: 'salone', earlyAdopter: false, abbonamentiAttivi: true, chiaveSdk: 'goog_x' }))
  })

  it('in beta avvisa che i giorni gratis finiscono, poi compra', async () => {
    const user = userEvent.setup()
    await monta({ piano: 'salone', stato: 'attivo', fonte: 'beta', scadeIl: '2026-12-20T00:00:00.000Z' }, true, 'salone')
    await user.click(await screen.findByRole('button', { name: 'Abbonati' }))
    expect(await screen.findByText('La beta gratuita finisce adesso')).toBeInTheDocument()
    expect(avviaAcquisto).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await waitFor(() => expect(avviaAcquisto).toHaveBeenCalledTimes(1))
  })

  it('dopo il pagamento aspetta il piano Play e poi dice che è attivo', async () => {
    const user = userEvent.setup()
    const { aggiorna } = await monta({ piano: 'base', provaUsata: true }, true)
    await user.click(await screen.findByRole('button', { name: 'Abbonati' }))
    expect(await screen.findByText('Pagamento ricevuto, attivo il piano…')).toBeInTheDocument()
    aggiorna({ piano: 'pro', stato: 'attivo', fonte: 'play', scadeIl: '2026-12-01T10:00:00.000Z' })
    expect(await screen.findByText('Fatto! Il piano è attivo.')).toBeInTheDocument()
  })

  it('annullato dall’utente: nessun dialogo', async () => {
    const user = userEvent.setup()
    avviaAcquisto.mockResolvedValue('annullato')
    await monta({ piano: 'base', provaUsata: true }, true)
    await user.click(await screen.findByRole('button', { name: 'Abbonati' }))
    await waitFor(() => expect(avviaAcquisto).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ripristina acquisti', async () => {
    const user = userEvent.setup()
    await monta({ piano: 'base', provaUsata: true }, true)
    await user.click(await screen.findByRole('button', { name: 'Ripristina acquisti' }))
    expect(await screen.findByText('Acquisti ripristinati')).toBeInTheDocument()
  })
})
