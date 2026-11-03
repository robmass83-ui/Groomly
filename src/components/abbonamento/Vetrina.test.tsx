// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/providers'
import { createAccount } from '../../data/local/auth'
import type { PianoValore } from '../../hooks/usePiano'
import { provaConcessa, statoPiano, type ProMain } from '../../lib/piano'
import { Vetrina } from './Vetrina'

const { scriviInteresse } = vi.hoisted(() => ({ scriviInteresse: vi.fn(async (_feature: string) => undefined) }))
vi.mock('../../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../../data/firebase/client')>('../../data/firebase/client')
  return { ...actual, scriviInteresse }
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
  }
}

async function monta(doc: ProMain | undefined, abbonamentiAttivi = false, piano: 'plus' | 'salone' = 'plus') {
  await createAccount('ada@salone.it', 'segretissimo')
  pianoForzato.valore = pianoDa(doc, abbonamentiAttivi)
  render(
    <Providers>
      <MemoryRouter><Vetrina piano={piano} /></MemoryRouter>
    </Providers>,
  )
}

describe('Vetrina Plus', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
    scriviInteresse.mockClear()
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

  it('Avvisami su Plus scrive l’interesse piano-plus e apre «In arrivo»', async () => {
    const user = userEvent.setup()
    await monta({ piano: 'pro', stato: 'sospeso', fonte: 'play', scadeIl: '2026-10-20T00:00:00.000Z' })
    await user.click(await screen.findByRole('button', { name: 'Avvisami' }))
    await waitFor(() => expect(scriviInteresse).toHaveBeenCalledWith('piano-plus'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
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
