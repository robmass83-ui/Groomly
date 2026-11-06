// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { listProdotti, saveProdottoLocal } from '../data/local/prodotti'
import { storageKeys, writeJson } from '../data/local/storage'
import { DETTAGLI_VUOTI, type Prodotto } from '../lib/prodotti'

const piano = vi.hoisted(() => ({ livello: 'base' as 'base' | 'pro' | 'salone', paywall: vi.fn() }))

vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  const { statoPiano } = await import('../lib/piano')
  return {
    ...actual,
    usePiano: () => {
      const valore = actual.usePiano()
      const stato = piano.livello === 'base' ? statoPiano(undefined, new Date()) : statoPiano({ piano: piano.livello, stato: 'attivo', fonte: 'manuale' }, new Date())
      return { ...valore, stato, apriPaywall: piano.paywall }
    },
  }
})

const GIORNO = 24 * 60 * 60 * 1000
const data = new Date('2026-01-05T10:00:00.000Z')

function prodotto(over: Partial<Prodotto> = {}): Prodotto {
  return { id: 'p1', nome: 'Shampoo neutro', categoria: 'lavaggio', pezzi: 3, quantita: 5, unita: 'l', ditta: 'Ditta Alfa', telefono: '', email: '', codice: '', soglia: 1, inArrivo: 0, ordinatoIl: null, movimenti: [], ...DETTAGLI_VUOTI, mlPerCane: { piccola: 15, media: 30, grande: 50 }, createdAt: data, updatedAt: data, ...over }
}

async function entra() {
  return createAccount('maria@salone.it', 'segretissimo')
}

/** `quanti` bagni di cani di taglia grande negli ultimi giorni. */
function lavaggi(uid: string, quanti: number) {
  const adesso = Date.now()
  writeJson(storageKeys.dogs(uid), { d1: { id: 'd1', name: 'Rex', size: 'grande', species: 'cane', breed: 'Labrador', ageCategory: 'adulto', temperament: 'bravo', clientType: 'abituale', contact: { name: 'Ada', phone: '333' }, contacts: [], createdAt: data.toISOString(), updatedAt: data.toISOString() } })
  writeJson(storageKeys.appointments(uid), Object.fromEntries(Array.from({ length: quanti }, (_, indice) => {
    const start = new Date(adesso - ((indice % 20) + 1) * GIORNO).toISOString()
    return [`a${indice}`, { id: `a${indice}`, dogId: 'd1', start, status: 'completato', total: 50, services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 50 }], createdAt: start, updatedAt: start }]
  })))
}

describe('stime del magazzino', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    piano.livello = 'base'
    piano.paywall.mockClear()
  })

  it('in Go niente stime: anteprima bloccata che apre il paywall', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    lavaggi(account.uid, 30)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    expect(await screen.findByRole('button', { name: /Quanto mi dura\?/ })).toBeInTheDocument()
    expect(screen.queryByText(/Ti dura circa/)).toBeNull()
    await user.click(screen.getByRole('button', { name: /Quanto mi dura\?/ }))
    expect(piano.paywall).toHaveBeenCalledWith('stimeMagazzino')
  })

  it('in Go un prodotto sopra il minimo non entra in Da ordinare per la stima', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ quantita: 100, unita: 'ml' }))
    lavaggi(account.uid, 30)
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    expect(await screen.findByRole('link', { name: /Shampoo neutro/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /da ordinare/i })).toBeNull()
  })

  it.each(['pro', 'salone'] as const)('con %s la scheda mostra durata, consumo e costo a cane', async (livello) => {
    piano.livello = livello
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ costo: 50 }))
    lavaggi(account.uid, 30)
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    const card = await screen.findByLabelText('Quanto mi dura?')
    // 30 bagni grandi da 50 ml: 1,5 L al mese, 15 L a magazzino.
    expect(within(card).getByText('Ti dura circa 10 mesi')).toBeInTheDocument()
    expect(within(card).getByText('Consumo stimato: 1,5 L al mese')).toBeInTheDocument()
    expect(within(card).getByText(/circa .*0,30 a cane/)).toBeInTheDocument()
    expect(within(card).getByText('È una stima, puoi correggerla.')).toBeInTheDocument()
  })

  it('con Plus la stima porta in Da ordinare un prodotto sopra il minimo', async () => {
    piano.livello = 'pro'
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ quantita: 100, unita: 'ml' }))
    lavaggi(account.uid, 30)
    render(<App memory isDev={false} initialPath="/altro/magazzino/ordini" />)
    expect(await screen.findByText(/Sta per finire \(stima\)/)).toBeInTheDocument()
  })

  it('dopo due taniche propone di aggiornare il consumo', async () => {
    piano.livello = 'pro'
    const account = await entra()
    const adesso = Date.now()
    saveProdottoLocal(account.uid, prodotto({ pezzi: 5, movimenti: [{ at: adesso - 5 * GIORNO, delta: -1, dopo: 5 }, { at: adesso - 25 * GIORNO, delta: -1, dopo: 6 }] }))
    lavaggi(account.uid, 30)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: /Togli uno|Togli/ }))
    const domanda = await screen.findByRole('dialog', { name: 'Aggiorno il consumo?' })
    expect(within(domanda).getByText('Questa tanica è durata 5 giorni, la stima diceva 100.')).toBeInTheDocument()
    await user.click(within(domanda).getByRole('button', { name: 'Sì, aggiorna' }))
    const salvato = listProdotti(account.uid)[0]
    expect(salvato.mlPerCane).toEqual({ piccola: 300, media: 600, grande: 1000 })
    expect(salvato.pezzi).toBe(4)
    expect(salvato.confrontoIl).not.toBeNull()
  })

  it('il riepilogo si vede con Plus, in Go è bloccato, senza costi non c’è', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const primo = render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await screen.findByRole('link', { name: /Shampoo neutro/ })
    expect(screen.queryByRole('button', { name: /Riepilogo del magazzino/ })).toBeNull()
    primo.unmount()
    saveProdottoLocal(account.uid, prodotto({ costo: 20 }))
    const secondo = render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    expect(await screen.findByRole('button', { name: /Riepilogo del magazzino/ })).toBeInTheDocument()
    secondo.unmount()
    piano.livello = 'pro'
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    const card = await screen.findByLabelText('Riepilogo del magazzino')
    expect(within(card).getByText('Valore del magazzino')).toBeInTheDocument()
    expect(within(card).getByText(/60/)).toBeInTheDocument()
  })
})

