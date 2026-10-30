// @vitest-environment happy-dom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'

const suggerisci = vi.fn()
const dettaglio = vi.fn()
vi.mock('../../data/firebase/client', () => ({
  callSuggerisciIndirizzi: (...a: unknown[]) => suggerisci(...a),
  callDettaglioIndirizzo: (...a: unknown[]) => dettaglio(...a),
}))

import { IndirizzoInput } from './IndirizzoInput'

const RISPOSTA = [
  { placeId: 'abc', principale: 'Via Renoir 8', secondario: "Quartu Sant'Elena CA, Italia" },
  { placeId: 'def', principale: 'Via Renoir 80', secondario: 'Cagliari CA, Italia' },
]

function setup(props: { valore?: string; placeId?: string } = {}) {
  const onChange = vi.fn()
  const user = userEvent.setup({ delay: null })
  const ui = (valore: string, placeId?: string) => (
    <LinguaProvider>
      <IndirizzoInput label="Indirizzo" valore={valore} placeId={placeId} onChange={onChange} />
    </LinguaProvider>
  )
  const r = render(ui(props.valore ?? '', props.placeId))
  // Il componente è controllato: la prova rimanda il valore appena scritto.
  onChange.mockImplementation((n: { indirizzo: string; placeId?: string }) => r.rerender(ui(n.indirizzo, n.placeId)))
  return { onChange, user }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  suggerisci.mockReset()
  dettaglio.mockReset()
  suggerisci.mockResolvedValue(RISPOSTA)
  dettaglio.mockResolvedValue({ indirizzo: "Via Renoir, 8, 09045 Quartu Sant'Elena CA, Italia", placeId: 'abc' })
})
afterEach(() => vi.useRealTimers())

async function scrivi(user: ReturnType<typeof userEvent.setup>, testo: string) {
  await user.type(screen.getByRole('combobox'), testo)
  await act(async () => { await vi.advanceTimersByTimeAsync(300) })
}

describe('IndirizzoInput', () => {
  it('cerca dopo 3 caratteri e 300 ms, una volta sola', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('combobox'), 'via')
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(suggerisci).not.toHaveBeenCalled()
    await user.type(screen.getByRole('combobox'), ' Renoir 8')
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(suggerisci).toHaveBeenCalledTimes(1)
    expect(suggerisci).toHaveBeenCalledWith('via Renoir 8', expect.stringMatching(/.+/), 'it')
    const opzioni = screen.getAllByRole('option')
    expect(opzioni).toHaveLength(2)
    expect(opzioni[0]).toHaveTextContent('Via Renoir 8')
    expect(opzioni[0]).toHaveTextContent("Quartu Sant'Elena CA, Italia")
  })

  it('scarta la risposta lenta di un testo vecchio', async () => {
    let lenta: (v: unknown) => void = () => undefined
    suggerisci.mockImplementationOnce(() => new Promise((res) => { lenta = res }))
    suggerisci.mockResolvedValueOnce(RISPOSTA)
    const { user } = setup()
    await scrivi(user, 'via Ren')
    await scrivi(user, 'oir 8')
    await act(async () => { lenta([{ placeId: 'x', principale: 'Via Ren vecchia', secondario: '' }]) })
    expect(screen.queryByText('Via Ren vecchia')).toBeNull()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('la scelta con il tocco chiama il dettaglio e chiude la lista', async () => {
    const { user, onChange } = setup()
    await scrivi(user, 'via Renoir 8')
    await user.click(screen.getAllByRole('option')[0])
    expect(onChange).toHaveBeenLastCalledWith({ indirizzo: "Via Renoir, 8, 09045 Quartu Sant'Elena CA, Italia", placeId: 'abc' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByText('Indirizzo verificato')).toBeInTheDocument()
  })

  it('se il dettaglio fallisce tiene il testo del suggerimento senza placeId', async () => {
    dettaglio.mockResolvedValue(null)
    const { user, onChange } = setup()
    await scrivi(user, 'via Renoir 8')
    await user.click(screen.getAllByRole('option')[0])
    expect(onChange).toHaveBeenLastCalledWith({ indirizzo: "Via Renoir 8, Quartu Sant'Elena CA, Italia" })
  })

  it('con placeId, scrivere un carattere toglie il placeId', async () => {
    const { user, onChange } = setup({ valore: 'Via Roma 1', placeId: 'zzz' })
    expect(screen.getByText('Indirizzo verificato')).toBeInTheDocument()
    await user.type(screen.getByRole('combobox'), 'x')
    expect(onChange).toHaveBeenCalledWith({ indirizzo: 'Via Roma 1x' })
    expect(screen.queryByText('Indirizzo verificato')).toBeNull()
  })

  it('nessun suggerimento mostra indNonTrovi', async () => {
    suggerisci.mockResolvedValue([])
    const { user } = setup()
    await scrivi(user, 'via Inesistente 99')
    expect(screen.getByText('Non trovi il tuo indirizzo? Usa quello che hai scritto')).toBeInTheDocument()
  })

  it('tastiera: freccia giù e Invio scelgono la prima, Esc chiude', async () => {
    const { user, onChange } = setup()
    await scrivi(user, 'via Renoir 8')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith({ indirizzo: "Via Renoir, 8, 09045 Quartu Sant'Elena CA, Italia", placeId: 'abc' })
    await user.type(screen.getByRole('combobox'), '1')
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('stesso token per suggerimenti e dettaglio, nuovo dopo la scelta', async () => {
    const { user } = setup()
    await scrivi(user, 'via Renoir 8')
    await user.click(screen.getAllByRole('option')[0])
    expect(dettaglio.mock.calls[0][1]).toBe(suggerisci.mock.calls[0][1])
    await scrivi(user, ' bis')
    expect(suggerisci.mock.calls[1][1]).not.toBe(suggerisci.mock.calls[0][1])
  })

  it('la lista si chiude quando il campo perde il focus', async () => {
    const { user } = setup()
    await scrivi(user, 'via Renoir 8')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.tab()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('il clic su una riga funziona anche con la chiusura al blur', async () => {
    const { user, onChange } = setup()
    await scrivi(user, 'via Renoir 8')
    await user.click(screen.getAllByRole('option')[1])
    expect(onChange).toHaveBeenLastCalledWith({ indirizzo: "Via Renoir, 8, 09045 Quartu Sant'Elena CA, Italia", placeId: 'abc' })
  })
})
