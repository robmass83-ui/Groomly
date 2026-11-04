// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import type { PianoValore } from '../../hooks/usePiano'
import { BannerPagamenti } from './BannerPagamenti'

const forzato = vi.hoisted(() => ({ ruolo: 'titolare' as string | undefined, attivi: false, dal: '2026-12-21T10:00:00.000Z' as string | null }))
vi.mock('../../hooks/useSession', () => ({ useSession: () => ({ gate: { kind: 'in', account: { role: forzato.ruolo } } }) }))
vi.mock('../../hooks/usePiano', () => ({
  usePiano: () => ({
    abbonamentiAttivi: forzato.attivi,
    acquisto: { chiaveSdk: '', offeringId: 'groomly_standard', earlyAdopter: false, offertaEarly: { it: '', en: '', es: '' }, pagamentiDal: forzato.dal },
  }) as Partial<PianoValore>,
}))

function monta() {
  return render(<LinguaProvider><BannerPagamenti /></LinguaProvider>)
}

const TESTO = /Plus e Salone saranno a pagamento/

describe('BannerPagamenti', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.assign(forzato, { ruolo: 'titolare', attivi: false, dal: '2026-12-21T10:00:00.000Z' })
  })

  it('il titolare vede la data di partenza', () => {
    monta()
    expect(screen.getByText(TESTO)).toHaveTextContent('21/12/2026')
  })

  it('niente senza annuncio, ad abbonamenti accesi o per i collaboratori', () => {
    forzato.dal = null
    const { unmount } = monta()
    expect(screen.queryByText(TESTO)).not.toBeInTheDocument()
    unmount()
    Object.assign(forzato, { dal: '2026-12-21T10:00:00.000Z', attivi: true })
    const secondo = monta()
    expect(screen.queryByText(TESTO)).not.toBeInTheDocument()
    secondo.unmount()
    Object.assign(forzato, { attivi: false, ruolo: 'collaboratore' })
    monta()
    expect(screen.queryByText(TESTO)).not.toBeInTheDocument()
  })

  it('si chiude e resta chiuso per quella data', async () => {
    const user = userEvent.setup()
    const { unmount } = monta()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByText(TESTO)).not.toBeInTheDocument()
    unmount()
    monta()
    expect(screen.queryByText(TESTO)).not.toBeInTheDocument()
  })
})
