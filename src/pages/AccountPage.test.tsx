// @vitest-environment happy-dom
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'

const suggerisci = vi.fn()
const dettaglio = vi.fn()
vi.mock('../data/firebase/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/firebase/client')>()),
  callSuggerisciIndirizzi: (...a: unknown[]) => suggerisci(...a),
  callDettaglioIndirizzo: (...a: unknown[]) => dettaglio(...a),
}))

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  suggerisci.mockReset()
  dettaglio.mockReset()
  suggerisci.mockResolvedValue([{ placeId: 'abc', principale: 'Via Renoir 8', secondario: 'Quartu Sant’Elena CA, Italia' }])
  dettaglio.mockResolvedValue({ indirizzo: 'Via Renoir, 8, 09045 Quartu Sant’Elena CA, Italia', placeId: 'abc' })
})
afterEach(() => vi.useRealTimers())

async function apriToelettatura(user: ReturnType<typeof userEvent.setup>) {
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await user.click(await screen.findByRole('button', { name: 'Modifica attività' }))
  return screen.findByRole('dialog', { name: 'Toelettatura' })
}

describe('scheda Toelettatura, indirizzo', () => {
  it('salva indirizzo e placeId di un suggerimento, poi li toglie se riscrivo a mano', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    let dialog = await apriToelettatura(user)
    await user.type(within(dialog).getByRole('combobox'), 'via Renoir 8')
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    await user.click(await screen.findByRole('option', { name: /Via Renoir 8/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(account.uid).business.address).toBe('Via Renoir, 8, 09045 Quartu Sant’Elena CA, Italia')
    expect(getSettings(account.uid).business.placeId).toBe('abc')

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Toelettatura' })).not.toBeInTheDocument())
    await user.click(await screen.findByRole('button', { name: 'Modifica dati toelettatura, Indirizzo' }))
    dialog = await screen.findByRole('dialog', { name: 'Toelettatura' })
    const campo = within(dialog).getByRole('combobox')
    await user.clear(campo)
    await user.type(campo, 'Via Roma 1')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(account.uid).business.address).toBe('Via Roma 1')
    expect(getSettings(account.uid).business).not.toHaveProperty('placeId')
  })
})
