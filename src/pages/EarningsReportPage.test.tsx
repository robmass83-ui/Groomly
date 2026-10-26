// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAppointment, saveClose, setAppointmentStatus } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import type { PianoValore } from '../hooks/usePiano'
import { statoPiano } from '../lib/piano'
import type { DogWrite } from '../types/models'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => {
      const reale = actual.usePiano()
      return pianoForzato.valore ?? reale
    },
  }
})

function dog(name: string): DogWrite {
  return { name, species: 'cane', breed: '', ageCategory: 'adulto', size: 'piccola', temperament: 'bravo', clientType: 'occasionale', contact: { name: '', phone: '333' } }
}

function line(price: number) {
  return [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }]
}

async function seedPaid() {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const uid = account.uid
  const [rex, zeus, luna, otto, fido] = ['Rex', 'Zeus', 'Luna', 'Otto', 'Fido'].map((name) => createDog(uid, dog(name)))
  saveClose(uid, createAppointment(uid, { dogId: rex.id, start: new Date(2026, 9, 12, 10, 0), services: line(40) }).id, { total: 40, actualDurationMin: 30, adjustmentNote: null, paymentMethod: 'pos' }, true)
  saveClose(uid, createAppointment(uid, { dogId: zeus.id, start: new Date(2026, 9, 13, 9, 0), services: line(25) }).id, { total: 25, actualDurationMin: 30, adjustmentNote: null, paymentMethod: 'contanti' }, true)
  createAppointment(uid, { dogId: luna.id, start: new Date(2026, 9, 13, 15, 30), services: line(30) })
  createAppointment(uid, { dogId: otto.id, start: new Date(2026, 9, 14, 10, 0), services: line(160) })
  setAppointmentStatus(uid, createAppointment(uid, { dogId: fido.id, start: new Date(2026, 9, 15, 11, 0), services: line(35) }).id, 'disdetto', 'cliente')
  return uid
}

describe('pagina Incassi e report', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 15, 5))
  })

  afterEach(() => {
    pianoForzato.valore = null
    vi.useRealTimers()
  })

  it('questo mese mostra gli stessi soldi e i pagamenti', async () => {
    const uid = await seedPaid()
    render(<App memory isDev={false} initialPath="/incassi/report" />)
    expect(await screen.findByRole('heading', { name: 'Incassi e report' })).toBeInTheDocument()
    expect(screen.getByText('Ottobre 2026 · fino a oggi')).toBeInTheDocument()
    expect(screen.getByText('POS')).toBeInTheDocument()
    expect(screen.getByText('Contanti')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Esporta' })).toBeInTheDocument()
    expect(getSettings(uid).ui.hideAmounts).toBe(false)
  })

  it('mese scorso cambia titolo', async () => {
    await seedPaid()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi/report" />)
    await user.click(await screen.findByRole('button', { name: 'Mese scorso' }))
    expect(screen.getByText('Settembre 2026')).toBeInTheDocument()
  })

  it('con i piani accesi un salone base non apre il passato né l’export', async () => {
    await seedPaid()
    const apriPaywall = vi.fn()
    pianoForzato.valore = {
      mostraPiani: true,
      abbonamentiAttivi: false,
      stato: statoPiano(undefined, new Date(2026, 9, 13)),
      funzioni: {},
      provaUsata: false,
      paywall: null,
      apriPaywall,
      chiudiPaywall: () => undefined,
      avvisa: async () => undefined,
    }
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi/report" />)
    await user.click(await screen.findByRole('button', { name: 'Mese scorso' }))
    expect(apriPaywall).toHaveBeenCalledWith('reportPassati')
    expect(screen.getByText('Ottobre 2026 · fino a oggi')).toBeInTheDocument()
    expect(screen.queryByText('Settembre 2026')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esporta' }))
    expect(apriPaywall).toHaveBeenCalledWith('export')
    expect(screen.queryByRole('dialog', { name: 'Esporta per il commercialista' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vuoi aggiornare i prezzi del listino?' })).not.toBeInTheDocument()
  })

  it('con l’accesso Pro l’export e il mese scorso partono', async () => {
    await seedPaid()
    pianoForzato.valore = {
      mostraPiani: true,
      abbonamentiAttivi: false,
      stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, new Date(2026, 9, 13)),
      funzioni: {},
      provaUsata: false,
      paywall: null,
      apriPaywall: vi.fn(),
      chiudiPaywall: () => undefined,
      avvisa: async () => undefined,
    }
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi/report" />)
    await user.click(await screen.findByRole('button', { name: 'Mese scorso' }))
    expect(screen.getByText('Settembre 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esporta' }))
    expect(screen.getByRole('dialog', { name: 'Esporta per il commercialista' })).toBeInTheDocument()
  })
})
