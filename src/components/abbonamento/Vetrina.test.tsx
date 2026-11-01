// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/providers'
import { createAccount } from '../../data/local/auth'
import type { PianoValore } from '../../hooks/usePiano'
import { provaConcessa, statoPiano, type ProMain } from '../../lib/piano'
import { Vetrina } from './Vetrina'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/usePiano')>('../../hooks/usePiano')
  return { ...actual, usePiano: () => pianoForzato.valore ?? actual.usePiano() }
})

const adesso = new Date('2026-11-01T10:00:00.000Z')

function pianoDa(doc: ProMain | undefined): PianoValore {
  return {
    mostraPiani: true,
    abbonamentiAttivi: false,
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

async function monta(doc: ProMain | undefined) {
  await createAccount('ada@salone.it', 'segretissimo')
  pianoForzato.valore = pianoDa(doc)
  render(
    <Providers>
      <MemoryRouter><Vetrina piano="plus" /></MemoryRouter>
    </Providers>,
  )
}

describe('Vetrina Plus', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('in grazia la vetrina di Plus non offre la prova gratis', async () => {
    // Plus a pagamento sospeso: oggi è Go, ma ha già avuto Plus.
    await monta({ piano: 'pro', stato: 'sospeso', fonte: 'play', scadeIl: '2026-10-20T00:00:00.000Z' })
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByText('Prova Plus gratis per 30 giorni')).not.toBeInTheDocument()
    expect(screen.queryByText('30 giorni gratis, poi 9,99 €/mese')).not.toBeInTheDocument()
    expect(screen.queryByText('30 GIORNI GRATIS')).not.toBeInTheDocument()
  })

  it('un Go puro vede la prova gratis', async () => {
    await monta(undefined)
    expect(await screen.findByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).toBeInTheDocument()
  })
})
