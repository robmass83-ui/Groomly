// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { completeAppointment, createAppointment, listAppointments } from '../data/local/appointments'
import { createDog } from '../data/local/dogs'
import { getSettings, type SettingsMain } from '../data/local/settings'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import type { PianoValore } from '../hooks/usePiano'
import { notifyLocalWrite } from '../lib/dataRefresh'
import { hrefChat } from '../lib/messaggiManuali'
import { statoPiano } from '../lib/piano'
import type { DogWrite } from '../types/models'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
const agendaForzata = vi.hoisted(() => ({ synced: null as boolean | null }))
vi.mock('../hooks/useAppointments', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useAppointments')>('../hooks/useAppointments')
  return {
    ...actual,
    useAppointments: (uid: string) => {
      const value = actual.useAppointments(uid)
      return agendaForzata.synced === null ? value : { ...value, synced: agendaForzata.synced }
    },
  }
})

vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

function write(partial: Partial<DogWrite> & Pick<DogWrite, 'name'>): DogWrite {
  return {
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...partial,
  }
}

function salvaServizi(uid: string, servizi: NonNullable<SettingsMain['serviziEmail']>, extra: Partial<SettingsMain> = {}) {
  const settings = getSettings(uid)
  writeJson(storageKeys.settings(uid), {
    ...settings,
    ...extra,
    serviziEmail: { ...settings.serviziEmail, ...servizi },
  })
}

