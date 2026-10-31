import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FeatureKey } from '../../lib/piano'
import { PaywallSheet } from './PaywallSheet'

function apri(opzioni: { feature?: FeatureKey | null; mostraProva?: boolean; abbonamentiAttivi?: boolean; esitoProva?: 'spento' | 'attesa' | 'ok' | 'errore'; onClose?: () => void; onAvvisami?: () => void; onAbbonati?: (percorso: string) => void } = {}) {
  render(
    <PaywallSheet
      open
      feature={opzioni.feature === undefined ? 'export' : opzioni.feature}
      mostraProva={opzioni.mostraProva ?? false}
      abbonamentiAttivi={opzioni.abbonamentiAttivi ?? false}
      esitoProva={opzioni.esitoProva}
      onClose={opzioni.onClose ?? (() => undefined)}
      onAvvisami={opzioni.onAvvisami ?? (() => undefined)}
      onProva={() => undefined}
      onAbbonati={opzioni.onAbbonati ?? (() => undefined)}
    />,
  )
}

describe('finestra Plus specifica', () => {
  it('parla della funzione toccata', () => {
    apri({ feature: 'export' })
    const dialogo = screen.getByRole('dialog', { name: 'Esporta il report degli incassi' })
    expect(dialogo.parentElement?.getAttribute('style') ?? '').toContain('position: fixed')
    expect(screen.getByText('Scarica il report con tutti i dati in PDF o Excel.')).toBeInTheDocument()
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })

  it('offre la prova solo quando può', () => {
    apri({ mostraProva: true })
    expect(screen.getByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).toBeInTheDocument()
  })

  it('senza prova non mostra il tasto', () => {
    apri({ mostraProva: false })
    expect(screen.queryByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).not.toBeInTheDocument()
  })

  it('con gli abbonamenti attivi c’è Abbonati e non Avvisami', () => {
    apri({ abbonamentiAttivi: true })
    expect(screen.getByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Avvisami' })).not.toBeInTheDocument()
  })

  it('senza prova e senza abbonamenti resta almeno Avvisami', async () => {
    const user = userEvent.setup()
    const onAvvisami = vi.fn()
    apri({ mostraProva: false, abbonamentiAttivi: false, onAvvisami })
    expect(screen.queryByRole('button', { name: 'Abbonati' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Avvisami' }))
    expect(onAvvisami).toHaveBeenCalledOnce()
  })

  it('Abbonati porta alla pagina Plus', async () => {
    const user = userEvent.setup()
    const onAbbonati = vi.fn()
    apri({ feature: 'export', abbonamentiAttivi: true, onAbbonati })
    await user.click(screen.getByRole('button', { name: 'Abbonati' }))
    expect(onAbbonati).toHaveBeenCalledWith('/impostazioni/abbonamento/plus')
  })

  it('per il team Abbonati porta alla pagina Salone', async () => {
    const user = userEvent.setup()
    const onAbbonati = vi.fn()
    apri({ feature: 'team', abbonamentiAttivi: true, onAbbonati })
    await user.click(screen.getByRole('button', { name: 'Abbonati' }))
    expect(onAbbonati).toHaveBeenCalledWith('/impostazioni/abbonamento/salone')
  })

  it('mostra l’icona della funzione', () => {
    apri({ feature: 'export' })
    expect(screen.getByTestId('icona-paywall')).toBeInTheDocument()
  })

  it('per le funzioni Salone non offre la prova Plus e lascia Avvisami', () => {
    apri({ feature: 'team', mostraProva: true, abbonamentiAttivi: false })
    expect(screen.getByRole('dialog', { name: 'Il tuo team nel salone' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avvisami' })).toBeInTheDocument()
  })

  it('con la prova attiva c’è un tasto che chiude', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    apri({ esitoProva: 'ok', onClose })
    expect(screen.getByText('La prova Plus è attiva per 30 giorni. Puoi usare le funzioni Plus.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ho capito' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
