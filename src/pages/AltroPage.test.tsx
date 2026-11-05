// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Package } from 'lucide-react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { vociVisibili, type VoceAltro } from '../lib/vociAltro'

const voce: VoceAltro = { to: '/altro/prova', titolo: 'navAltro', dettaglio: 'altroProponiDettaglio', icona: Package }

describe('pagina Altro', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('si apre dalla barra e risulta la scheda attiva', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await user.click(await screen.findByRole('link', { name: 'Altro' }))
    expect(await screen.findByRole('heading', { name: 'Altro' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Altro' })).toHaveAttribute('aria-current', 'page')
  })

  it('la riga in fondo apre i Suggerimenti e la freccia torna ad Altro', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro" />)
    await user.click(await screen.findByRole('link', { name: /Manca qualcosa\? Proponilo/ }))
    expect(await screen.findByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/altro')
  })

  it('una voce riservata resta fuori per il ruolo escluso', () => {
    const riservata: VoceAltro = { ...voce, visibile: (ruolo) => ruolo !== 'collaboratore' }
    expect(vociVisibili([voce, riservata], 'collaboratore')).toEqual([voce])
    expect(vociVisibili([voce, riservata], 'titolare')).toEqual([voce, riservata])
    expect(vociVisibili([voce, riservata], undefined)).toEqual([voce, riservata])
  })
})