describe('scheda del cane', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    pianoForzato.valore = null
    agendaForzata.synced = null
  })

  it('con un servizio acceso mostra l’aiuto e l’errore solo se l’email non è vuota e non è valida', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    salvaServizi(account.uid, { promemoria: { modo: 'manuale' } })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.getByText('Qui arrivano promemoria e avvisi.')).toBeInTheDocument()
    const email = screen.getByRole('textbox', { name: 'Email' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.type(email, 'maria@salon')
    expect(screen.getByRole('alert')).toHaveTextContent('Inserisci un’email valida')
    await user.clear(email)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.type(email, 'maria@salon.it')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('con i servizi email spenti il campo non c’è, nemmeno se è accesa solo la fedeltà', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument()
    expect(screen.queryByText('Qui arrivano promemoria e avvisi.')).not.toBeInTheDocument()
    cleanup()
    localStorage.clear()
    sessionStorage.clear()
    const secondo = await createAccount('maria@salone.it', 'segretissimo')
    salvaServizi(secondo.uid, { fedelta: { modo: 'manuale' } })
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument()
  })

  it('con le mail spente il collaboratore vede Mail spente e Riattiva le riaccende', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', contact: { name: 'Ada', phone: '333', email: 'ada@cliente.it' } }))
    const chiave = storageKeys.dogs(account.uid)
    const mappa = readJson<Record<string, { emailBloccata?: boolean }>>(chiave) ?? {}
    mappa[created.id].emailBloccata = true
    writeJson(chiave, mappa)
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByText('Mail spente')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Riattiva' }))
    await waitFor(() => expect(screen.queryByText('Mail spente')).not.toBeInTheDocument())
    const dopo = readJson<Record<string, { emailBloccata?: boolean; contact?: { email?: string } }>>(chiave)
    expect(dopo?.[created.id]?.emailBloccata).not.toBe(true)
    expect(dopo?.[created.id]?.contact?.email).toBe('ada@cliente.it')
  })

  it('il collaboratore non vede Metti in lista se l’attesa è spenta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    salvaServizi(account.uid, { attesa: { modo: 'spento' } })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Metti in lista' })).not.toBeInTheDocument()
  })

  it('con la lista accesa la scheda non offre Metti in lista né Togli, in nessun modo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    const altro = { id: 'altro', dogId: created.id, durataMin: 30, preferenza: 'mattina' as const, arrivato: '2026-10-01' }
    salvaServizi(account.uid, { attesa: { modo: 'manuale' } }, { attesa: [altro] })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Metti in lista' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Togli' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).attesa).toEqual([altro])
  })

  it('con la lista in automatico la scheda non ha il pulsante Metti in lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    salvaServizi(account.uid, { attesa: { modo: 'automatico' } })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Metti in lista' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).attesa ?? []).toEqual([])
  })

  it('con ?campo=email apre la modifica e mette il fuoco sull’email', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    salvaServizi(account.uid, { promemoria: { modo: 'manuale' } })
    const created = createDog(account.uid, write({ name: 'Nina' }))
    render(<App memory isDev={false} initialPath={`/animali/${created.id}?campo=email`} />)
    const email = await screen.findByRole('textbox', { name: 'Email' })
    await waitFor(() => expect(email).toHaveFocus())
  })

  it('in Go la tessera fedeltà c’è col segno Plus e il tocco apre la finestra', async () => {
    const apriPaywall = vi.fn()
    pianoForzato.valore = {
      mostraPiani: true,
      abbonamentiAttivi: false,
      tour: { acceso: false, dal: null },
      stato: statoPiano(undefined, new Date(2026, 9, 10, 12, 0, 0, 0)),
      provaUsata: false,
      provaConcessa: true,
      paywall: null,
      esitoProva: 'spento',
      messaggioProva: '',
      apriPaywall: apriPaywall,
      chiudiPaywall: () => undefined,
      prova: async () => undefined,
      avvisa: async () => undefined,
    }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    salvaServizi(account.uid, { fedelta: { modo: 'manuale' } })
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    const tessera = await screen.findByRole('button', { name: /Tessera fedeltà/ })
    expect(tessera).toHaveTextContent('Plus')
    await user.click(tessera)
    expect(apriPaywall).toHaveBeenCalledWith('fedelta')
  })

  it('la riga del contatto ha nome, numero e tre tasti: Chiama, WhatsApp semplice e Messaggi col segno Plus in Go', async () => {
    const apriPaywall = vi.fn()
    pianoForzato.valore = {
      mostraPiani: true,
      abbonamentiAttivi: false,
      tour: { acceso: false, dal: null },
      stato: statoPiano(undefined, new Date(2026, 9, 10, 12, 0, 0, 0)),
      provaUsata: false,
      provaConcessa: true,
      paywall: null,
      esitoProva: 'spento',
      messaggioProva: '',
      apriPaywall: apriPaywall,
      chiudiPaywall: () => undefined,
      prova: async () => undefined,
      avvisa: async () => undefined,
    }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', contact: { name: 'Giulia Rossi', phone: '333 1234567' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    const riga = await screen.findByTestId('riga-contatto')
    expect(riga).toHaveTextContent('G. Rossi · proprietario')
    expect(riga).toHaveTextContent('333 1234567')
    expect(screen.getByRole('link', { name: 'Chiama' })).toHaveAttribute('href', 'tel:333 1234567')
    const whats = screen.getByRole('link', { name: 'WhatsApp' })
    expect(whats).toHaveAttribute('href', hrefChat('333 1234567'))
    expect(whats.getAttribute('href')).not.toContain('text=')
    const messaggi = screen.getByRole('button', { name: 'Messaggi pronti, Plus' })
    await user.click(messaggi)
    expect(apriPaywall).toHaveBeenCalledWith('messaggiCategoria')
    expect(screen.queryByRole('link', { name: 'Apri WhatsApp' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Fissa appuntamento' })).toBeInTheDocument()
  })

  it('senza telefono la riga del contatto non c’è', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', contact: { name: 'Giulia', phone: '' } }))
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByTestId('riga-contatto')).toBeNull()
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).toBeNull()
  })
  function visita(uid: string, dogId: string, giorni: number) {
    const start = new Date(Date.now() + giorni * 86400000)
    return createAppointment(uid, {
      dogId,
      start,
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
  }

  it('il segnaposto del prezzo personale è il prezzo che propone l’agenda: Yorkshire Bagno 25', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', breed: 'Yorkshire' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await screen.findByRole('heading', { name: 'Scheda' })
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Prezzi personalizzati' }))
    expect(screen.getByLabelText('Prezzo Bagno')).toHaveAttribute('placeholder', '25')
  })

  it('la conferma di eliminazione dice quante visite future spariscono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const f1 = visita(account.uid, created.id, 3)
    const f2 = visita(account.uid, created.id, 9)
    const fatta = visita(account.uid, created.id, -20)
    completeAppointment(account.uid, fatta.id)
    const daChiudere = visita(account.uid, created.id, -2)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await screen.findByRole('heading', { name: 'Scheda' })
    await user.click(await screen.findByRole('button', { name: /Altro|Menu|Azioni/ }))
    await user.click(await screen.findByRole('button', { name: /Elimina definitivamente/ }))
    expect(await screen.findByText('Le 2 visite future verranno cancellate.')).toBeInTheDocument()
    expect(screen.getByText('Lo storico e gli incassi restano.')).toBeInTheDocument()
    const bottoni = screen.getAllByRole('button', { name: /Elimina definitivamente/ })
    await user.click(bottoni[bottoni.length - 1])
    await waitFor(() => {
      const ids = listAppointments(account.uid).map((a) => a.id)
      expect(ids).not.toContain(f1.id)
      expect(ids).not.toContain(f2.id)
      expect(ids).toContain(fatta.id)
      expect(ids).toContain(daChiudere.id)
    })
  })

  it('la conferma di eliminazione aspetta l’agenda prima di contare e di eliminare', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const f1 = visita(account.uid, created.id, 3)
    agendaForzata.synced = false
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await screen.findByRole('heading', { name: 'Scheda' })
    await user.click(await screen.findByRole('button', { name: /Altro|Menu|Azioni/ }))
    await user.click(await screen.findByRole('button', { name: /Elimina definitivamente/ }))
    expect(await screen.findByText("Carico l'agenda…")).toBeInTheDocument()
    expect(screen.queryByText(/visit[ae] futur[ae] verr/)).toBeNull()
    const bottoni = screen.getAllByRole('button', { name: /Elimina definitivamente/ })
    const finale = bottoni[bottoni.length - 1]
    expect(finale).toBeDisabled()
    await user.click(finale)
    expect(listAppointments(account.uid).map((a) => a.id)).toContain(f1.id)
    agendaForzata.synced = true
    act(() => notifyLocalWrite())
    expect(await screen.findByText('La visita futura verrà cancellata.')).toBeInTheDocument()
    expect(screen.queryByText("Carico l'agenda…")).toBeNull()
    await user.click(screen.getAllByRole('button', { name: /Elimina definitivamente/ }).at(-1)!)
    await waitFor(() => {
      const ids = listAppointments(account.uid).map((a) => a.id)
      expect(ids).not.toContain(f1.id)
    })
  })

  it('senza visite future la conferma dice solo che lo storico resta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const fatta = visita(account.uid, created.id, -20)
    completeAppointment(account.uid, fatta.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await screen.findByRole('heading', { name: 'Scheda' })
    await user.click(await screen.findByRole('button', { name: /Altro|Menu|Azioni/ }))
    await user.click(await screen.findByRole('button', { name: /Elimina definitivamente/ }))
    expect(await screen.findByText('Lo storico e gli incassi restano.')).toBeInTheDocument()
    expect(screen.queryByText(/visit[ae] futur[ae] verr/)).toBeNull()
  })

  it('i tag vecchi nei dati non si vedono e il salvataggio non li riscrive', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Luna', contact: { name: '', phone: '3331234567' } }))
    const dati = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)
    dati[created.id].tags = ['ipoallergenico']
    localStorage.setItem(storageKeys.dogs(account.uid), JSON.stringify(dati))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByText('ipoallergenico')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    expect(screen.queryByText(/Aggiungi tag|\+ Tag/)).toBeNull()
    expect(screen.queryByText('ipoallergenico')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const salvato = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)[created.id]
    expect(salvato).not.toHaveProperty('tags')
  })
})
