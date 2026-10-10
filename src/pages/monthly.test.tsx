// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { archiveDog, createDog } from '../data/local/dogs'
import { ensureServiceSeed, updateService } from '../data/local/services'
import { storageKeys } from '../data/local/storage'
import type { DogWrite } from '../types/models'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'mensile',
    contact: { name: '', phone: '333' },
    ...extra,
  }
}

describe('mensili', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('da=mensili preseleziona cane, ora e servizio, e Chiudi torna alla lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-31&ora=09:30&servizi=bagno,sparito&da=mensili`} />)
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(await within(await screen.findByRole('dialog')).findByText('Luna')).toBeInTheDocument()
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-31')
    expect(screen.getByRole('button', { name: '09:30' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Bagno · / })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
  })

  it('un refresh dello stesso indirizzo tiene i valori e non crea appuntamenti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const path = `/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-31&ora=09:30&servizi=bagno&da=mensili`
    const first = render(<App memory isDev={false} initialPath={path} />)
    expect(await within(await screen.findByRole('dialog')).findByText('Luna')).toBeInTheDocument()
    first.unmount()
    render(<App memory isDev={false} initialPath={path} />)
    expect(await screen.findByLabelText('Giorno')).toHaveValue('2026-10-31')
    expect(screen.getByRole('button', { name: '09:30' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
  })

  it('ignora un’ora non valida e un cane archiviato, ma torna comunque ai mensili', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    archiveDog(account.uid, rex.id, 'deceduto')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}&data=2026-10-03&ora=09:10&da=mensili`} />)
    expect(await screen.findByLabelText(/cerca cane/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
  })

  it('un cane sconosciuto lascia il campo vuoto e Chiudi resta sui mensili', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?cane=inesistente&da=mensili&data=2026-10-03" />)
    expect(await screen.findByLabelText(/cerca cane/i)).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
  })

  it('un servizio spento o assente non resta premuto e Salva non scrive', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    ensureServiceSeed(account.uid)
    updateService(account.uid, 'bagno', { active: false })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-03&ora=09:00&servizi=bagno,sparito&da=mensili`} />)
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Bagno · / })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
  })

  it('da=altro non torna ai mensili', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}&da=altro&data=2026-10-03`} />)
    await user.click(await screen.findByRole('button', { name: 'Chiudi' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
  })

  it('se il salvataggio fallisce resta nel modulo con il toast plain', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-03&ora=09:00&servizi=bagno&da=mensili`} />)
    await user.click(await screen.findByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
    spy.mockRestore()
  })

  it('senza mensili attivi mostra solo Nessun mensile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const lux = createDog(account.uid, dog('Lux'))
    archiveDog(account.uid, lux.id, 'non_in_cura')
    createDog(account.uid, dog('Otto', { clientType: 'occasionale' }))
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    expect(screen.getByText('Nessun mensile')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fissati' })).not.toBeInTheDocument()
    expect(screen.queryByText('Lux')).not.toBeInTheDocument()
    expect(screen.queryByText('Otto')).not.toBeInTheDocument()
    expect(screen.getByText('Ottobre 2026')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'ott' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'nov' })).toHaveAttribute('aria-checked', 'false')
    for (const name of ['Home', 'Animali', 'Calendario', 'Listino']) {
      expect(screen.getByRole('link', { name })).not.toHaveAttribute('aria-current')
    }
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/')
  })

  it('ordina Da fissare, scrive Ultimo e non mostra l’avviso critico', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Nino'))
    createDog(account.uid, dog('Anna', { criticalNote: 'Morde' }))
    const bea = createDog(account.uid, dog('Bea'))
    const ciro = createDog(account.uid, dog('Ciro'))
    const beaVisit = createAppointment(account.uid, {
      dogId: bea.id,
      start: new Date(2026, 8, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const ciroVisit = createAppointment(account.uid, {
      dogId: ciro.id,
      start: new Date(2026, 8, 20, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, beaVisit.id)
    completeAppointment(account.uid, ciroVisit.id)
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Da fissare' })).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('Bea')).toBeLessThan(text.indexOf('Anna'))
    expect(text.indexOf('Anna')).toBeLessThan(text.indexOf('Nino'))
    expect(text.indexOf('Nino')).toBeLessThan(text.indexOf('Ciro'))
    expect(screen.getAllByText('Scade oggi')).toHaveLength(2)
    expect(screen.getByText('Ultimo 1 set · scade 29 set')).toBeInTheDocument()
    expect(screen.getByText('Ultimo 20 set · scade 18 ott')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Anna' })[0]).toHaveAttribute('width', '28')
    expect(screen.queryByLabelText('Avviso critico')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('la riga fissata apre il dettaglio e il 17 ottobre è fissato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 10, 11, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByText('10 ott')).toBeInTheDocument()
    expect(screen.getByText('17 ott')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fissati' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByText('Scade oggi')).not.toBeInTheDocument()
    const body = document.body.textContent ?? ''
    expect(body.indexOf('Rex')).toBeLessThan(body.indexOf('Luna'))
    await user.click(screen.getByRole('link', { name: /Rex/ }))
    expect(await screen.findByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
  })

  it('Fissa senza storico apre oggi, ora Scegli, e Chiudi non scrive', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Luna'))
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/mensili" />)
    await user.click(await screen.findByRole('button', { name: 'Fissa' }))
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(await within(await screen.findByRole('dialog')).findByText('Luna')).toBeInTheDocument()
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-03')
    expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /^Bagno · / })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByText('Chiudere senza salvare?')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('Fissa con lo storico propone il 31 ottobre e Salva rilegge il listino', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { size: 'piccola' }))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 8, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    })
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByText('Scade oggi')).toBeInTheDocument()
    const before = localStorage.getItem(storageKeys.appointments(account.uid))
    await user.click(screen.getByRole('button', { name: 'Fissa' }))
    expect(await within(await screen.findByRole('dialog')).findByText('Luna')).toBeInTheDocument()
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-31')
    expect(screen.getByRole('button', { name: '09:30' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Bagno · / })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBe(before)
    await user.click(screen.getByRole('button', { name: 'Fissa' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato per sab 31 ott 09:30')
    expect(screen.getByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    const booked = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string; services: { price: number; durationMin: number }[] }>)
    const fresh = booked.find((item) => new Date(item.start).getDate() === 31)
    expect(fresh?.services[0]).toMatchObject({ price: 20, durationMin: 30 })
    first.unmount()
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Fissati' })).toBeInTheDocument()
    expect(screen.getByText('31 ott')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fissa' })).not.toBeInTheDocument()
  })

  it('il 5 settembre completato resta da fissare, e il 10 ottobre lo sposta nei fissati di ottobre', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const done = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 8, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, done.id)
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Da fissare' })).toBeInTheDocument()
    expect(screen.getByText('Ultimo 5 set · scade 3 ott')).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
    expect(screen.getByText('fissati')).toBeInTheDocument()
    expect(screen.getByText('1 da fissare')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Fissati' }))
    expect(screen.getByText('Nessun mensile')).toBeInTheDocument()
    expect(screen.queryByText('Luna')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tutti' }))
    await user.click(screen.getByRole('radio', { name: 'nov' }))
    expect(screen.queryByText('Luna')).not.toBeInTheDocument()
    expect(screen.getByText('Nessun mensile')).toBeInTheDocument()
    first.unmount()
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 10, 11, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Fissati' })).toBeInTheDocument()
    expect(screen.getByText('10 ott')).toBeInTheDocument()
    expect(screen.getByText('1/1')).toBeInTheDocument()
    expect(screen.getByText('0 da fissare')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fissa' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'nov' }))
    expect(screen.queryByText('Luna')).not.toBeInTheDocument()
    expect(screen.getByText('Nessun mensile')).toBeInTheDocument()
  })

  it('un mensile in ritardo mostra il banner singolare e Vedi apre la lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const done = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 7, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, done.id)
    createDog(account.uid, dog('Otto', { clientType: 'occasionale' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    const banner = await screen.findByRole('region', { name: 'Mensili da programmare' })
    expect(screen.getByText('1 mensile da programmare')).toBeInTheDocument()
    expect(screen.getByText('scadono entro 7 gg')).toBeInTheDocument()
    expect(screen.queryByText('Otto')).not.toBeInTheDocument()
    expect(banner.getAttribute('style')).toContain('var(--warn-s)')
    expect(banner.getAttribute('style')).toContain('color: var(--warn)')
    const search = screen.getByRole('button', { name: 'Cerca' })
    const oggi = screen.getByRole('heading', { name: 'Oggi' })
    expect(search.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(banner.compareDocumentPosition(oggi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Vedi' }))
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
  })

  it('quattro Da fissare mostrano il conteggio intero e la scadenza entro 7 gg', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    for (const name of ['Zoe', 'Anna', 'Mia', 'Bea']) {
      const created = createDog(account.uid, dog(name))
      const done = createAppointment(account.uid, {
        dogId: created.id,
        start: new Date(2026, 7, 1, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      })
      completeAppointment(account.uid, done.id)
    }
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('4 mensili da programmare')).toBeInTheDocument()
    expect(screen.getByText('scadono entro 7 gg')).toBeInTheDocument()
    expect(screen.queryByText('Zoe')).not.toBeInTheDocument()
  })

  it('un mensile già fissato non fa comparire il banner', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 10, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mensili da programmare' })).not.toBeInTheDocument()
    expect(screen.queryByText(/da programmare/)).not.toBeInTheDocument()
  })

  it('dopo Salva oltre i 14 giorni dalla scadenza il banner non resta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { size: 'piccola' }))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 8, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    })
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/mensili" />)
    await user.click(await screen.findByRole('button', { name: 'Fissa' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato per')
    first.unmount()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mensili da programmare' })).not.toBeInTheDocument()
    expect(screen.queryByText(/da programmare/)).not.toBeInTheDocument()
  })

  it('il chip della scheda non torna ai mensili', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    await user.click(await screen.findByRole('button', { name: '+2 sett' }))
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
  })

  it('Nuovo appuntamento dal menu + non torna ai mensili e parte dalle 09:00', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await user.click(await screen.findByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
  })

  it('il Listino mostra i prezzi e non è più In arrivo', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await user.click(await screen.findByRole('link', { name: 'Listino' }))
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Aggiornato 3 ott 2026')).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByText('Bagno')).toBeInTheDocument()
  })

  it('archiviare non cancella l’appuntamento e il cane esce dalla lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const stored = localStorage.getItem(storageKeys.appointments(account.uid))
    archiveDog(account.uid, rex.id, 'deceduto')
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBe(stored)
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByText('Nessun mensile')).toBeInTheDocument()
    expect(screen.queryByText('Rex')).not.toBeInTheDocument()
  })

  it('Esci lascia cani e appuntamenti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Esci' }))
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain('Rex')
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toContain(rex.id)
  })

  it('la sovrapposizione avvisa e Salva scrive solo dopo la conferma', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 31, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-31&ora=09:30&servizi=bagno&da=mensili`} />)
    expect(await screen.findByText('Si sovrappone a Rex 09:30–10:00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('dialog', { name: 'Orario già occupato' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid)) ?? '{}') as object)).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Salva comunque' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato per sab 31 ott 09:30')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid)) ?? '{}') as Record<string, unknown>
    expect(Object.keys(stored)).toHaveLength(2)
  })
})
