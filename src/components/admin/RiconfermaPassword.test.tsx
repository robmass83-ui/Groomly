// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRiconferma } from './RiconfermaPassword'

const client = vi.hoisted(() => ({ riconfermaPassword: vi.fn(async (_password: string) => undefined) }))
vi.mock('../../data/firebase/client', () => client)

const RICHIESTA = Object.assign(new Error('Conferma la password'), { details: { codice: 'riconferma_richiesta' } })

function Prova({ azione, esiti }: { azione: () => Promise<string>; esiti: string[] }) {
  const { conRiconferma, dialogo } = useRiconferma()
  return (
    <>
      <button type="button" onClick={() => { void conRiconferma(azione).then((v) => esiti.push(v), (e: Error) => esiti.push(`errore: ${e.message}`)) }}>vai</button>
      {dialogo}
    </>
  )
}

async function avvia(azione: () => Promise<string>) {
  const esiti: string[] = []
  const user = userEvent.setup()
  render(<Prova azione={azione} esiti={esiti} />)
  await user.click(screen.getByRole('button', { name: 'vai' }))
  return { esiti, user }
}

describe('riconferma password', () => {
  beforeEach(() => {
    client.riconfermaPassword.mockReset()
    client.riconfermaPassword.mockResolvedValue(undefined)
  })
  afterEach(cleanup)

  it('senza richiesta del server non chiede nulla', async () => {
    const { esiti } = await avvia(async () => 'fatto')
    await waitFor(() => expect(esiti).toEqual(['fatto']))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con la password giusta ripete l’azione una volta sola', async () => {
    const azione = vi.fn<() => Promise<string>>().mockRejectedValueOnce(RICHIESTA).mockResolvedValue('fatto')
    const { esiti, user } = await avvia(azione)
    await user.type(await screen.findByLabelText('Password attuale'), 'segreta')
    await user.click(screen.getByRole('button', { name: 'Conferma' }))
    await waitFor(() => expect(esiti).toEqual(['fatto']))
    expect(client.riconfermaPassword).toHaveBeenCalledWith('segreta')
    expect(azione).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con la password sbagliata lo dice, resta aperta e non ripete', async () => {
    client.riconfermaPassword.mockRejectedValue(new Error('no'))
    const azione = vi.fn<() => Promise<string>>().mockRejectedValue(RICHIESTA)
    const { esiti, user } = await avvia(azione)
    await user.type(await screen.findByLabelText('Password attuale'), 'sbagliata')
    await user.click(screen.getByRole('button', { name: 'Conferma' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(azione).toHaveBeenCalledTimes(1)
    expect(esiti).toEqual([])
  })

  it('annullando l’azione non si ripete', async () => {
    const azione = vi.fn<() => Promise<string>>().mockRejectedValue(RICHIESTA)
    const { esiti, user } = await avvia(azione)
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    await waitFor(() => expect(esiti).toEqual(['errore: Conferma la password']))
    expect(azione).toHaveBeenCalledTimes(1)
  })

  it('gli altri errori passano intatti', async () => {
    const { esiti } = await avvia(async () => { throw new Error('rete') })
    await waitFor(() => expect(esiti).toEqual(['errore: rete']))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
