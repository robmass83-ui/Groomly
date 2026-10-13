// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { EarningsBucket } from '../../lib/earnings'
import { EarningsChart } from './EarningsChart'

const WEEK: EarningsBucket[] = [
  { key: '2026-10-12', label: 'Lun', sublabel: '12', title: 'Lunedì 12', incassato: 145, previsto: 0, isToday: false },
  { key: '2026-10-13', label: 'Mar', sublabel: '13', title: 'Martedì 13 · oggi', incassato: 110, previsto: 65, isToday: true },
  { key: '2026-10-14', label: 'Mer', sublabel: '14', title: 'Mercoledì 14', incassato: 0, previsto: 160, isToday: false },
]

function Harness({ hidden = false }: { hidden?: boolean }) {
  const [selected, setSelected] = useState<string | null>('2026-10-13')
  return <EarningsChart buckets={WEEK} scala={{ step: 50, max: 200 }} mediaBarre={128} selectedKey={selected} onSelect={setSelected} hidden={hidden} />
}

describe('EarningsChart', () => {
  it('mostra il fumetto della barra selezionata e lo sposta al tocco', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('status')).toHaveTextContent('Martedì 13 · oggi')
    expect(screen.getByRole('status')).toHaveTextContent('€ 110 incassati · +€ 65 previsti')
    const wed = screen.getByRole('button', { name: 'Mercoledì 14: 0 euro incassati, 160 previsti' })
    await user.click(wed)
    expect(wed).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('nessun incasso · +€ 160 previsti')
  })

  it('il fumetto della prima barra sta a sinistra, quello dell’ultima a destra', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /^Lunedì 12/ }))
    expect(screen.getByRole('status').getAttribute('style')).toMatch(/(^|;)\s*left: 0(px)?;/)
    await user.click(screen.getByRole('button', { name: /^Mercoledì 14/ }))
    expect(screen.getByRole('status').getAttribute('style')).toMatch(/(^|;)\s*right: 0(px)?;/)
  })

  it('griglia con scala, linea della media e valori sulle barre non selezionate', () => {
    render(<Harness />)
    expect(screen.getByText('200€')).toBeInTheDocument()
    expect(screen.getByText('50€')).toBeInTheDocument()
    expect(screen.getByTestId('earnings-average').getAttribute('style')).toContain('bottom: 64%')
    expect(screen.getByText('145')).toBeInTheDocument()
    expect(screen.getByText('160')).toBeInTheDocument()
    expect(screen.queryByText('175')).not.toBeInTheDocument()
  })

  it('le frecce spostano la selezione', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    screen.getByRole('group', { name: 'Grafico incassi' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /^Mercoledì 14/ })).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('button', { name: /^Lunedì 12/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('con importi nascosti niente numeri, solo proporzioni', () => {
    render(<Harness hidden />)
    expect(screen.queryByText('200€')).not.toBeInTheDocument()
    expect(screen.getAllByText('•')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('••• incassati · +••• previsti')
    expect(screen.getByRole('button', { name: 'Martedì 13 · oggi: importi nascosti' })).toBeInTheDocument()
  })

  it('senza barre mostra lo stato vuoto', () => {
    render(<EarningsChart buckets={[]} scala={{ step: 25, max: 100 }} mediaBarre={null} selectedKey={null} onSelect={() => {}} hidden={false} />)
    expect(screen.getByText('Nessun appuntamento in questo periodo')).toBeInTheDocument()
    expect(screen.queryByTestId('earnings-average')).not.toBeInTheDocument()
  })
})
