// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/providers'
import type { PianoValore } from '../../hooks/usePiano'
import { CopieCloudRiga } from './CopieCloudRiga'
import { statoPiano } from '../../lib/piano'

const ora = new Date('2026-10-25T12:00:00.000Z')
const base = statoPiano(undefined, ora)
const pro = statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, ora)

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/usePiano')>('../../hooks/usePiano')
  return { ...actual, usePiano: () => pianoForzato.valore ?? actual.usePiano() }
})

function pianoCon(stato: typeof base, apriPaywall = vi.fn()): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: false,
    tour: { acceso: false, dal: null },
    stato,
    provaUsata: true,
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
  }
}

describe('riga copie cloud', () => {
  it('in base la riga resta nascosta', () => {
    pianoForzato.valore = pianoCon(base)
    const { container } = render(<Providers><CopieCloudRiga stato={base} bucket={null} /></Providers>)
    expect(container).toBeEmptyDOMElement()
  })

  it('in Pro senza bucket dice che le copie non sono disponibili', () => {
    pianoForzato.valore = pianoCon(pro)
    render(<Providers><CopieCloudRiga stato={pro} bucket={null} /></Providers>)
    expect(screen.getByText('Copie non disponibili')).toBeInTheDocument()
  })
})
