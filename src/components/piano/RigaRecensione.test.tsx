// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { plus, apri } = vi.hoisted(() => ({
  plus: { accesso: true, visibile: true },
  apri: vi.fn(),
}))

vi.mock('../../hooks/usePlus', () => ({
  usePlus: () => ({ ...plus, apri }),
}))

import { Providers } from '../../app/providers'
import { RigaRecensione } from './RigaRecensione'

describe('riga recensione', () => {
  beforeEach(() => {
    plus.accesso = true
    apri.mockClear()
  })

  it('su una visita non chiusa non si vede', () => {
    const { container } = render(<RigaRecensione mostra={false} proponi onChiedi={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('in Plus col flag e la proposta mostra il testo senza sconti', () => {
    render(<RigaRecensione mostra proponi onChiedi={() => undefined} />)
    expect(screen.getByRole('region', { name: 'Recensione Google' }).textContent ?? '').not.toMatch(/sconto/i)
    expect(screen.queryByLabelText('Plus')).toBeNull()
  })

  it('in Go mostra il tasto col segno Plus: il tocco apre la finestra e non chiede nulla', async () => {
    plus.accesso = false
    const onChiedi = vi.fn()
    render(<Providers><RigaRecensione mostra proponi={false} onChiedi={onChiedi} /></Providers>)
    const tasto = screen.getByRole('button', { name: /Chiedi/ })
    expect(tasto).toHaveTextContent('Plus')
    await userEvent.click(tasto)
    expect(apri).toHaveBeenCalledTimes(1)
    expect(onChiedi).not.toHaveBeenCalled()
  })
})
