// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { createAccount } from '../data/local/auth'

const { provaInvioAutomatico } = vi.hoisted(() => ({
  provaInvioAutomatico: vi.fn(async (): Promise<'inviato' | 'saltato'> => 'saltato'),
}))

vi.mock('../lib/driveInvio', () => ({
  provaInvioAutomatico,
  programmaInvio: vi.fn(async () => undefined),
  messaggioInvio: (error: Error) => error.message,
}))

describe('invio automatico su Drive', () => {
  beforeEach(() => {
    localStorage.clear()
    provaInvioAutomatico.mockReset()
    provaInvioAutomatico.mockResolvedValue('saltato')
  })

  it('all apertura in home prova l invio e non mostra un toast se è saltato', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} />)
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(provaInvioAutomatico).toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('se l invio parte mostra il toast', async () => {
    provaInvioAutomatico.mockResolvedValue('inviato')
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} />)
    expect(await screen.findByRole('status')).toHaveTextContent('Backup inviato su Google Drive')
  })
})
