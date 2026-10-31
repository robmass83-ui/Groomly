// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { plus, apri } = vi.hoisted(() => ({
  plus: { accesso: false, visibile: true },
  apri: vi.fn(),
}))

vi.mock('../../hooks/usePlus', () => ({
  usePlus: () => ({ ...plus, apri }),
}))

import { Providers } from '../../app/providers'
import { hrefChat } from '../../lib/messaggiManuali'
import { PulsanteMessaggi } from './PulsanteMessaggi'

const valori = { nome: 'Giulia', cane: 'Rex', servizio: 'Bagno' }

function monta(telefono = '333 1234567') {
  return render(<Providers><PulsanteMessaggi telefono={telefono} valori={valori} aspetto="whatsapp" /></Providers>)
}

describe('PulsanteMessaggi', () => {
  beforeEach(() => {
    plus.accesso = false
    plus.visibile = true
    apri.mockClear()
  })

  it('in Go il tasto WhatsApp e un link alla chat senza testo e non apre finestre', async () => {
    monta()
    const link = screen.getByRole('link', { name: 'WhatsApp' })
    expect(link).toHaveAttribute('href', hrefChat('333 1234567'))
    expect(link.getAttribute('href')).not.toContain('text=')
    await userEvent.click(link)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(apri).not.toHaveBeenCalled()
  })

  it('in Go sotto al tasto c e Messaggi pronti col segno Plus che apre la finestra Plus', async () => {
    monta()
    const tasto = screen.getByRole('button', { name: /Messaggi pronti/ })
    expect(tasto).toHaveTextContent('Plus')
    await userEvent.click(tasto)
    expect(apri).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('in Go senza telefono non mostra niente', () => {
    monta('')
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('in Plus il tocco apre la finestra con le categorie e non c e Messaggi pronti', async () => {
    plus.accesso = true
    monta()
    expect(screen.queryByText(/Messaggi pronti/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'WhatsApp' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Richiamo' })).toBeInTheDocument()
  })
})
