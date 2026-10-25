// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { AnimalsReturn } from './AnimalsReturn'

describe('AnimalsReturn', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function pagina(lingua?: 'en' | 'es') {
    if (lingua) localStorage.setItem('groomly.lingua', lingua)
    const router = createMemoryRouter(
      [
        { path: '/', element: <p>Home</p> },
        { path: '/animali/:id', element: <LinguaProvider><AnimalsReturn /></LinguaProvider> },
        { path: '/animali', element: <p>Lista</p> },
      ],
      { initialEntries: ['/', '/animali/luna'], initialIndex: 1 },
    )
    render(<RouterProvider router={router} />)
    return router
  }

  it('in inglese e spagnolo non dice Torna agli animali', () => {
    pagina('en')
    expect(screen.getByRole('link', { name: 'Back to dogs' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Torna agli animali' })).not.toBeInTheDocument()
    cleanup()
    pagina('es')
    expect(screen.getByRole('link', { name: 'Volver a los animales' })).toBeInTheDocument()
  })

  it('sostituisce la scheda con la lista ed è il pulsante in basso a destra', async () => {
    const user = userEvent.setup()
    const router = pagina()
    const link = screen.getByRole('link', { name: 'Torna agli animali' })
    expect(link).toHaveAttribute('href', '/animali')
    expect(link).toHaveClass('animals-return')
    expect(link).toHaveTextContent('Animali')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    await user.click(link)
    expect(await screen.findByText('Lista')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/animali')
    expect(router.state.historyAction).toBe('REPLACE')
    await router.navigate(-1)
    expect(router.state.location.pathname).toBe('/')

    const css = readFileSync(createRequire(import.meta.url).resolve('./animalsReturn.css'), 'utf8')
    expect(css).toContain('min-height: 48px')
    expect(css).toContain('min-width: 48px')
    expect(css).toContain('padding: 0 16px')
    expect(css).toContain('gap: 8px')
    expect(css).toContain('font-size: 15px')
    expect(css).toContain('font-weight: 700')
    expect(css).toContain('color: var(--tx)')
    expect(css).toContain('background: var(--card)')
    expect(css).toContain('border: 1px solid var(--line)')
    expect(css).toContain('border-radius: 16px')
    expect(css).toContain('box-shadow: var(--sh-2)')
    expect(css).toContain('z-index: 20')
    expect(css).toContain('bottom: calc(12px + env(safe-area-inset-bottom, 0px))')
    expect(css).toContain('right: max(12px, calc((100% - 640px) / 2 + 12px))')
    expect(css).toContain('.animals-return:active')
    expect(css).toContain('background: var(--surf)')
    expect(css).toContain('transition: background 120ms')
    expect(css).toContain('.animals-return:focus-visible')
    expect(css).toContain('outline: 2px solid var(--pri)')
    expect(css).toContain('outline-offset: 2px')
  })
})
