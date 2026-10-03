import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'

describe('dev kit', () => {
  beforeEach(async () => {
    localStorage.clear()
    await createAccount('maria@salone.it', 'segretissimo')
  })

  it('mostra i componenti quando isDev è true', async () => {
    render(<App memory isDev initialPath="/dev/kit" />)
    expect(await screen.findByRole('heading', { name: 'Kit' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bravo' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Agitato' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mordace' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bagno' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto mancante' })).toBeInTheDocument()
  })
})
