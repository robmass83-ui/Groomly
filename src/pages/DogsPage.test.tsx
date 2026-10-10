// @vitest-environment happy-dom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { archiveDog, createDog, listDogs } from '../data/local/dogs'
import { storageKeys } from '../data/local/storage'
import type { DogWrite } from '../types/models'

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

describe('lista cani', () => {
  beforeEach(() => localStorage.clear())

  it('parte vuota', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in archivio')).toBeInTheDocument()
    expect(screen.getByText('Nessun cane')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 0' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: 'Cerca' })).toHaveAttribute('placeholder', 'Nome, proprietario o razza')
    expect(screen.getByRole('button', { name: 'In agenda' })).toBeInTheDocument()
    expect(screen.getByText('Tutti').getAttribute('style')).toContain('background: var(--pri)')
    expect(screen.getByText('Tutti').getAttribute('style')).toContain('color: #fff')
    expect(screen.getByRole('group', { name: 'Filtri' })).toHaveStyle({ flexWrap: 'nowrap', overflow: 'hidden' })
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
  })

  it('ricerca, tab Mensili e chip Gatti filtrano senza cambiare i conteggi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '111' } }))
    createDog(account.uid, write({
      name: 'Micio', species: 'gatto', breed: 'Europeo', ageCategory: 'anziano', temperament: 'mordace',
      clientType: 'mensile', contact: { name: 'Lea', phone: '222' },
    }))
    createDog(account.uid, write({ name: 'Nina', species: 'gatto', breed: 'Siamese', contact: { name: 'Ada', phone: '444' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByText('Labrador · Adulto · Sara')).toBeInTheDocument()
    expect(screen.getByText('Europeo · Anziano · Lea')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cerca' }), 'lea')
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByText('3 attivi · 0 in archivio')).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Cerca' }))
    await user.type(screen.getByRole('textbox', { name: 'Cerca' }), '222')
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Nina' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Cerca' }))
    await user.click(screen.getByRole('tab', { name: 'Mensili 1' }))
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Nina' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Gatti' }))
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Mensili 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gatti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('mostra la terza riga, ordina per prossimo e Ripristina riporta il cane fra gli attivi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, write({ name: 'Luna', breed: 'Pastore', clientType: 'mensile', contact: { name: 'Maria Pinna', phone: '1' } }))
    const ada = createDog(account.uid, write({ name: 'Ada', breed: 'Bassotto', contact: { name: 'Sara', phone: '2' } }))
    const zoe = createDog(account.uid, write({ name: 'Zoe', breed: 'Barboncino', contact: { name: 'Lea', phone: '3' } }))
    const done = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 8, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, done.id)
    createAppointment(account.uid, {
      dogId: zoe.id,
      start: new Date(2099, 0, 1, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    archiveDog(account.uid, ada.id, 'non_in_cura')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali?tab=archivio" />)
    expect(await screen.findByRole('tab', { name: 'Archivio 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Non più in cura')).toBeInTheDocument()
    expect(screen.getByText('Ada').getAttribute('style')).toContain('color: var(--tx3)')
    await user.click(screen.getByRole('button', { name: 'Ripristina' }))
    expect(screen.queryByRole('heading', { name: 'Scheda' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Ada' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Attivi 3' }))
    expect(screen.getByRole('button', { name: 'Apri Ada' })).toBeInTheDocument()
    expect(screen.getByText('Pastore · Adulto · M. Pinna')).toBeInTheDocument()
    expect(screen.getByText('Da fissare · ultimo 3 set').getAttribute('style')).toContain('color: var(--warn)')
    expect(screen.getByText('Nessun appuntamento').getAttribute('style')).toContain('color: var(--tx3)')
    const names = () => screen.getAllByRole('button', { name: /^Apri (Ada|Luna|Zoe)$/ }).map((item) => item.getAttribute('aria-label'))
    expect(names()).toEqual(['Apri Ada', 'Apri Luna', 'Apri Zoe'])
    await user.click(screen.getByRole('button', { name: 'Ordina' }))
    expect(screen.getByRole('heading', { name: 'Ordina' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Per prossimo appuntamento' }))
    expect(names()).toEqual(['Apri Zoe', 'Apri Ada', 'Apri Luna'])
    await user.click(screen.getByRole('button', { name: 'Apri Luna' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
  })
})

const userEventSetup = userEvent.setup.bind(userEvent)

describe('scheda cane', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.spyOn(userEvent, 'setup').mockImplementation((options = {}) => userEventSetup({ applyAccept: false, ...options }))
  })

  it('non scrive senza nome, proprietario e telefono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Il nome è obbligatorio')).toBeInTheDocument()
    expect(screen.getByText('Il proprietario è obbligatorio')).toBeInTheDocument()
    expect(screen.getByText('Il telefono è obbligatorio')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeNull()
  })

  it('crea il cane, apre la scheda e lo ritrova dopo il rimontaggio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    expect(screen.getByRole('radio', { name: 'Cane' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Maschio' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Femmina' })).toHaveAttribute('aria-checked', 'false')
    await user.type(screen.getByLabelText('Nome'), 'Bobi')
    await user.type(screen.getByLabelText('Proprietario'), 'Lea')
    await user.type(screen.getByLabelText('Telefono'), '333')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Bobi salvato')
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByText('Bobi')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chiama' })).toHaveAttribute('href', 'tel:333')
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { species: string; sex?: string; size: string; temperament: string; clientType: string; ageCategory: string; searchKey: string }>
    const saved = Object.values(stored)[0]
    expect(saved).toMatchObject({ species: 'cane', size: 'piccola', temperament: 'bravo', clientType: 'occasionale', ageCategory: 'adulto', isSenior: false })
    expect(saved.searchKey).toMatch(/^bobi .*lea.* 333$/)
    expect(saved.sex).toBeUndefined()
    view.unmount()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('button', { name: 'Apri Bobi' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 1' })).toHaveAttribute('aria-selected', 'true')
  })

  it('se la scrittura del cane nuovo fallisce resta sul modulo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Bobi')
    await user.type(screen.getByLabelText('Proprietario'), 'Lea')
    await user.type(screen.getByLabelText('Telefono'), '333')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Bobi')
    vi.restoreAllMocks()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeNull()
  })

  it('un id sconosciuto non è una scheda vuota', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali/id-che-non-c-e" />)
    expect(await screen.findByText('Cane assente')).toBeInTheDocument()
  })

  it('Deceduto e Non più in cura si ripristinano, e Modifica resta disponibile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Deceduto' }))
    expect(await screen.findByText('Deceduto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ripristina' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deceduto' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('tab', { name: 'Attivi 0' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Archivio 1' }))
    await user.click(screen.getByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Ripristina' }))
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    await user.click(await screen.findByRole('tab', { name: 'Attivi 1' }))
    await user.click(screen.getByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Non più in cura' }))
    expect(await screen.findByText('Non più in cura')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Bobi')
  })

  it('Indietro abbandona la modifica e un salvataggio fallito tiene il nome vecchio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    const name = screen.getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Rex')
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('button', { name: 'Apri Bobi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Rex' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    const again = screen.getByLabelText('Nome')
    await user.clear(again)
    await user.type(again, 'Rex')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByLabelText('Nome')).toHaveValue('Rex')
    vi.restoreAllMocks()
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { name: string }>
    expect(stored[created.id].name).toBe('Bobi')
  })

  it('l\'avviso foto sparisce dopo il salvataggio e rientrando in modifica', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.upload(screen.getByLabelText('Foto'), new File(['x'], 'nota.txt', { type: 'text/plain' }))
    expect(await screen.findByText('Foto non utilizzabile')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(screen.queryByText('Foto non utilizzabile')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    expect(screen.queryByText('Foto non utilizzabile')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Bobi')
  })

  it('una foto non usabile non cambia i campi digitati', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Luna')
    await user.upload(screen.getByLabelText('Foto'), new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(await screen.findByText('Foto non utilizzabile')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Luna')
  })

  it('Indietro abbandona una foto non salvata', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const photo = await import('../lib/dogPhoto')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockResolvedValue('data:image/jpeg;base64,abc')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.upload(screen.getByLabelText('Foto'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    await waitFor(() => expect(document.querySelector('img[src*="abc"]')).not.toBeNull())
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    await user.click(await screen.findByRole('button', { name: 'Apri Bobi' }))
    expect(document.querySelector('img[src*="abc"]')).toBeNull()
    spy.mockRestore()
  })

  it('Esci non cancella i cani', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain('Bobi')
  })

  it('spezza l’avviso e toglie il cane solo dopo la conferma, lasciando l’appuntamento', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', criticalNote: 'Morde. Museruola' }))
    const start = new Date()
    start.setHours(10, 0, 0, 0)
    createAppointment(account.uid, {
      dogId: created.id,
      start,
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByText('Morde')).toBeInTheDocument()
    expect(screen.getByText('Museruola')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Elimina definitivamente' }))
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.getByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByText('Bobi')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain(created.id)
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Elimina definitivamente' }))
    await user.click(screen.getByRole('button', { name: 'Elimina definitivamente' }))
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).not.toContain(created.id)
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toContain(created.id)
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('button', { name: 'Apri Cane assente' })).toBeInTheDocument()
  })

  it('Salva tiene contatti, tag, galleria e lo scostamento che la scheda non azzera', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const takenAt = new Date('2026-03-01T09:30:00.000Z')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      breed: 'Barboncino',
      contact: { name: 'Lea', phone: '333' },
      contacts: [
        { id: 'a', name: 'Lea', role: 'Proprietaria', phone: '333', isPrimary: true },
        { id: 'b', name: 'Marco', role: 'Co-proprietario', phone: '444', isPrimary: false },
      ],
      birthYear: 2015,
      isSenior: false,
      weightKg: 8.5,
      recurrenceWeeks: 6,
      tags: ['vip'],
      servicePrices: [{ serviceId: 'bagno', price: 25, durationMin: 40 }],
      hiddenServiceIds: ['nodi'],
      customFields: [{ id: 'cf1', label: 'Veterinario', value: 'Dott. Rossi' }],
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,abc', takenAt }],
    }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    const name = screen.getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Rex')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)[created.id]
    expect(stored.name).toBe('Rex')
    expect(stored.contacts).toEqual([
      { id: 'a', name: 'Lea', role: 'Proprietaria', phone: '333', isPrimary: true },
      { id: 'b', name: 'Marco', role: 'Co-proprietario', phone: '444', isPrimary: false },
    ])
    expect(stored.birthYear).toBe(2015)
    expect(stored.isSenior).toBe(false)
    expect(stored.weightKg).toBe(8.5)
    expect(stored.recurrenceWeeks).toBe(6)
    expect(stored.tags).toEqual(['vip'])
    expect(stored.servicePrices).toEqual([{ serviceId: 'bagno', price: 25, durationMin: 40 }])
    expect(stored.hiddenServiceIds).toEqual(['nodi'])
    expect(stored.customFields).toEqual([{ id: 'cf1', label: 'Veterinario', value: 'Dott. Rossi' }])
    expect(stored.gallery).toEqual([{ id: 'g1', photo: 'data:image/jpeg;base64,abc', takenAt: takenAt.toISOString() }])
  })

  it('sulla scheda senza foto il ritratto sceglie il file e un file inutile resta visibile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Foto')).not.toBeInTheDocument()
    expect(screen.queryByText('Foto')).not.toBeInTheDocument()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).not.toBeVisible()
    const spy = vi.spyOn(input, 'click')
    await user.click(screen.getByRole('button', { name: 'Foto del cane' }))
    expect(spy).toHaveBeenCalled()
    await user.upload(input, new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(await screen.findByText('Foto non utilizzabile')).toBeInTheDocument()
  })

  it('sulla scheda con foto il ritratto apre Cambia e il file resta nascosto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', photo: 'data:image/jpeg;base64,abc' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Foto')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Foto del cane' }))
    expect(screen.getByRole('button', { name: 'Cambia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingrandisci' })).toBeInTheDocument()
    const input = screen.getByLabelText('Cambia foto')
    expect(input).not.toBeVisible()
    const spy = vi.spyOn(input, 'click')
    await user.click(screen.getByRole('button', { name: 'Cambia' }))
    expect(spy).toHaveBeenCalled()
    await user.upload(input, new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(await screen.findByText('Foto non utilizzabile')).toBeInTheDocument()
  })

  it('se l\'archivio fallisce non cancella le visite future', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const future = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2099, 0, 1, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Non più in cura' }))
    const original = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === storageKeys.dogs(account.uid)) throw new Error('quota')
      original(key, value)
    })
    await user.click(screen.getByRole('button', { name: 'Archivia e cancella i futuri' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(dogs[created.id].status).toBe('attivo')
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toContain(future.id)
  })

  it('se una cancellazione fallisce il cane è già archiviato e le visite restano', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const first = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2098, 0, 1, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const second = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2099, 0, 1, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Non più in cura' }))
    let writes = 0
    const original = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === storageKeys.appointments(account.uid)) {
        writes += 1
        throw new Error('quota')
      }
      original(key, value)
    })
    await user.click(screen.getByRole('button', { name: 'Archivia e cancella i futuri' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(writes).toBe(1)
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(dogs[created.id].status).toBe('non_in_cura')
    const raw = localStorage.getItem(storageKeys.appointments(account.uid))!
    expect(raw).toContain(first.id)
    expect(raw).toContain(second.id)
  })

  it('archivia e poi cancella solo i programmati futuri di quel cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const other = createDog(account.uid, write({ name: 'Zoe' }))
    const future = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2099, 0, 1, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const past = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2020, 0, 1, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const done = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2099, 5, 1, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, done.id)
    const otherVisit = createAppointment(account.uid, {
      dogId: other.id,
      start: new Date(2099, 2, 1, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Non più in cura' }))
    await user.click(screen.getByRole('button', { name: 'Archivia e cancella i futuri' }))
    expect(await screen.findByText('Non più in cura')).toBeInTheDocument()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(dogs[created.id].status).toBe('non_in_cura')
    const raw = localStorage.getItem(storageKeys.appointments(account.uid))!
    expect(raw).not.toContain(future.id)
    expect(raw).toContain(past.id)
    expect(raw).toContain(done.id)
    expect(raw).toContain(otherVisit.id)
  })

  it('un contatto aggiunto in modifica compare dopo Salva e entra nella searchKey', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', breed: 'Barboncino', contact: { name: 'Lea', phone: '333' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.click(screen.getByRole('button', { name: '+ Contatto' }))
    await user.type(screen.getByLabelText('Nome contatto'), 'Giulia')
    await user.type(screen.getByLabelText('Telefono contatto'), '555')
    await user.click(screen.getByRole('button', { name: 'Aggiungi contatto' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Giulia')).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)[created.id] as { searchKey: string }
    expect(stored.searchKey).toContain('giulia')
  })

  it('crea con nome, proprietario e telefono e non mostra la checkbox Anziano', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(screen.queryByRole('checkbox', { name: /anziano/i })).toBeNull()
    expect(screen.queryByText('Rinomina Razza')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Modifica' })).toBeNull()
    await user.type(screen.getByLabelText(/nome/i), 'Fido')
    await user.type(screen.getByLabelText(/proprietario/i), 'Usai')
    await user.type(screen.getByLabelText(/telefono/i), '3452424242')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Fido salvato')).toBeTruthy()
    const saved = listDogs(account.uid)[0]
    expect(saved.name).toBe('Fido')
    expect(saved.isSenior).toBe(false)
    expect(saved.ageCategory).toBe('adulto')
  })

  it('un anno completo ricalcola l\'età, il segmento manuale vale fino al prossimo cambio dell\'anno', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0, 0, 0))
    try {
      await createAccount('maria@salone.it', 'segretissimo')
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath="/animali/nuovo" />)
      await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
      expect(screen.getByRole('radio', { name: 'Adulto' })).toHaveAttribute('aria-checked', 'true')
      const year = screen.getByLabelText('Anno di nascita')
      await user.type(year, '202')
      expect(screen.getByRole('radio', { name: 'Adulto' })).toHaveAttribute('aria-checked', 'true')
      await user.type(year, '4')
      expect(screen.getByRole('radio', { name: 'Giovane' })).toHaveAttribute('aria-checked', 'true')
      await user.click(screen.getByRole('radio', { name: 'Adulto' }))
      expect(screen.getByRole('radio', { name: 'Adulto' })).toHaveAttribute('aria-checked', 'true')
      await user.clear(year)
      await user.type(year, '2010')
      expect(screen.getByRole('radio', { name: 'Anziano' })).toHaveAttribute('aria-checked', 'true')
    } finally {
      vi.useRealTimers()
    }
  })

  it('scegliere il segmento Anziano e salvare scrive isSenior vero', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText(/nome/i), 'Fido')
    await user.type(screen.getByLabelText(/proprietario/i), 'Usai')
    await user.type(screen.getByLabelText(/telefono/i), '3452424242')
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.click(screen.getByRole('radio', { name: 'Anziano' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Fido salvato')).toBeInTheDocument()
    const saved = listDogs(account.uid)[0]
    expect(saved.isSenior).toBe(true)
    expect(saved.ageCategory).toBe('anziano')
  })

  it('un anno incompleto non sposta il segmento e non si salva, un anno cancellato non cambia la categoria', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      ageCategory: 'giovane',
      birthYear: 2024,
      isSenior: false,
      contact: { name: 'Lea', phone: '333' },
    }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    const year = screen.getByLabelText('Anno di nascita')
    await user.clear(year)
    await user.type(year, '2010')
    expect(screen.getByRole('radio', { name: 'Anziano' })).toHaveAttribute('aria-checked', 'true')
    await user.type(year, '{Backspace}')
    expect(year).toHaveValue('201')
    expect(screen.getByRole('radio', { name: 'Anziano' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Anno di 4 cifre, non nel futuro')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)[created.id].ageCategory).toBe('giovane')
    await user.clear(year)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)[created.id]
    expect(stored.birthYear).toBeUndefined()
    expect(stored.ageCategory).toBe('anziano')
    expect(stored.isSenior).toBe(true)
  })

  it('la creazione mostra solo il form compatto, con i campi giusti e senza Annulla', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(screen.getByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.queryByText(/annulla/i)).toBeNull()
    expect(screen.queryByText('Storico')).toBeNull()
    expect(screen.queryByText('Galleria')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Chiama' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull()
    expect(screen.queryByRole('button', { name: '+ Contatto' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Altri dettagli' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Prezzi personalizzati' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('radio', { name: 'Piccola' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Bravo' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Telefono')).toHaveAttribute('inputmode', 'tel')
    expect(screen.getByLabelText('Nome')).toHaveAttribute('autocapitalize', 'words')
    expect(document.querySelector('input[type="file"]')).not.toBeVisible()
    const pair = screen.getByLabelText('Razza').closest('[style*="grid-template-columns"]')!
    expect(pair.getAttribute('style')).toContain('minmax(164px, 1fr)')
    expect(pair).toContainElement(screen.getByRole('radiogroup', { name: 'Taglia' }))
    expect(screen.getByLabelText('Proprietario').closest('[style*="grid-template-columns"]')).toContainElement(screen.getByLabelText('Telefono'))
  })

  it('Avanti passa al campo successivo e l\'ultimo salva', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Fido{Enter}')
    expect(screen.getByLabelText('Razza')).toHaveFocus()
    await user.click(screen.getByLabelText('Avviso critico'))
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Il proprietario è obbligatorio')).toBeInTheDocument()
  })

  it('un Mensile mostra la frequenza e la scrive sulla scheda, un occasionale no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Fido')
    await user.type(screen.getByLabelText('Proprietario'), 'Usai')
    await user.type(screen.getByLabelText('Telefono'), '333')
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    expect(screen.queryByLabelText(/frequenza/i)).toBeNull()
    await user.click(screen.getByRole('radio', { name: 'Mensile' }))
    const weeks = screen.getByLabelText(/frequenza/i)
    expect(weeks).toHaveValue('4')
    await user.clear(weeks)
    await user.type(weeks, '6')
    await user.click(screen.getByRole('radio', { name: 'Occasionale' }))
    expect(screen.queryByLabelText(/frequenza/i)).toBeNull()
    await user.click(screen.getByRole('radio', { name: 'Mensile' }))
    expect(screen.getByLabelText(/frequenza/i)).toHaveValue('6')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Fido salvato')).toBeInTheDocument()
    const saved = listDogs(account.uid)[0]
    expect(saved.clientType).toBe('mensile')
    expect(saved.recurrenceWeeks).toBe(6)
  })

  it('i prezzi personalizzati chiusi non scrivono nulla, aperti salvano solo lo scostamento e lo switch nasconde il servizio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Fido')
    await user.type(screen.getByLabelText('Proprietario'), 'Usai')
    await user.type(screen.getByLabelText('Telefono'), '333')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Fido salvato')).toBeInTheDocument()
    const first = listDogs(account.uid)[0]
    expect(first.servicePrices).toEqual([])
    expect(first.hiddenServiceIds).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Prezzi personalizzati' }))
    expect(screen.getByText('Prezzo €')).toBeInTheDocument()
    expect(screen.getByText('Durata min')).toBeInTheDocument()
    const price = screen.getByLabelText('Prezzo Bagno')
    expect(price).toHaveValue('')
    expect(price).toHaveAttribute('placeholder', '20')
    expect(price).toHaveAttribute('inputmode', 'decimal')
    await user.type(price, '25')
    await user.click(within(screen.getByRole('group', { name: 'Bagno' })).getByRole('switch', { name: 'nascondi questo servizio per questo cane' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const saved = listDogs(account.uid)[0]
    expect(saved.servicePrices).toEqual([{ serviceId: 'bagno', price: 25, durationMin: 30 }])
    expect(saved.hiddenServiceIds).toEqual(['bagno'])
  })

  it('Annulla nel toast toglie il cane appena creato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Fido')
    await user.type(screen.getByLabelText('Proprietario'), 'Usai')
    await user.type(screen.getByLabelText('Telefono'), '333')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Fido salvato')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(listDogs(account.uid)).toHaveLength(0)
  })

  it('la scheda in lettura ha Modifica nell\'header, Chiama, banda rossa, Dettagli chiusi e la freccia sul prezzo cambiato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      breed: 'Barboncino',
      criticalNote: 'Morde. Museruola',
      weightKg: 8.5,
      contact: { name: 'Lea', phone: '333' },
    }))
    const older = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 7, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const newer = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 8, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 25 }],
    })
    completeAppointment(account.uid, older.id)
    completeAppointment(account.uid, newer.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salva' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Chiama' })).toHaveAttribute('href', 'tel:333')
    expect(screen.getByText('Morde')).toBeInTheDocument()
    expect(screen.getByText('Fissa appuntamento')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /Prezzo più (alto|basso) del precedente/ })).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Prezzo più alto del precedente' })).toBeInTheDocument()
    expect(screen.queryByText('Rinomina Razza')).toBeNull()
    expect(screen.getByRole('button', { name: 'Dettagli' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('8,5 kg')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Dettagli' }))
    expect(screen.getByText('8,5 kg')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    expect(screen.getByRole('button', { name: 'Salva' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica' })).toBeNull()
  })

  it('un contatto nuovo parte senza ruolo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', contact: { name: 'Lea', phone: '333' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.click(screen.getByRole('button', { name: '+ Contatto' }))
    expect(screen.getByRole('button', { name: 'Proprietaria' })).toHaveAttribute('aria-pressed', 'false')
    await user.type(screen.getByLabelText('Nome contatto'), 'Giulia')
    await user.type(screen.getByLabelText('Telefono contatto'), '555')
    await user.click(screen.getByRole('button', { name: 'Aggiungi contatto' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const saved = listDogs(account.uid)[0]
    expect(saved.contacts.find((contact) => contact.name === 'Giulia')?.role).toBe('')
  })

  it('con un programmato futuro +2 sett e Fissa il prossimo chiedono conferma e non scrivono prima', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Ercole', contact: { name: 'Lea', phone: '333' } }))
    createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2099, 9, 22, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const count = () => Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)).length
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: '+2 sett' }))
    expect(screen.getByText('Ercole ha già un appuntamento il 22 ott. Crearne un altro?')).toBeInTheDocument()
    expect(count()).toBe(1)
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(count()).toBe(1)
    await user.click(screen.getByRole('button', { name: 'Fissa il prossimo' }))
    expect(screen.getByText('Ercole ha già un appuntamento il 22 ott. Crearne un altro?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    await user.click(screen.getByRole('button', { name: '+2 sett' }))
    await user.click(screen.getByRole('button', { name: 'Crea' }))
    expect(count()).toBe(2)
  })

  it('un anno prima del 1990 non crea il cane e il 2015 lo salva anziano', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0, 0, 0))
    try {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath="/animali/nuovo" />)
      await user.type(screen.getByLabelText('Nome'), 'Fido')
      await user.type(screen.getByLabelText('Proprietario'), 'Usai')
      await user.type(screen.getByLabelText('Telefono'), '3452424242')
      await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
      const year = screen.getByLabelText('Anno di nascita')
      await user.type(year, '1988')
      expect(screen.getByRole('radio', { name: 'Adulto' })).toHaveAttribute('aria-checked', 'true')
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByText('Anno di 4 cifre, non nel futuro')).toBeInTheDocument()
      expect(listDogs(account.uid)).toHaveLength(0)
      expect(localStorage.getItem(storageKeys.dogs(account.uid)) ?? '').not.toContain('1988')
      await user.clear(year)
      await user.type(year, '2015')
      expect(screen.getByRole('radio', { name: 'Anziano' })).toHaveAttribute('aria-checked', 'true')
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByText('Fido salvato')).toBeInTheDocument()
      const saved = listDogs(account.uid)[0]
      expect(saved.birthYear).toBe(2015)
      expect(saved.ageCategory).toBe('anziano')
      expect(saved.isSenior).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('un contatto aggiunto in creazione resta accanto al proprietario', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Fido')
    await user.type(screen.getByLabelText('Proprietario'), 'Usai')
    await user.type(screen.getByLabelText('Telefono'), '3452424242')
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.click(screen.getByRole('button', { name: '+ Contatto' }))
    await user.type(screen.getByLabelText('Nome contatto'), 'Giulia')
    await user.type(screen.getByLabelText('Telefono contatto'), '555')
    await user.click(screen.getByRole('button', { name: 'Aggiungi contatto' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Fido salvato')).toBeInTheDocument()
    const saved = listDogs(account.uid)[0]
    expect(saved.contacts).toHaveLength(2)
    expect(saved.contacts.find((contact) => contact.isPrimary)).toMatchObject({ name: 'Usai', phone: '3452424242', role: 'Proprietaria' })
    expect(saved.contacts.find((contact) => contact.name === 'Giulia')).toMatchObject({ phone: '555', role: '', isPrimary: false })
    expect(saved.contact).toMatchObject({ name: 'Usai', phone: '3452424242' })
  })
})
