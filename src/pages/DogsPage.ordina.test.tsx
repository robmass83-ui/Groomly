// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'

describe('lista animali: Ordina', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('la scelta attiva ha la spunta ed è ricordata dopo il rimontaggio', async () => {
    const user = userEvent.setup()
    await createAccount('maria@salone.it', 'segretissimo')
    const primo = render(<App memory isDev={false} initialPath="/animali" />)
    await user.click(await screen.findByRole('button', { name: 'Ordina' }))
    expect(screen.getByRole('button', { name: 'Alfabetico' }).querySelector('svg')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Per prossimo appuntamento' }))
    primo.unmount()
    cleanup()

    render(<App memory isDev={false} initialPath="/animali" />)
    await user.click(await screen.findByRole('button', { name: 'Ordina' }))
    const prossimo = screen.getByRole('button', { name: 'Per prossimo appuntamento' })
    expect(prossimo).toHaveAttribute('aria-pressed', 'true')
    expect(prossimo.querySelector('svg')).not.toBeNull()
    const alfabetico = screen.getByRole('button', { name: 'Alfabetico' })
    expect(alfabetico).toHaveAttribute('aria-pressed', 'false')
    expect(alfabetico.querySelector('svg')).toBeNull()
  })
})
