// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { FILTRI_VUOTI, type RigaLista } from '../../lib/adminManager'
import { ListaSaloni } from './ListaSaloni'

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))

const riga = (id: string, nome: string, extra: Partial<RigaLista> = {}) => ({
  row: { salonId: id, ownerName: `Titolare ${id}`, salonName: nome, livello: 'base', fonte: null, traccia: {} },
  livello: 'base',
  beta: 'mai',
  info: { ultimaAttivita: '2026-11-04T10:00:00.000Z', citta: 'Torino' },
  ...extra,
}) as RigaLista

function apri(desktop: boolean, selezione: Set<string> | null = null) {
  vi.stubGlobal('matchMedia', () => ({ matches: desktop, addEventListener: () => undefined, removeEventListener: () => undefined }))
  const onApri = vi.fn()
  const onSelezione = vi.fn()
  render(
    <LinguaProvider>
      <ListaSaloni
        modo="saloni"
        righe={[riga('a', 'Bauci'), riga('b', 'Pelo', { beta: 'in-beta' })]}
        pronte
        errore={false}
        inviti={new Map()}
        filtri={FILTRI_VUOTI}
        onFiltri={vi.fn()}
        filtroInvito="tutti"
        onFiltroInvito={vi.fn()}
        conAttivita
        selezione={selezione}
        onSelezione={onSelezione}
        onApri={onApri}
        adesso={new Date('2026-11-05T10:00:00.000Z')}
      />
    </LinguaProvider>,
  )
  return { onApri, onSelezione }
}

describe('ListaSaloni', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('su PC è una tabella con le colonne del design', () => {
    apri(true)
    const tabella = screen.getByRole('table')
    expect(within(tabella).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Salone', 'Titolare', 'Piano', 'Beta', 'Ultimo accesso', 'Città'])
    const prima = within(tabella).getAllByRole('row')[1] as HTMLElement
    expect(within(prima).getByText('Titolare a')).toBeInTheDocument()
    expect(within(prima).getByText('Torino')).toBeInTheDocument()
  })

  it('sul telefono resta la lista', () => {
    apri(false)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bauci, Titolare a' })).toBeInTheDocument()
  })

  it('su PC il nome apre la scheda', async () => {
    const { onApri } = apri(true)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Pelo, Titolare b' }))
    expect(onApri).toHaveBeenCalledWith('b')
  })

  it('su PC la selezione ha le caselle', async () => {
    const { onSelezione } = apri(true, new Set())
    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Bauci' }))
    expect(onSelezione).toHaveBeenCalledWith(new Set(['a']))
  })
})
