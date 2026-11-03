// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PianoValore } from '../../hooks/usePiano'
import { statoPiano } from '../../lib/piano'
import { SchedaAbbonamento } from './SchedaAbbonamento'

const pianoForzato = vi.hoisted(() => ({ valore: null as unknown as PianoValore }))
vi.mock('../../hooks/usePiano', () => ({ usePiano: () => pianoForzato.valore }))

const OGGI = new Date(2026, 10, 2)

function conStato(piano: 'pro' | 'salone', stato: 'attivo' | 'grazia' | 'disdetto', scadeIl: Date | null) {
  pianoForzato.valore = {
    mostraPiani: false, abbonamentiAttivi: false, tour: { acceso: false, dal: null },
    stato: statoPiano({ piano, stato, fonte: 'play', scadeIl: scadeIl ? scadeIl.toISOString() : null }, OGGI),
    provaUsata: true, provaConcessa: false, paywall: null, esitoProva: 'spento', messaggioProva: '',
    apriPaywall: () => undefined, chiudiPaywall: () => undefined, prova: async () => undefined, avvisa: async () => undefined,
    livelloNome: piano, pronto: true,
  } as PianoValore
}

function scheda(titolare = true) {
  render(<MemoryRouter><SchedaAbbonamento stile={{}} stileBollino={{}} titolare={titolare} /></MemoryRouter>)
  return screen.getByRole('link')
}

describe('SchedaAbbonamento con avviso', () => {
  afterEach(cleanup)

  it('in grazia il titolare legge «Pagamento non riuscito» e «Aggiorna su Google Play» su due righe', () => {
    conStato('salone', 'grazia', new Date(2026, 11, 20))
    const link = scheda()
    expect(link.querySelector('[data-riga="1"]')).toHaveTextContent(/^Pagamento non riuscito$/)
    expect(link.querySelector('[data-riga="2"]')).toHaveTextContent(/^Aggiorna su Google Play$/)
    expect(link).toHaveAttribute('aria-label', 'Abbonamento, Il tuo piano, Pagamento non riuscito · Aggiorna il pagamento su Google Play')
    expect(link).toHaveAttribute('href', '/impostazioni/abbonamento')
    // Le righe vanno a capo, non si tagliano con i puntini.
    expect((link.querySelector('[data-riga="1"]') as HTMLElement).style.whiteSpace).toBe('normal')
    expect((link.querySelector('[data-riga="2"]') as HTMLElement).style.whiteSpace).toBe('normal')
  })

  it('disdetto: il titolare legge «Disdetto» e «Attivo fino al» con la data breve', () => {
    const fine = new Date(2099, 11, 20)
    conStato('pro', 'disdetto', fine)
    const link = scheda()
    expect(link.querySelector('[data-riga="1"]')).toHaveTextContent(/^Disdetto$/)
    const breve = fine.toLocaleDateString('it', { day: '2-digit', month: '2-digit', year: '2-digit' })
    expect(link.querySelector('[data-riga="2"]')).toHaveTextContent(`Attivo fino al ${breve}`)
    expect(link).toHaveAttribute('aria-label', `Abbonamento, Il tuo piano, Disdetto · attivo fino al ${fine.toLocaleDateString('it')}`)
  })

  it('senza avviso la scheda resta «Il tuo piano»', () => {
    conStato('salone', 'attivo', null)
    const link = scheda()
    expect(link).toHaveTextContent('Il tuo piano')
    expect(link.querySelector('[data-riga]')).toBeNull()
  })

  it('chi non è titolare non vede l’avviso', () => {
    conStato('salone', 'grazia', new Date(2026, 11, 20))
    const link = scheda(false)
    expect(link).toHaveTextContent('Il tuo piano')
    expect(link).not.toHaveTextContent('Pagamento non riuscito')
  })
})

describe('SchedaAbbonamento senza puntini', () => {
  afterEach(cleanup)

  it('«Il tuo piano» e «Groomly Salone» vanno a capo, non si tagliano', () => {
    conStato('salone', 'attivo', null)
    const link = scheda()
    const testi = [...link.querySelectorAll('span')].filter((el) => /Il tuo piano|Groomly Salone/.test(el.textContent ?? '') && el.children.length === 0)
    expect(testi).toHaveLength(2)
    for (const el of testi) {
      expect(el.style.textOverflow).not.toBe('ellipsis')
      expect(el.style.whiteSpace).toBe('normal')
    }
  })

  it('su Go «Groomly Go» e «Passa a Plus» vanno a capo', () => {
    pianoForzato.valore = {
      mostraPiani: false, abbonamentiAttivi: false, tour: { acceso: false, dal: null },
      stato: statoPiano({ piano: 'base', stato: 'attivo', fonte: 'manuale', scadeIl: null }, OGGI),
      provaUsata: true, provaConcessa: false, paywall: null, esitoProva: 'spento', messaggioProva: '',
      apriPaywall: () => undefined, chiudiPaywall: () => undefined, prova: async () => undefined, avvisa: async () => undefined,
      livelloNome: 'base', pronto: true,
    } as PianoValore
    const link = scheda()
    const testi = [...link.querySelectorAll('span')].filter((el) => /Passa a Plus|Go/.test(el.textContent ?? '') && el.style.fontWeight !== '')
    expect(testi.length).toBeGreaterThan(0)
    for (const el of testi) {
      expect(el.style.textOverflow).not.toBe('ellipsis')
      expect(el.style.whiteSpace).toBe('normal')
    }
  })
})
