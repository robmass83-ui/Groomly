// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Input } from '../ui/Input'
import { BottomNav } from './BottomNav'
import { Sheet } from './Sheet'

describe('barra in basso', () => {
  it('ha sei voci uguali, Agenda sulla rotta del calendario e il + sopra la barra', () => {
    render(<MemoryRouter initialEntries={['/animali/tata']}><BottomNav /></MemoryRouter>)
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Home', 'Animali', 'Agenda', 'Mensili', 'Listino', 'Impostazioni'])
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Animali' })).toHaveAttribute('href', '/animali')
    expect(screen.getByRole('link', { name: 'Agenda' })).toHaveAttribute('href', '/calendario')
    expect(screen.getByRole('link', { name: 'Mensili' })).toHaveAttribute('href', '/mensili')
    expect(screen.getByRole('link', { name: 'Listino' })).toHaveAttribute('href', '/listino')
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toHaveAttribute('href', '/impostazioni')
    expect(screen.queryByTestId('bell-dot')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Animali' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Agenda' })).not.toHaveAttribute('aria-current')
    const agenda = screen.getByRole('link', { name: 'Agenda' }).innerHTML
    expect(agenda).toContain('M3.5 10h17M8 3v4M16 3v4')
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' })
    expect(nav.className).toContain('bottom-nav')
    expect(nav.querySelector('.bottom-nav__bar')).not.toBeNull()
    const fab = screen.getByRole('button', { name: 'Aggiungi' })
    expect(fab.className).toContain('bottom-nav__fab')
    expect(fab).toHaveAttribute('aria-expanded', 'false')
    expect(fab.innerHTML).toContain('M12 5v14M5 12h14')
  })

  it('tiene attiva la sezione anche nelle sottopagine e ruota il + col menu aperto', () => {
    render(<MemoryRouter initialEntries={['/listino/vedi']}><BottomNav /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Listino' })).toHaveAttribute('aria-current', 'page')
    cleanup()
    render(<MemoryRouter initialEntries={['/impostazioni/servizi']}><BottomNav /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toHaveAttribute('aria-current', 'page')
    cleanup()
    render(<MemoryRouter initialEntries={['/']}><BottomNav menuOpen /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Animali' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: 'Aggiungi' })).toHaveAttribute('aria-expanded', 'true')
    cleanup()
    render(<MemoryRouter initialEntries={['/mensili']}><BottomNav bell /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Mensili, ci sono avvisi' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('bell-dot')).toBeInTheDocument()
  })

  it('il bollino fiscale sta solo dentro Altro e solo con tax', () => {
    render(<MemoryRouter initialEntries={['/']}><BottomNav /></MemoryRouter>)
    expect(screen.queryByTestId('tax-dot')).not.toBeInTheDocument()
    cleanup()
    render(<MemoryRouter initialEntries={['/']}><BottomNav tax /></MemoryRouter>)
    const dot = screen.getByTestId('tax-dot')
    expect(dot.className).toContain('bottom-nav__dot')
    expect(within(screen.getByRole('link', { name: 'Impostazioni, dati da completare' })).getByTestId('tax-dot')).toBe(dot)
    expect(within(screen.getByRole('link', { name: 'Home' })).queryByTestId('tax-dot')).not.toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: 'Mensili' })).queryByTestId('tax-dot')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bell-dot')).not.toBeInTheDocument()
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
  it('etichetta a 4 px, 12 px, peso 600, margine 0, input alto 44 px', () => {
    render(<Input label="Nome" />)
    const input = screen.getByLabelText('Nome')
    expect(input.getAttribute('style')).toContain('height: 44px')
    const label = input.closest('label') as HTMLElement
    expect(label.getAttribute('style')).toContain('gap: 4px')
    expect(label.getAttribute('style')).toContain('margin: 0')
    const text = screen.getByText('Nome')
    expect(text.getAttribute('style')).toContain('font-size: 12px')
    expect(text.getAttribute('style')).toContain('font-weight: 600')
    expect(text.getAttribute('style')).toContain('margin: 0')
  })

  it('size lg è alto 44 px', () => {
    render(<Input label="Email" size="lg" />)
    expect(screen.getByLabelText('Email').getAttribute('style')).toContain('height: 44px')
  })
})
