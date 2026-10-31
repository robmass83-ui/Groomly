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
import { LinkWhatsApp, MessaggiPronti } from './PulsanteMessaggi'

const valori = { nome: 'Giulia', cane: 'Rex', servizio: 'Bagno' }

function monta(telefono = '333 1234567', aspetto: 'icona' | 'pillola' = 'icona') {
  return render(
    <Providers>
      <LinkWhatsApp telefono={telefono} aspetto={aspetto} />
      <MessaggiPronti telefono={telefono} valori={valori} aspetto={aspetto} />
    </Providers>,
  )
}

describe('LinkWhatsApp e MessaggiPronti', () => {
  beforeEach(() => {
    plus.accesso = false
    plus.visibile = true
    apri.mockClear()
  })

  it('WhatsApp e sempre la chat senza testo, anche in Plus', async () => {
    plus.accesso = true
    monta()
    const link = screen.getByRole('link', { name: 'WhatsApp' })
    expect(link).toHaveAttribute('href', hrefChat('333 1234567'))
    expect(link.getAttribute('href')).not.toContain('text=')
    await userEvent.click(link)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('in Go Messaggi pronti porta il segno Plus e apre la finestra Plus', async () => {
    monta()
    const tasto = screen.getByRole('button', { name: 'Messaggi pronti, Plus' })
    expect(screen.getByTestId('segno-plus-tondo')).toBeInTheDocument()
    await userEvent.click(tasto)
    expect(apri).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('in Go senza segno badge Messaggi pronti non compare', () => {
    plus.visibile = false
    monta()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument()
  })

  it('senza telefono non mostra niente', () => {
    monta('')
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('in Plus Messaggi pronti apre la finestra con le categorie, senza segno Plus', async () => {
    plus.accesso = true
    monta()
    expect(screen.queryByTestId('segno-plus-tondo')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Messaggi pronti' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Richiamo' })).toBeInTheDocument()
    expect(apri).not.toHaveBeenCalled()
  })

  it('la pillola mostra Messaggi e WhatsApp col testo', () => {
    monta('333 1234567', 'pillola')
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveTextContent('WhatsApp')
    expect(screen.getByRole('button', { name: 'Messaggi pronti, Plus' })).toHaveTextContent('Messaggi')
  })
})