describe('filtri e scadenze nella pagina', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    piano.livello = 'base'
  })

  it('Vendita mostra solo i prodotti venduti, le categorie solo quelli del salone', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    saveProdottoLocal(account.uid, prodotto({ id: 'p2', nome: 'Shampoo da banco', uso: 'vendita' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    expect(await screen.findByRole('link', { name: /Shampoo da banco/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lavaggio' }))
    expect(screen.queryByRole('link', { name: /Shampoo da banco/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Shampoo neutro/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Vendita' }))
    expect(screen.getByRole('link', { name: /Shampoo da banco/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Shampoo neutro/ })).toBeNull()
  })

  it('il chip Altro c’è solo se serve e un prodotto sconosciuto si vede', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const primo = render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await screen.findByRole('link', { name: /Shampoo neutro/ })
    expect(screen.queryByRole('button', { name: 'Altro' })).toBeNull()
    primo.unmount()
    writeJson(storageKeys.prodotti(account.uid), { x: { nome: 'Cosa ignota', categoria: 'cibo', quantita: null, unita: 'l', ditta: '', codice: '', createdAt: data.toISOString(), updatedAt: data.toISOString() } })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: 'Altro' }))
    expect(screen.getByRole('link', { name: /Cosa ignota/ })).toBeInTheDocument()
  })

  it('un filtro Altro rimasto vuoto torna a Tutti', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ categoria: 'varie', nome: 'Cosa ignota' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: 'Altro' }))
    await user.click(screen.getByRole('link', { name: /Cosa ignota/ }))
    await user.click(await screen.findByRole('button', { name: 'Modifica prodotto' }))
    const scheda = await screen.findByRole('dialog')
    await user.click(within(scheda).getByRole('radio', { name: 'Finitura' }))
    await user.click(within(scheda).getByRole('button', { name: 'Salva prodotto' }))
    await user.click(await screen.findByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('link', { name: /Cosa ignota/ })).toBeInTheDocument()
  })

  it('la striscia conta i prodotti da buttare e li filtra', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ apertoIl: Date.now() - 400 * GIORNO, mesiDopoApertura: 12 }))
    saveProdottoLocal(account.uid, prodotto({ id: 'p2', nome: 'Balsamo', apertoIl: Date.now() - GIORNO, mesiDopoApertura: 12 }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: /1 prodotto da buttare/ }))
    expect(screen.getByRole('link', { name: /Shampoo neutro/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Balsamo/ })).toBeNull()
  })

  it('«Ho aperto un pezzo nuovo» segna la data, il – la azzera, Annulla la riporta', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ mesiDopoApertura: 12 }))
    const user = userEvent.setup()
    const pagina = render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    await user.click(await screen.findByRole('button', { name: 'Ho aperto un pezzo nuovo' }))
    expect(await screen.findByText(/Aperto il .* · da usare entro/)).toBeInTheDocument()
    const aperto = listProdotti(account.uid)[0].apertoIl
    expect(aperto).not.toBeNull()
    pagina.unmount()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: /Togli/ }))
    expect(listProdotti(account.uid)[0].apertoIl).toBeNull()
    await user.click(await screen.findByRole('button', { name: 'Annulla' }))
    expect(listProdotti(account.uid)[0].apertoIl).toBe(aperto)
  })

  it('la diluizione si legge sulla scheda con la dose per un litro', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ diluizione: 10 }))
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    expect(await screen.findByText(/Diluizione 1:10 · Per 1 L pronto: 91 ml di prodotto e 909 ml d’acqua/)).toBeInTheDocument()
  })
})
