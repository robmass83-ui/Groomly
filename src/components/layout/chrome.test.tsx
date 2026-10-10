// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Input } from '../ui/Input'
import { BottomNav } from './BottomNav'
import { Sheet } from './Sheet'

describe('barra in basso', () => {
  it('la voce attiva è primaria e in grassetto, le altre restano grigie a 600', () => {
    render(<MemoryRouter initialEntries={['/animali']}><BottomNav /></MemoryRouter>)
    const active = screen.getByRole('link', { name: 'Animali' })
    expect(active.getAttribute('style')).toContain('font-weight: 700')
    expect(active.getAttribute('style')).toContain('color: var(--pri)')
    const idle = screen.getByRole('link', { name: 'Calendario' })
    expect(idle.getAttribute('style')).toContain('font-weight: 600')
    expect(idle.getAttribute('style')).toContain('color: var(--tx3)')
  })
})

describe('foglio', () => {
  it('si ferma a 90vh e resta alto come il contenuto', () => {
    render(<Sheet open title="Prova" onClose={() => undefined}><p>Dentro</p></Sheet>)
    const style = screen.getByRole('dialog').getAttribute('style') ?? ''
    expect(style).toContain('max-height: 90vh')
    expect(style).not.toMatch(/(^|[^-])height: \d/)
  })
})

describe('campo', () => {
  it('etichetta a 4 px, 13 px, peso 600, margine 0, input alto 44 px', () => {
    render(<Input label="Nome" />)
    const input = screen.getByLabelText('Nome')
    expect(input.getAttribute('style')).toContain('height: 44px')
    const label = input.closest('label') as HTMLElement
    expect(label.getAttribute('style')).toContain('gap: 4px')
    expect(label.getAttribute('style')).toContain('margin: 0')
    const text = screen.getByText('Nome')
    expect(text.getAttribute('style')).toContain('font-size: 13px')
    expect(text.getAttribute('style')).toContain('font-weight: 600')
    expect(text.getAttribute('style')).toContain('margin: 0')
  })
})
