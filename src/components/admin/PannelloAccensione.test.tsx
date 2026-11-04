// @vitest-environment happy-dom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/providers'
import type { Controllo } from '../../lib/accensione'
import { PannelloAccensione } from './PannelloAccensione'

const client = vi.hoisted(() => ({
  controlloAccensione: vi.fn(),
  confermaPartitaIva: vi.fn(async (_v: boolean) => undefined),
  accendiAbbonamenti: vi.fn(async (_p: string) => undefined),
  spegniAbbonamenti: vi.fn(async () => undefined),
}))
vi.mock('../../data/firebase/abbonamentiClient', () => client)

function controllo(verdi: boolean, attivi = false): Controllo {
  const voci: Controllo['voci'] = [
    { id: 'chiave', ok: verdi },
    { id: 'offering', ok: verdi, trovati: verdi ? 6 : 4, attesi: 6, mancanti: verdi ? [] : ['posto_extra_mensile', 'posto_extra_annuale'] },
    { id: 'webhook', ok: true, ultimoEventoIl: '2026-12-01T10:00:00.000Z' },
    { id: 'annuncio', ok: verdi, inviatoIl: '2026-11-20T10:00:00.000Z', pagamentiDal: '2026-12-10T10:00:00.000Z', mancanoGiorni: verdi ? 0 : 3 },
    { id: 'conferma', ok: verdi, confermatoIl: verdi ? '2026-12-02T10:00:00.000Z' : null },
  ]
  const pronti = voci.filter((v) => v.ok).length
  return { voci, pronti, tuttoVerde: pronti === 5, attivi }
}

function monta() {
  render(<Providers><PannelloAccensione /></Providers>)
}

describe('PannelloAccensione', () => {
  beforeEach(() => {
    for (const f of Object.values(client)) f.mockClear()
    client.controlloAccensione.mockResolvedValue(controllo(false))
  })

  it('con dei rossi: conteggio, dettagli e pulsante bloccato', async () => {
    monta()
    expect(await screen.findByText('1 di 5 pronti. Il clic si sblocca con tutto verde.')).toBeInTheDocument()
    expect(screen.getByText('Manca: incollala qui sotto')).toBeInTheDocument()
    expect(screen.getByText('4 di 6 pacchetti trovati')).toBeInTheDocument()
    expect(screen.getByText('Mancano: posto_extra_mensile, posto_extra_annuale')).toBeInTheDocument()
    expect(screen.getByText('Ultimo evento il 01/12/2026')).toBeInTheDocument()
    expect(screen.getByText('Mancano 3 giorni')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accendi gli abbonamenti' })).toBeDisabled()
  })

  it('la casella Partita IVA conferma e ricarica', async () => {
    const user = userEvent.setup()
    monta()
    await user.click(await screen.findByRole('checkbox', { name: 'Ho Partita IVA e profilo pagamenti' }))
    expect(client.confermaPartitaIva).toHaveBeenCalledWith(true)
    await waitFor(() => expect(client.controlloAccensione).toHaveBeenCalledTimes(2))
  })

  it('tutto verde: due conferme, la seconda con ACCENDI', async () => {
    const user = userEvent.setup()
    client.controlloAccensione.mockResolvedValue(controllo(true))
    monta()
    await user.click(await screen.findByRole('button', { name: 'Accendi gli abbonamenti' }))
    const primo = await screen.findByRole('dialog', { name: 'Accendere gli abbonamenti?' })
    await user.click(within(primo).getByRole('button', { name: 'Continua' }))
    const secondo = await screen.findByRole('dialog', { name: 'Accendere gli abbonamenti?' })
    const conferma = within(secondo).getByRole('button', { name: 'Accendi gli abbonamenti' })
    expect(conferma).toBeDisabled()
    await user.type(within(secondo).getByRole('textbox'), 'accendi')
    expect(conferma).toBeEnabled()
    await user.click(conferma)
    expect(client.accendiAbbonamenti).toHaveBeenCalledWith('ACCENDI')
  })

  it('da acceso: Spegni con dialogo', async () => {
    const user = userEvent.setup()
    client.controlloAccensione.mockResolvedValue(controllo(true, true))
    monta()
    expect(await screen.findByText('Abbonamenti attivi')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Spegni gli abbonamenti' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('Si torna come in beta. Chi ha già pagato tiene il piano fino a scadenza.')).toBeInTheDocument()
    await user.click(within(dialogo).getByRole('button', { name: 'Spegni gli abbonamenti' }))
    expect(client.spegniAbbonamenti).toHaveBeenCalled()
  })
})
