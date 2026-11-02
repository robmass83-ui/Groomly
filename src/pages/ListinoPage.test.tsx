// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, type PriceFile } from '../data/local/settings'
import { ListinoPage } from './ListinoPage'

let role: string | undefined
let gateKind: 'in' | 'loading' = 'in'

const file: PriceFile = {
  id: 'f1',
  fileName: 'Listino 2026.pdf',
  mime: 'application/pdf',
  byteSize: 1000,
  uploadedAt: '2026-01-01T00:00:00.000Z',
  dataUrl: 'data:application/pdf;base64,AAAA',
}

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    gate: gateKind === 'in' ? { kind: 'in', account: { uid: 'u1', email: 'x@y.it', role } } : { kind: 'loading' },
  }),
}))
vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { ...getSettings('u1'), priceList: file }, save: () => true, ready: true }),
}))
vi.mock('../hooks/useServices', () => ({
  useServices: () => ({
    services: [
      {
        id: 's1',
        name: 'Bagno completo',
        kind: 'principale',
        durationMin: { piccola: 60, media: 60, grande: 60 },
        price: { piccola: 30, media: 40, grande: 50 },
        order: 1,
        active: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        iconKey: 'bagno',
      },
    ],
  }),
}))
vi.mock('../hooks/useLocalData', () => ({ useLocalData: () => true }))
vi.mock('../hooks/useFileSrc', () => ({ useFileSrc: () => undefined }))
vi.mock('../components/layout/Toast', () => ({ useToast: () => ({ show: () => {} }) }))
vi.mock('./ShellFrame', () => ({ ShellFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

function apri() {
  render(<MemoryRouter><ListinoPage /></MemoryRouter>)
}

const AZIONI = ['Gestione listino', 'Aggiorna prezzi', 'Aggiungi il tuo listino prezzi']

describe('ListinoPage ruoli', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'it')
    role = undefined
    gateKind = 'in'
  })

  it('il collaboratore vede il listino in sola lettura', () => {
    role = 'collaboratore'
    apri()
    for (const name of AZIONI) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Rinomina/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Elimina/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestisci' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modifica' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Aggiungi il tuo listino prezzi')).not.toBeInTheDocument()
    expect(screen.getByText('Listino 2026.pdf')).toBeInTheDocument()
    expect(screen.getByText('Bagno completo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stampa e condividi' })).toBeInTheDocument()
  })

  it.each(['titolare', 'socio'])('%s vede tutte le azioni di modifica', (r) => {
    role = r
    apri()
    for (const name of AZIONI) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rinomina Listino 2026.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elimina Listino 2026.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gestisci' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modifica' })).toBeInTheDocument()
  })

  it('con sessione non ancora in resta come per il titolare', () => {
    gateKind = 'loading'
    apri()
    expect(screen.getByRole('button', { name: 'Gestione listino' })).toBeInTheDocument()
  })
})
