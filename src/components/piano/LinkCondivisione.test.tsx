// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/providers'
import { createAccount } from '../../data/local/auth'
import { getSettings } from '../../data/local/settings'
import { createService } from '../../data/local/services'
import { storageKeys, writeJson } from '../../data/local/storage'
import type { PianoValore } from '../../hooks/usePiano'
import { statoPiano } from '../../lib/piano'
import { LinkCondivisione } from './LinkCondivisione'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/usePiano')>('../../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

function pianoPro(): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: false,
    tour: { acceso: false, dal: null },
    stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, new Date(2026, 9, 27)),
    provaUsata: true,
    provaConcessa: false,
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall: () => undefined,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
    livelloNome: 'pro',
  }
}

function monta(children: ReactNode) {
  return render(
    <Providers>
      <MemoryRouter>{children}</MemoryRouter>
    </Providers>,
  )
}

/** Salone con indirizzo, orari e listino, ma senza logo né backup. */
async function salonePocoCompleto(prenotazioniOnline: boolean) {
  const account = await createAccount('sara@salone.it', 'segretissimo')
  writeJson(storageKeys.auth, { ...account, role: 'titolare' })
  const base = getSettings(account.uid)
  writeJson(storageKeys.settings(account.uid), {
    ...base,
    business: { ...base.business, salonName: 'Salone Sara', address: 'Via Roma 1', vatNumber: '12345678901' },
    orari: { 1: [{ da: '09:00', a: '18:00' }] },
    prenotazioniOnline,
  })
  pianoForzato.valore = pianoPro()
}

describe('link di condivisione delle prenotazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('a prenotazioni spente dice quali passi mancano ed è un link a Impostazioni', async () => {
    await salonePocoCompleto(false)
    monta(<LinkCondivisione />)
    const frase = await screen.findByRole('link', { name: 'Per accendere le prenotazioni manca: Logo, Fai il primo backup.' })
    expect(frase).toHaveAttribute('href', '/impostazioni')
  })

  it('a prenotazioni accese la frase dei passi mancanti non c’è', async () => {
    await salonePocoCompleto(true)
    monta(<LinkCondivisione />)
    expect(await screen.findByText('Prenotazioni online')).toBeInTheDocument()
    expect(screen.queryByText(/manca:/)).not.toBeInTheDocument()
  })

  it('a prenotazioni accese senza un servizio principale pubblicabile resta il link per sistemare i servizi', async () => {
    const account = await createAccount('sara@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    const base = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...base,
      business: { ...base.business, salonName: 'Salone Sara', address: 'Via Roma 1', vatNumber: '12345678901' },
      orari: { 1: [{ da: '09:00', a: '18:00' }] },
      priceSheet: { intestazione: { logo: 'data:image/png;base64,AAAA' } },
      backup: { ...base.backup, impostato: true },
      prenotazioniOnline: true,
    })
    createService(account.uid, { name: 'Unghie', kind: 'extra', durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 5, media: 5, grande: 5 }, active: true })
    pianoForzato.valore = pianoPro()
    monta(<LinkCondivisione />)
    expect(await screen.findByText('Prenotazioni online')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Prima imposta prezzi e servizi.' })).toHaveAttribute('href', '/impostazioni/servizi')
  })
})
