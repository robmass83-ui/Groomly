// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { listAttesa, saveAttesaLocal } from '../data/local/attesa'
import { ensureServiceSeed, updateService } from '../data/local/services'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'

type Sessione = { uid: string }

async function salone(ruolo?: 'collaboratore'): Promise<Sessione> {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  writeJson(storageKeys.settings(account.uid), { ...getSettings(account.uid), serviziEmail: { attesa: { modo: 'manuale' } } })
  if (ruolo) writeJson(storageKeys.auth, { ...account, role: ruolo })
  return { uid: account.uid }
}

function iscritto(id: string, nomeCane: string, trattamento: string, extra: { attivo?: boolean; creatoIl?: string } = {}) {
  return {
    id,
    nome: 'Anna Verdi',
    phone: '3331234567',
    email: 'anna@example.com',
    nomeCane,
    specie: 'cane' as const,
    taglia: 'media' as const,
    servizioId: 'bagno',
    trattamento,
    durataMin: 45,
    creatoIl: extra.creatoIl ?? '2026-10-27T08:00:00.000Z',
    attivo: extra.attivo ?? true,
  }
}

async function compila(user: ReturnType<typeof userEvent.setup>, campi: { nome?: string; phone?: string; email?: string; cane?: string } = {}) {
  await user.type(screen.getByLabelText('Nome di chi aspetta'), campi.nome ?? 'Anna Verdi')
  await user.type(screen.getByLabelText('Telefono'), campi.phone ?? '3331234567')
  await user.type(screen.getByLabelText('Email'), campi.email ?? 'anna@example.com')
  await user.type(screen.getByLabelText('Nome del cane'), campi.cane ?? 'Rex')
}

describe('lista d’attesa, la pagina del salone', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('elenca nome del cane e trattamento solo di chi è ancora in lista', async () => {
    const { uid } = await salone()
    saveAttesaLocal(uid, iscritto('i1', 'Rex', 'Bagno'))
    saveAttesaLocal(uid, iscritto('i2', 'Luna', 'Stripping', { attivo: false }))
    render(<App memory isDev={false} initialPath="/animali/attesa" />)
    expect(await screen.findByRole('heading', { name: 'Lista d’attesa' })).toBeInTheDocument()
    const lista = screen.getByRole('list', { name: 'Chi aspetta' })
    expect(within(lista).getByText('Rex')).toBeInTheDocument()
    expect(within(lista).getByText('Bagno')).toBeInTheDocument()
    expect(screen.queryByText('Luna')).not.toBeInTheDocument()
    expect(within(lista).queryByText('Stripping')).not.toBeInTheDocument()
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('1 in attesa')).toBeInTheDocument()
  })

  it('Togli mette attivo a falso e non cancella il documento', async () => {
    const { uid } = await salone()
    saveAttesaLocal(uid, iscritto('i1', 'Rex', 'Bagno'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/attesa" />)
    const togli = await screen.findByRole('button', { name: 'Togli' })
    expect(togli.getAttribute('style')).toContain('min-height: 44px')
    await user.click(togli)
    expect(screen.queryByText('Rex')).not.toBeInTheDocument()
    expect(screen.getByText('Nessuno in lista.')).toBeInTheDocument()
    const salvati = listAttesa(uid)
    expect(salvati).toHaveLength(1)
    expect(salvati[0]).toMatchObject({ id: 'i1', attivo: false, nomeCane: 'Rex', trattamento: 'Bagno' })
  })

  it('il collaboratore può aggiungere e può premere Togli', async () => {
    const { uid } = await salone('collaboratore')
    saveAttesaLocal(uid, iscritto('i1', 'Rex', 'Bagno'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/attesa" />)
    await screen.findByRole('heading', { name: 'Lista d’attesa' })
    await compila(user, { cane: 'Fuffi' })
    await user.selectOptions(screen.getByLabelText('Trattamento'), 'bagno')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Fuffi')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Togli' })[0])
    expect(listAttesa(uid).filter((item) => item.attivo)).toHaveLength(1)
  })

  it('senza trattamento il Salva non scrive e la lista resta vuota', async () => {
    const { uid } = await salone()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/attesa" />)
    await screen.findByRole('heading', { name: 'Lista d’attesa' })
    await compila(user)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(listAttesa(uid)).toHaveLength(0)
    expect(localStorage.getItem(storageKeys.attesa(uid))).toBeNull()
    expect(screen.getByText('Nessuno in lista.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Compila tutti i campi e scegli un trattamento.')
  })

  it('senza nome del cane il Salva non scrive, anche con il trattamento scelto', async () => {
    const { uid } = await salone()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/attesa" />)
    await screen.findByRole('heading', { name: 'Lista d’attesa' })
    await compila(user, { cane: '   ' })
    await user.selectOptions(screen.getByLabelText('Trattamento'), 'bagno')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(listAttesa(uid)).toHaveLength(0)
  })

  it('offre solo i servizi principali attivi e salva un documento con la durata del catalogo', async () => {
    const { uid } = await salone()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/attesa" />)
    await screen.findByRole('heading', { name: 'Lista d’attesa' })
    const scelta = screen.getByLabelText('Trattamento')
    const nomi = within(scelta).getAllByRole('option').map((item) => item.textContent)
    expect(nomi).toEqual(['Scegli un trattamento', 'Bagno', 'Taglio / tosatura', 'Bagno + taglio', 'Stripping'])
    expect(nomi).not.toContain('Unghie')
    await compila(user)
    await user.click(screen.getByRole('radio', { name: 'Grande' }))
    await user.click(screen.getByRole('radio', { name: 'Gatto' }))
    await user.selectOptions(scelta, 'bagno-taglio')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Rex')).toBeInTheDocument()
    const salvati = listAttesa(uid)
    expect(salvati).toHaveLength(1)
    expect(salvati[0]).toMatchObject({
      attivo: true,
      nome: 'Anna Verdi',
      phone: '3331234567',
      email: 'anna@example.com',
      nomeCane: 'Rex',
      specie: 'gatto',
      taglia: 'grande',
      servizioId: 'bagno-taglio',
      trattamento: 'Bagno + taglio',
      durataMin: 120,
    })
    expect(salvati[0].id).not.toBe('')
    // non crea né un cane né una visita
    expect(localStorage.getItem(storageKeys.dogs(uid))).toBeNull()
    expect(localStorage.getItem(storageKeys.appointments(uid))).toBeNull()
    // il modulo si svuota per il prossimo
    expect(screen.getByLabelText('Nome del cane')).toHaveValue('')
  })

  it('se il catalogo non dà una durata per quel servizio non scrive niente', async () => {
    const { uid } = await salone()
    // un servizio senza prezzo non entra nel catalogo: scegliCatalogo dà null
    const servizi = ensureServiceSeed(uid)
    const bagno = servizi.find((item) => item.id === 'bagno')!
    updateService(uid, bagno.id, { price: { piccola: 0, media: 0, grande: 0 } })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/attesa" />)
    await screen.findByRole('heading', { name: 'Lista d’attesa' })
    await compila(user)
    await user.selectOptions(screen.getByLabelText('Trattamento'), 'bagno')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(listAttesa(uid)).toHaveLength(0)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
