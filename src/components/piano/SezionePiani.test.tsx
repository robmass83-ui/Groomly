import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SezionePiani } from './SezionePiani'

function disegna(props: Partial<Parameters<typeof SezionePiani>[0]> = {}) {
  const onProva = vi.fn()
  render(
    <MemoryRouter>
      <SezionePiani
        mostraPiani={false}
        collaboratore={false}
        livello="base"
        provaUsata={false}
        onProva={onProva}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onProva }
}

describe('sezione piani', () => {
  it('con il flag spento mostra solo privacy e elimina account', () => {
    disegna()
    expect(screen.getByRole('link', { name: 'Privacy e termini' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Elimina account' })).toBeInTheDocument()
    expect(screen.queryByText('Il tuo piano')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Messaggi ai clienti' })).not.toBeInTheDocument()
  })

  it('in base offre la prova e il collaboratore non vede la card', async () => {
    const user = userEvent.setup()
    const { onProva } = disegna({ mostraPiani: true })
    expect(screen.getByRole('button', { name: 'Prova Pro gratis per 30 giorni' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Prova Pro gratis per 30 giorni' }))
    expect(onProva).toHaveBeenCalledOnce()
    cleanup()
    render(
      <MemoryRouter>
        <SezionePiani mostraPiani collaboratore livello="base" provaUsata={false} onProva={() => undefined} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: 'Prova Pro gratis per 30 giorni' })).not.toBeInTheDocument()
  })

  it('l’omaggio salone non mostra la prova né gli abbonamenti', () => {
    disegna({ mostraPiani: true, livello: 'salone' })
    expect(screen.queryByRole('button', { name: 'Prova Pro gratis per 30 giorni' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abbonamenti in arrivo' })).not.toBeInTheDocument()
    expect(screen.queryByText('Prova le funzioni Pro')).not.toBeInTheDocument()
  })
})
