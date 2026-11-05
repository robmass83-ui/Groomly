// @vitest-environment happy-dom
import { act, render, screen, within } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'
import type { AvvisoSistema } from '../lib/avvisiSistema'

const finto = vi.hoisted(() => ({
  avvisi: [] as AvvisoSistema[],
  lettiFino: 0,
  segnati: [] as number[],
}))

vi.mock('../hooks/useAvvisiSistema', () => ({
  useAvvisiSistema: () => {
    const [lettiFino, setLettiFino] = useState(finto.lettiFino)
    const segnaLetti = useCallback((fino: number) => {
      finto.segnati.push(fino)
      setLettiFino(fino)
    }, [])
    return { avvisi: finto.avvisi, lettiFino, pronti: true, segnaLetti }
  },
}))

const giorno = (d: number) => new Date(2026, 9, d, 9).getTime()

async function apri(path: string) {
  await createAccount('maria@salone.it', 'segretissimo')
  const account = getAccount()
  if (!account) throw new Error('account assente')
  writeJson(storageKeys.auth, { ...account, role: 'titolare' })
  render(<App memory isDev={false} initialPath={path} />)
}

describe('Avvisi di sistema', () => {
  beforeEach(() => {
    localStorage.clear()
    finto.avvisi = []
    finto.lettiFino = 0
    finto.segnati = []
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('senza avvisi dice Nessuna notifica e non segna nulla', async () => {
    await apri('/impostazioni/avvisi')
    expect(await screen.findByText('Nessuna notifica')).toBeInTheDocument()
    expect(finto.segnati).toEqual([])
  })

  it('il riquadro Avvisi mostra quanti sono da leggere e apre gli avvisi di sistema', async () => {
    finto.avvisi = [
      { id: 'a', tipo: 'aggiornamento', titolo: 'Versione nuova', testo: '', creato: giorno(29) },
      { id: 'b', tipo: 'novita', titolo: 'Grazie', testo: '', creato: giorno(20) },
      { id: 'c', tipo: 'manutenzione', titolo: 'Manutenzione', testo: '', creato: giorno(28) },
    ]
    finto.lettiFino = giorno(25)
    await apri('/impostazioni')
    const link = await screen.findByRole('link', { name: 'Avvisi: 2 da leggere' })
    expect(link).toHaveAttribute('href', '/impostazioni/avvisi')
  })

  it('all’apertura gli importanti nuovi stanno in alto e prendono la spunta di lettura', async () => {
    finto.avvisi = [
      { id: 'prezzi', tipo: 'importante', titolo: 'Cambiano i prezzi', testo: 'Dal 1° dicembre.', creato: giorno(29) },
      { id: 'versione', tipo: 'aggiornamento', titolo: 'Versione 1.1.152', testo: '', creato: giorno(28) },
      { id: 'vecchio', tipo: 'importante', titolo: 'Già letto', testo: '', creato: giorno(10) },
    ]
    finto.lettiFino = giorno(20)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await apri('/impostazioni/avvisi')
    const articoli = await screen.findAllByRole('article')
    expect(articoli.map((item) => item.getAttribute('aria-label'))).toEqual(['Cambiano i prezzi', 'Versione 1.1.152', 'Già letto'])
    expect(screen.getByText('Altri avvisi')).toBeInTheDocument()
    expect(within(articoli[0]).queryByText('Letto')).not.toBeInTheDocument()
    expect(within(articoli[2]).getByText('Letto')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Scrivi un avviso' })).not.toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(finto.segnati).toEqual([giorno(29)])
    const dopo = screen.getAllByRole('article')
    expect(dopo[0]).toHaveAttribute('aria-label', 'Cambiano i prezzi')
    expect(within(dopo[0]).getByText('Letto')).toBeInTheDocument()
    expect(within(dopo[1]).getByText('Letto')).toBeInTheDocument()
  })
})
