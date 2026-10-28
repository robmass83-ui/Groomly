// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { apriEsterno } from '../lib/openDocument'

vi.mock('../lib/openDocument', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/openDocument')>()
  return { ...actual, apriEsterno: vi.fn(async () => undefined) }
})

describe('legale', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'it')
    vi.mocked(apriEsterno).mockClear()
  })

  it('la privacy si apre fuori dall’app e la pagina resta Legale', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/legale" />)
    expect(await screen.findByRole('heading', { name: 'Legale' })).toBeInTheDocument()
    expect(document.querySelector('a[href^="https://groomlyapp.it/privacy"]')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Privacy policy' }))
    expect(apriEsterno).toHaveBeenCalledWith('https://groomlyapp.it/privacy/?lang=it')
    expect(screen.getByRole('heading', { name: 'Legale' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Licenze open source' })).toHaveAttribute('href', '/impostazioni/licenze')
  })
})
