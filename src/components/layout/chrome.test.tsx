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

  it('mostra il footer e l’ombra del pannello o del piede', () => {
    render(
      <Sheet open title="Prova" onClose={() => undefined} footer={<button type="button">Salva</button>}>
        <p>Dentro</p>
      </Sheet>,
    )
    const salva = screen.getByRole('button', { name: 'Salva' })
    expect(salva).toBeInTheDocument()
    const dialog = screen.getByRole('dialog').getAttribute('style') ?? ''
    const footer = salva.parentElement?.getAttribute('style') ?? ''
    expect(dialog.includes('var(--sh-3)') || footer.includes('var(--sh-foot)')).toBe(true)
  })

  it('il velo senza closeButton usa lo scrim', () => {
    render(<Sheet open title="Prova" onClose={() => undefined}><p>Dentro</p></Sheet>)
    expect(screen.getByRole('button', { name: 'Chiudi' }).getAttribute('style')).toContain('background: var(--scrim)')
  })
})

describe('campo', () => {
  it('etichetta a 4 px, 11 px, peso 600, margine 0, input alto 32 px', () => {
    render(<Input label="Nome" />)
    const input = screen.getByLabelText('Nome')
    expect(input.getAttribute('style')).toContain('height: 32px')
    const label = input.closest('label') as HTMLElement
    expect(label.getAttribute('style')).toContain('gap: 4px')
    expect(label.getAttribute('style')).toContain('margin: 0')
    const text = screen.getByText('Nome')
    expect(text.getAttribute('style')).toContain('font-size: 11px')
    expect(text.getAttribute('style')).toContain('font-weight: 600')
    expect(text.getAttribute('style')).toContain('margin: 0')
  })

  it('size lg è alto 44 px', () => {
    render(<Input label="Email" size="lg" />)
    expect(screen.getByLabelText('Email').getAttribute('style')).toContain('height: 44px')
  })
})
