// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { statoPiano } from '../lib/piano'
import type { PianoValore } from './usePiano'
import { usePlus } from './usePlus'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('./usePiano', () => ({ usePiano: () => pianoForzato.valore }))

function pianoCon(piano: 'base' | 'pro', apriPaywall = vi.fn()): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: false,
    tour: { acceso: false, dal: null },
    stato: statoPiano(piano === 'base' ? undefined : { piano, stato: 'attivo', fonte: 'manuale' }, new Date(2026, 9, 27)),
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

describe('usePlus', () => {
  it('in base una funzione nascosta non è visibile', () => {
    pianoForzato.valore = pianoCon('base')
    const { result } = renderHook(() => usePlus('copieCloud'))
    expect(result.current).toMatchObject({ accesso: false, visibile: false })
  })

  it('in base una funzione con segno è visibile ma senza accesso, e apri apre la paywall', () => {
    const apriPaywall = vi.fn()
    pianoForzato.valore = pianoCon('base', apriPaywall)
    const { result } = renderHook(() => usePlus('export'))
    expect(result.current).toMatchObject({ accesso: false, visibile: true })
    result.current.apri()
    expect(apriPaywall).toHaveBeenCalledWith('export')
  })

  it('con il piano Plus c’è l’accesso, anche alle funzioni nascoste', () => {
    pianoForzato.valore = pianoCon('pro')
    expect(renderHook(() => usePlus('export')).result.current).toMatchObject({ accesso: true, visibile: true })
    expect(renderHook(() => usePlus('copieCloud')).result.current).toMatchObject({ accesso: true, visibile: true })
  })
})
