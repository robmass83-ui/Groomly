// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { listProdotti, saveProdottoLocal } from '../data/local/prodotti'
import { storageKeys, writeJson } from '../data/local/storage'
import { DETTAGLI_VUOTI, type Prodotto } from '../lib/prodotti'

const data = new Date('2026-11-05T10:00:00.000Z')

function prodotto(over: Partial<Prodotto> = {}): Prodotto {
  return { id: 'p1', nome: 'Shampoo manto bianco', categoria: 'lavaggio', pezzi: 10, quantita: 5, unita: 'l', ditta: 'Ditta Alfa', telefono: '', email: '', codice: 'SH-120', soglia: 3, inArrivo: 0, ordinatoIl: null, movimenti: [], ...DETTAGLI_VUOTI, createdAt: data, updatedAt: data, ...over }
}

async function entra(role?: string) {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  if (role) writeJson(storageKeys.auth, { ...account, role, salonId: account.uid })
  return account
}

describe('magazzino', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('si apre da Altro con la scheda Altro attiva', async () => {
    await entra()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro" />)
    await user.click(await screen.findByRole('link', { name: /Magazzino/ }))
    expect(await screen.findByRole('heading', { name: 'Magazzino' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Altro' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/altro')
  })

  it('al primo avvio il kit base crea i prodotti scelti con le loro quantità', async () => {
    const account = await entra()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('checkbox', { name: 'Lozione occhi / macchie lacrimali' }))
    await user.click(screen.getByRole('button', { name: 'Continua con 13' }))
    const riga = screen.getByRole('group', { name: 'Shampoo neutro / universale' })
    await user.click(within(riga).getByRole('button', { name: 'Più' }))
    await user.click(screen.getByRole('button', { name: 'Aggiungi al magazzino' }))
    expect(await screen.findByText('13 prodotti')).toBeInTheDocument()
    expect(listProdotti(account.uid).find((item) => item.nome === 'Shampoo neutro / universale')).toMatchObject({ pezzi: 2, quantita: 5, unita: 'l', soglia: 2 })
    expect(listProdotti(account.uid).some((item) => item.nome.startsWith('Lozione occhi'))).toBe(false)
  })

  it('aggiunge un prodotto dalla lista con pezzi, formato, fornitore e codice', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: 'Aggiungi' }))
    const lista = await screen.findByRole('dialog', { name: 'Aggiungi prodotto' })
    await user.click(within(lista).getByRole('button', { name: 'Lavaggio' }))
    await user.click(within(lista).getByRole('button', { name: 'Balsamo districante' }))
    const scheda = await screen.findByRole('dialog', { name: 'Balsamo districante' })
    const pezzi = within(scheda).getByRole('group', { name: 'Quanti pezzi' })
    await user.click(within(pezzi).getByRole('button', { name: 'Più' }))
    await user.click(within(pezzi).getByRole('button', { name: 'Più' }))
    await user.click(within(scheda).getByRole('radio', { name: '7 L' }))
    await user.type(within(scheda).getByLabelText('Codice prodotto'), 'BL-205')
    await user.click(within(scheda).getByRole('button', { name: 'Aggiungi 3 pezzi' }))
    const salvato = listProdotti(account.uid).find((item) => item.nome === 'Balsamo districante')
    expect(salvato).toMatchObject({ categoria: 'lavaggio', pezzi: 3, quantita: 7, unita: 'l', ditta: 'Ditta Alfa', codice: 'BL-205' })
    expect(salvato?.movimenti[0]).toMatchObject({ delta: 3, dopo: 3 })
  })

  it('un prodotto scritto a mano può non avere formato', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: 'Aggiungi' }))
    await user.click(await screen.findByRole('button', { name: /Scrivilo tu/ }))
    const scheda = await screen.findByRole('dialog', { name: 'Nuovo prodotto' })
    await user.click(within(scheda).getByRole('button', { name: 'Aggiungi 1 pezzo' }))
    expect(await within(scheda).findByText('Scrivi il nome del prodotto')).toBeInTheDocument()
    await user.type(within(scheda).getByLabelText(/^Prodotto/), 'Pettini')
    await user.type(within(scheda).getByLabelText('Altra misura'), 'tanta')
    await user.click(within(scheda).getByRole('button', { name: 'Aggiungi 1 pezzo' }))
    expect(await within(scheda).findByText('Scrivi un numero maggiore di zero')).toBeInTheDocument()
    await user.clear(within(scheda).getByLabelText(/^Altra misura/))
    await user.click(within(scheda).getByRole('button', { name: 'Aggiungi 1 pezzo' }))
    expect(listProdotti(account.uid).find((item) => item.nome === 'Pettini')).toMatchObject({ quantita: null, pezzi: 1 })
  })

  it('un prodotto già a magazzino non si duplica: si caricano i pezzi', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ nome: 'Shampoo neutro', pezzi: 1 }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: 'Aggiungi' }))
    const lista = await screen.findByRole('dialog', { name: 'Aggiungi prodotto' })
    await user.type(within(lista).getByRole('textbox'), 'neutro')
    await user.click(within(lista).getByRole('button', { name: 'Shampoo neutro / universale' }))
    const movimento = await screen.findByRole('dialog', { name: 'Shampoo neutro' })
    await user.click(within(movimento).getByRole('button', { name: '5' }))
    await user.click(within(movimento).getByRole('button', { name: 'Carica 5' }))
    expect(listProdotti(account.uid)).toHaveLength(1)
    expect(listProdotti(account.uid)[0].pezzi).toBe(6)
  })

  it('il − scala un pezzo e Annulla lo rimette', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: 'Togli un pezzo di Shampoo manto bianco' }))
    expect(listProdotti(account.uid)[0].pezzi).toBe(9)
    expect(await screen.findByText('Shampoo manto bianco: 10 → 9')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(listProdotti(account.uid)[0]).toMatchObject({ pezzi: 10, movimenti: [] })
  })

  it('toccando il numero scala più pezzi insieme: 10 meno 2 fa 8', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('button', { name: 'Shampoo manto bianco: 10, cambia' }))
    const movimento = await screen.findByRole('dialog', { name: 'Shampoo manto bianco' })
    await user.click(within(movimento).getByRole('button', { name: '2' }))
    expect(within(movimento).getByText('Da 10 a 8')).toBeInTheDocument()
    await user.click(within(movimento).getByRole('button', { name: 'Scala 2' }))
    expect(listProdotti(account.uid)[0].pezzi).toBe(8)
  })

  it('a zero il − è spento e lo stato si legge a parole', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ pezzi: 0 }))
    saveProdottoLocal(account.uid, prodotto({ id: 'p2', nome: 'Profumo talco', pezzi: 2, categoria: 'finitura' }))
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    expect(await screen.findByRole('button', { name: 'Togli un pezzo di Shampoo manto bianco' })).toBeDisabled()
    expect(screen.getByText('Finito')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /2 prodotti da ordinare/ })).toHaveAttribute('href', '/altro/magazzino/ordini')
  })

  it('cerca, filtra e dice quando non trova nulla', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    saveProdottoLocal(account.uid, prodotto({ id: 'p2', nome: 'Profumo talco', categoria: 'finitura', codice: 'PR-018' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    expect(await screen.findByText('2 prodotti')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Finitura' }))
    expect(screen.queryByRole('link', { name: /Shampoo manto/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Cerca per nome, ditta o codice' }))
    await user.type(screen.getByRole('textbox'), 'sh-120')
    expect(screen.getByText('Nessun prodotto trovato')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tutti' }))
    expect(screen.getByRole('link', { name: /Shampoo manto/ })).toBeInTheDocument()
  })

  it('la scheda mostra lo storico; il titolare elimina dopo la conferma', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ movimenti: [{ at: data.getTime(), delta: -2, dopo: 10 }] }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    expect(await screen.findByText('Usati 2')).toBeInTheDocument()
    expect(screen.getByText('12 → 10')).toBeInTheDocument()
    expect(screen.getByText('pezzi, 50 L in tutto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Elimina prodotto' }))
    const conferma = await screen.findByRole('dialog')
    expect(listProdotti(account.uid)).toHaveLength(1)
    await user.click(within(conferma).getByRole('button', { name: 'Elimina' }))
    expect(await screen.findByRole('heading', { name: 'Magazzino' })).toBeInTheDocument()
    expect(listProdotti(account.uid)).toEqual([])
  })

  it('il collaboratore modifica ma non elimina', async () => {
    const account = await entra('collaboratore')
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica prodotto' }))
    expect(screen.queryByRole('button', { name: 'Elimina prodotto' })).toBeNull()
    const campo = await screen.findByLabelText('Codice prodotto')
    await user.clear(campo)
    await user.type(campo, 'SH-121')
    await user.click(screen.getByRole('button', { name: 'Salva prodotto' }))
    expect(listProdotti(account.uid)[0]).toMatchObject({ codice: 'SH-121', pezzi: 10 })
  })

  it('modificare un prodotto non perde i dati che la scheda non mostra', async () => {
    const account = await entra()
    const nascosti = { apertoIl: 111, confrontoIl: 222, mlPerCane: { piccola: 15, media: 30, grande: 50 }, diluizione: 10, costo: 18.5, mesiDopoApertura: 12, giorniConsegna: 3 }
    saveProdottoLocal(account.uid, prodotto(nascosti))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica prodotto' }))
    const scheda = await screen.findByRole('dialog')
    await user.click(within(scheda).getByRole('button', { name: 'Salva prodotto' }))
    expect(listProdotti(account.uid)[0]).toMatchObject(nascosti)
  })

  it('la scheda salva i campi facoltativi dagli altri dettagli', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica prodotto' }))
    const scheda = await screen.findByRole('dialog')
    await user.click(within(scheda).getByRole('button', { name: 'Altri dettagli' }))
    await user.type(within(scheda).getByLabelText('Costo a pezzo (€)'), '18,50')
    await user.click(within(scheda).getByRole('switch', { name: 'Lo vendo ai clienti' }))
    await user.type(within(scheda).getByLabelText('Prezzo di vendita (€)'), '25')
    await user.click(within(within(scheda).getByRole('group', { name: 'Mesi dopo l’apertura' })).getByRole('button', { name: 'Più' }))
    await user.click(within(scheda).getByRole('button', { name: 'Salva prodotto' }))
    expect(listProdotti(account.uid)[0]).toMatchObject({ costo: 18.5, uso: 'vendita', prezzoVendita: 25, mesiDopoApertura: 1 })
  })

  it('un costo scritto male non salva e riapre gli altri dettagli', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica prodotto' }))
    const scheda = await screen.findByRole('dialog')
    await user.click(within(scheda).getByRole('button', { name: 'Altri dettagli' }))
    await user.type(within(scheda).getByLabelText('Costo a pezzo (€)'), 'tanto')
    await user.click(within(scheda).getByRole('button', { name: 'Salva prodotto' }))
    expect(within(scheda).getByText('Scrivi un numero valido')).toBeInTheDocument()
    expect(listProdotti(account.uid)[0].costo).toBeNull()
  })

  it('i contatti di un fornitore valgono per tutti i suoi prodotti', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    saveProdottoLocal(account.uid, prodotto({ id: 'p2', nome: 'Profumo talco' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica prodotto' }))
    await user.click(await screen.findByRole('button', { name: 'Contatti' }))
    await user.type(await screen.findByLabelText('WhatsApp o telefono'), '3331234567')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    await user.click(screen.getByRole('button', { name: 'Salva prodotto' }))
    expect(listProdotti(account.uid).map((item) => item.telefono)).toEqual(['3331234567', '3331234567'])
  })

  it('l’ordine parte per fornitore, va in arrivo e quando arriva carica i pezzi', async () => {
    const aperture = vi.spyOn(window, 'open').mockReturnValue(null)
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto({ pezzi: 1, telefono: '3331234567' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/ordini" />)
    const riga = await screen.findByRole('group', { name: 'Shampoo manto bianco' })
    expect(within(riga).getByText('5')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Prepara l’ordine' }))
    const invio = await screen.findByRole('dialog', { name: 'Ordine a Ditta Alfa' })
    expect((within(invio).getByRole('textbox') as HTMLTextAreaElement).value).toContain('5 × Shampoo manto bianco 5 L (SH-120)')
    await user.click(within(invio).getByRole('button', { name: 'Invia su WhatsApp' }))
    expect(aperture.mock.calls[0][0]).toContain('https://wa.me/393331234567?text=')
    expect(listProdotti(account.uid)[0].inArrivo).toBe(5)
    await user.click(await screen.findByRole('button', { name: 'Arrivato' }))
    expect(listProdotti(account.uid)[0]).toMatchObject({ pezzi: 6, inArrivo: 0 })
    aperture.mockRestore()
  })

  it('un prodotto che non esiste più riporta all’elenco', async () => {
    await entra()
    render(<App memory isDev={false} initialPath="/altro/magazzino/sparito" />)
    expect(await screen.findByRole('heading', { name: 'Magazzino' })).toBeInTheDocument()
  })
})
