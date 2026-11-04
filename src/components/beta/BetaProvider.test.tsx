// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InvitoBeta } from '../../lib/betaInvito'
import { statoPiano, type ProMain } from '../../lib/piano'
import { BetaProvider, useBeta } from './BetaProvider'

const finto = vi.hoisted(() => ({
  account: { uid: 'u1', salonId: 'u1', role: 'titolare' as string | undefined },
  pro: undefined as ProMain | undefined,
  onInvito: null as ((invito: InvitoBeta | null) => void) | null,
}))
const listenInvitoBeta = vi.hoisted(() => vi.fn(async (_id: string, onData: (invito: InvitoBeta | null) => void) => {
  finto.onInvito = onData
  return () => { finto.onInvito = null }
}))

vi.mock('../../data/firebase/enabled', () => ({ firebaseEnabled: () => true }))
vi.mock('../../data/firebase/betaClient', () => ({ listenInvitoBeta }))
vi.mock('../../hooks/useSession', () => ({ useSession: () => ({ gate: { kind: 'in', account: finto.account } }) }))
vi.mock('../../hooks/usePiano', () => ({
  usePiano: () => ({ stato: statoPiano(finto.pro, new Date()), traccia: finto.pro ?? {}, pronto: true }),
}))

const GIORNO = 24 * 60 * 60 * 1000
const tra = (giorni: number) => new Date(Date.now() + giorni * GIORNO).toISOString()
const invito: InvitoBeta = {
  salonId: 'u1', piano: 'pro', giorni: 30, messaggio: null, stato: 'invitato', invitatoIl: tra(-1), scadeInvitoIl: tra(13),
  rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null, invitatoDa: 'op', aggiornatoIl: tra(-1),
}

function Mostra() {
  const beta = useBeta()
  return (
    <>
      <span>{`${beta.fase}|titolare:${beta.titolare}|non letti:${beta.nonLetti}`}</span>
      <button type="button" onClick={() => beta.segnaLetto(...beta.avvisi.map((a) => a.id))}>leggi</button>
    </>
  )
}

describe('BetaProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    listenInvitoBeta.mockClear()
    finto.account = { uid: 'u1', salonId: 'u1', role: 'titolare' }
    finto.pro = undefined
  })
  afterEach(cleanup)

  it("il titolare ascolta l'invito del suo salone e lo vede", async () => {
    render(<BetaProvider><Mostra /></BetaProvider>)
    await waitFor(() => expect(listenInvitoBeta).toHaveBeenCalledWith('u1', expect.any(Function)))
    act(() => finto.onInvito?.(invito))
    expect(screen.getByText('invitato|titolare:true|non letti:1')).toBeInTheDocument()
  })

  it('il segno di lettura resta dopo un nuovo montaggio', async () => {
    const { unmount } = render(<BetaProvider><Mostra /></BetaProvider>)
    await waitFor(() => expect(finto.onInvito).not.toBeNull())
    act(() => finto.onInvito?.(invito))
    act(() => screen.getByRole('button', { name: 'leggi' }).click())
    expect(screen.getByText('invitato|titolare:true|non letti:0')).toBeInTheDocument()
    unmount()
    render(<BetaProvider><Mostra /></BetaProvider>)
    await waitFor(() => expect(finto.onInvito).not.toBeNull())
    act(() => finto.onInvito?.(invito))
    expect(screen.getByText('invitato|titolare:true|non letti:0')).toBeInTheDocument()
  })

  it.each([
    ['socio', { uid: 'u2', salonId: 'u1', role: 'socio' }],
    ['collaboratore', { uid: 'u3', salonId: 'u1', role: 'collaboratore' }],
  ])("il %s non ascolta l'invito", async (_nome, account) => {
    finto.account = account
    render(<BetaProvider><Mostra /></BetaProvider>)
    await new Promise((fine) => setTimeout(fine, 20))
    expect(listenInvitoBeta).not.toHaveBeenCalled()
    expect(screen.getByText('nessuna|titolare:false|non letti:0')).toBeInTheDocument()
  })

  it('il socio vede la beta in corso dal piano', async () => {
    finto.account = { uid: 'u2', salonId: 'u1', role: 'socio' }
    finto.pro = { piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: tra(20), exBeta: true, betaDal: tra(-3), betaFinoAl: tra(20) }
    render(<BetaProvider><Mostra /></BetaProvider>)
    expect(screen.getByText('in-corso|titolare:false|non letti:0')).toBeInTheDocument()
  })
})
