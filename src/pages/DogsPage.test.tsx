// @vitest-environment happy-dom
import { Capacitor } from '@capacitor/core'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import avatarCat from '../assets/icons/svg/avatar-cat.svg'
import avatarGeneric from '../assets/icons/svg/avatar-generic.svg'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { completeAppointment, createAppointment, saveClose, setAppointmentStatus } from '../data/local/appointments'
import { archiveDog, createDog, deleteDog, listDogs } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
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
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('parte vuota', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in archivio')).toBeInTheDocument()
    expect(screen.queryByText('Nessun cane')).not.toBeInTheDocument()
    const first = screen.getByRole('button', { name: 'Aggiungi il primo animale' })
    expect(first.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('tab', { name: 'Attivi 0' })).toHaveAttribute('aria-selected', 'true')
    const attivi = screen.getByRole('tab', { name: 'Attivi 0' })
    expect(attivi.getAttribute('style')).toContain('min-height: 44px')
    expect(attivi.getAttribute('style')).toContain('white-space: nowrap')
    expect(attivi.getAttribute('style')).toContain('flex-grow: 0')
    expect(attivi.getAttribute('style')).toContain('flex-shrink: 0')
    expect(attivi.parentElement?.getAttribute('style')).toContain('overflow-x: auto')
    expect(screen.getByRole('textbox', { name: 'Cerca' }).getAttribute('style')).toContain('min-height: 44px')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: 'Cerca' })).toHaveAttribute('placeholder', 'Nome, proprietario o razza')
    expect(screen.getByRole('button', { name: 'In agenda' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filtri' }).firstElementChild).toHaveStyle({ flexWrap: 'wrap' })
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    const adds = screen.getAllByRole('button', { name: 'Aggiungi' })
    expect(adds).toHaveLength(1)
    expect(adds[0]).toHaveClass('bottom-nav__fab')
  })

  it('«Aggiungi il primo animale» porta alla scheda vuota', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    await user.click(await screen.findByRole('button', { name: 'Aggiungi il primo animale' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
  })

  it('in lista la galleria resta visibile come foto profilo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,gal', takenAt: new Date('2026-03-01T09:30:00.000Z') }],
    }))
    const map = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { photo?: string }>
    delete map[created.id].photo
    localStorage.setItem(storageKeys.dogs(account.uid), JSON.stringify(map))
    render(<App memory isDev={false} initialPath="/animali" />)
    const open = await screen.findByRole('button', { name: 'Apri Bobi' })
    expect(open.querySelector('img')).toHaveAttribute('src', 'data:image/jpeg;base64,gal')
  })

  it('le righe sono alte 56 px con foto da 40 px e il menu resta fuori dalla lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '111' } }))
    render(<App memory isDev={false} initialPath="/animali" />)
    const open = await screen.findByRole('button', { name: 'Apri Bobi' })
    const row = open.parentElement as HTMLElement
    expect(row.getAttribute('style')).toContain('min-height: 56px')
    expect(open.querySelector('img')).toHaveAttribute('width', '40')
    expect(open.querySelector('img')).toHaveAttribute('height', '40')
    const portrait = open.querySelector('img')
    const sticker = screen.getByRole('img', { name: 'Bravo' })
    const chevron = open.querySelector('svg')
    expect(portrait).toBeTruthy()
    expect(chevron).toBeTruthy()
    expect(portrait?.parentElement).toBe(open)
    expect(Number(portrait?.compareDocumentPosition(sticker)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(Number(sticker.compareDocumentPosition(chevron as Node)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(open.querySelector('[style*="text-overflow: ellipsis"]')).toBeNull()
    expect(screen.getByText('Bobi').getAttribute('style') ?? '').not.toContain('text-overflow: ellipsis')
    const list = screen.getByTestId('dogs-list')
    const controls = screen.getByTestId('dogs-controls')
    expect(list.contains(controls)).toBe(false)
    expect(list.contains(screen.getByTestId('brand-bar'))).toBe(false)
    expect(list.contains(open)).toBe(true)
    expect(list.getAttribute('style')).toContain('overflow-y: auto')
    expect(screen.getByTestId('phone-shell').getAttribute('style')).toContain('overflow: hidden')
    expect(screen.queryByRole('button', { name: 'Aggiungi il primo animale' })).not.toBeInTheDocument()
  })

  it('apre la scheda dall\'inizio anche se la finestra era già scorsa', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Luna' }))
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    await screen.findByRole('button', { name: 'Apri Luna' })
    scrollTo.mockClear()
    document.documentElement.scrollTop = 640
    await user.click(screen.getByRole('button', { name: 'Apri Luna' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(document.documentElement.scrollTop).toBe(0)
    scrollTo.mockRestore()
  })

  it('tornando indietro la lista resta nel punto in cui era', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    for (const name of ['Ada', 'Bea', 'Ciro', 'Dina', 'Ema', 'Fede']) createDog(account.uid, write({ name }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    const list = await screen.findByTestId('dogs-list')
    list.scrollTop = 180
    await user.click(screen.getByRole('button', { name: 'Apri Ada' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
    expect(await screen.findByTestId('dogs-list')).toHaveProperty('scrollTop', 180)
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
    expect(screen.getByText('Nessun appuntamento').getAttribute('style')).toContain('color: var(--tx2)')
    const names = () => screen.getAllByRole('button', { name: /^Apri (Ada|Luna|Zoe)$/ }).map((item) => item.getAttribute('aria-label'))
    expect(names()).toEqual(['Apri Ada', 'Apri Luna', 'Apri Zoe'])
    await user.click(screen.getByRole('button', { name: 'Ordina' }))
    expect(screen.getByRole('heading', { name: 'Ordina' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alfabetico' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Per prossimo appuntamento' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Alfabetico' }).getAttribute('style')).toContain('min-height: 44px')
    await user.click(screen.getByRole('button', { name: 'Per prossimo appuntamento' }))
    expect(names()).toEqual(['Apri Zoe', 'Apri Ada', 'Apri Luna'])
    await user.click(screen.getByRole('button', { name: 'Apri Luna' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
  })

  it('un futuro oltre i 14 giorni dalla scadenza mostra la data, un passato aperto mostra Da chiudere', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0, 0, 0))
    try {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      const line = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
      const luna = createDog(account.uid, write({ name: 'Luna', clientType: 'mensile' }))
      completeAppointment(account.uid, createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 8, 5, 9, 0, 0, 0), services: line }).id)
      createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 31, 10, 0, 0, 0), services: line })
      const rex = createDog(account.uid, write({ name: 'Rex' }))
      createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 9, 9, 0, 0, 0), services: line })
      const mia = createDog(account.uid, write({ name: 'Mia', clientType: 'mensile' }))
      completeAppointment(account.uid, createAppointment(account.uid, { dogId: mia.id, start: new Date(2026, 8, 5, 9, 0, 0, 0), services: line }).id)
      render(<App memory isDev={false} initialPath="/animali" />)
      expect(await screen.findByText('Sab 31 ott 10:00')).toBeInTheDocument()
      expect(screen.getByText('Da chiudere').getAttribute('style')).toContain('color: var(--warn)')
      const badge = screen.getByText('Da fissare · ultimo 5 set')
      expect(badge.getAttribute('style')).toContain('background: var(--warn-s)')
      expect(screen.getAllByText(/^Da fissare/)).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('Altri compare solo con un animale di specie altro, e i segnaposto cambiano con la specie', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Bobi' }))
    createDog(account.uid, write({ name: 'Micio', species: 'gatto' }))
    const srcs = () => Array.from(document.querySelectorAll('img')).map((item) => item.getAttribute('src'))
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('button', { name: 'Gatti' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Altri' })).not.toBeInTheDocument()
    expect(srcs()).toContain(avatarCat)
    expect(srcs()).not.toContain(avatarGeneric)
    first.unmount()
    createDog(account.uid, write({ name: 'Pepe', species: 'altro', breed: 'Pappagallo' }))
    render(<App memory isDev={false} initialPath="/animali" />)
    await user.click(await screen.findByRole('button', { name: 'Altri' }))
    expect(screen.getByRole('button', { name: 'Apri Pepe' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(srcs()).toContain(avatarGeneric)
    expect(screen.getByText('Pappagallo · Adulto')).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: 'Torna agli animali' })).toHaveAttribute('href', '/animali')
    expect(screen.queryByTestId('back-bar')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull()
    const scheda = screen.getByTestId('scheda')
    expect(scheda).toHaveClass('scheda-enter')
    expect(scheda.getAttribute('style')).toContain('calc(72px + env(safe-area-inset-bottom, 0px))')
  })

  it('la scheda scorre nel proprio riquadro, alto come lo schermo visibile', async () => {
    const previous = window.visualViewport
    const listeners = new Set<() => void>()
    const viewport = {
      height: 640,
      addEventListener: (_type: string, fn: () => void) => { listeners.add(fn) },
      removeEventListener: (_type: string, fn: () => void) => { listeners.delete(fn) },
    }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
    try {
      await createAccount('maria@salone.it', 'segretissimo')
      render(<App memory isDev={false} initialPath="/animali/id-che-non-c-e" />)
      expect(await screen.findByText('Cane assente')).toBeInTheDocument()
      const scroll = screen.getByTestId('scheda-scroll')
      const scheda = screen.getByTestId('scheda')
      expect(scroll.contains(scheda)).toBe(true)
      expect(scroll).not.toHaveClass('scheda-enter')
      expect(scheda).toHaveClass('scheda-enter')
      const scrollStyle = scroll.getAttribute('style') ?? ''
      expect(scrollStyle).toContain('overflow-y: auto')
      expect(scrollStyle).toContain('min-height: 0')
      expect(scrollStyle).toContain('flex-grow: 1')
      expect(scrollStyle).toContain('flex-basis: 0%')
      expect(scrollStyle).toContain('touch-action: pan-y')
      expect(scrollStyle).toContain('overscroll-behavior: contain')
      const shell = screen.getByTestId('phone-shell')
      await waitFor(() => expect(shell.getAttribute('style')).toContain('height: 640px'))
      expect(shell.getAttribute('style')).toContain('max-height: 640px')
      expect(shell.getAttribute('style')).toContain('overflow: hidden')
      viewport.height = 520
      for (const fn of listeners) fn()
      await waitFor(() => expect(shell.getAttribute('style')).toContain('height: 520px'))
    } finally {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: previous })
    }
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
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
    expect(await screen.findByRole('tab', { name: 'Attivi 0' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Archivio 1' }))
    await user.click(screen.getByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Ripristina' }))
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
    await user.click(await screen.findByRole('tab', { name: 'Attivi 1' }))
    await user.click(screen.getByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Non più in cura' }))
    expect(await screen.findByText('Non più in cura')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Bobi')
  })

  it('Tornare agli animali abbandona la modifica e un salvataggio fallito tiene il nome vecchio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    const name = screen.getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Rex')
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
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

  it('Togli in galleria mette l’id della foto in removedPhotoIds del cane salvato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const takenAt = new Date('2026-03-01T09:30:00.000Z')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      photo: 'data:image/jpeg;base64,pro',
      gallery: [
        { id: 'g1', photo: 'data:image/jpeg;base64,uno', takenAt },
        { id: 'g2', photo: 'data:image/jpeg;base64,due', takenAt },
      ],
    }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.click(screen.getByRole('button', { name: 'Togli foto 1' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    const saved = listDogs(account.uid)[0]
    expect(saved.gallery.map((item) => item.id)).toEqual(['g2'])
    expect(saved.removedPhotoIds).toEqual(['g1'])
  })

  it('con 20 foto la galleria non accetta la ventunesima', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const takenAt = new Date('2026-03-01T09:30:00.000Z')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      gallery: Array.from({ length: 20 }, (_, index) => ({ id: `g${index}`, photo: `data:image/jpeg;base64,QQ${index}`, takenAt })),
    }))
    const photo = await import('../lib/dogPhoto')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockResolvedValue('data:image/jpeg;base64,nuova')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.upload(screen.getByLabelText('Aggiungi alla galleria'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    expect(await screen.findByText('Puoi caricare al massimo 20 foto per cane.')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(listDogs(account.uid)[0].gallery).toHaveLength(20)
    spy.mockRestore()
  })

  it('con 20 foto e senza profilo la foto profilo non entra', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const takenAt = new Date('2026-03-01T09:30:00.000Z')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      gallery: Array.from({ length: 20 }, (_, index) => ({ id: `g${index}`, photo: `data:image/jpeg;base64,QQ${index}`, takenAt })),
    }))
    const map = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { photo?: string }>
    delete map[created.id].photo
    localStorage.setItem(storageKeys.dogs(account.uid), JSON.stringify(map))
    const photo = await import('../lib/dogPhoto')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockResolvedValue('data:image/jpeg;base64,nuova')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.upload(screen.getByLabelText('Foto'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    expect(await screen.findByText('Puoi caricare al massimo 20 foto per cane.')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('con 20 foto e il profilo uguale alla prima della galleria il profilo non si sostituisce', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const takenAt = new Date('2026-03-01T09:30:00.000Z')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      gallery: Array.from({ length: 20 }, (_, index) => ({ id: `g${index}`, photo: `data:image/jpeg;base64,QQ${index}`, takenAt })),
    }))
    expect(listDogs(account.uid)[0].photo).toBe('data:image/jpeg;base64,QQ0')
    const photo = await import('../lib/dogPhoto')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockResolvedValue('data:image/jpeg;base64,nuova')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.upload(screen.getByLabelText('Foto'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    expect(await screen.findByText('Puoi caricare al massimo 20 foto per cane.')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    const saved = listDogs(account.uid)[0]
    expect(saved.photo).toBe('data:image/jpeg;base64,QQ0')
    expect(new Set([saved.photo, ...saved.gallery.map((item) => item.photo)]).size).toBe(20)
    spy.mockRestore()
  })

  it('una foto profilo troppo grande lo dice con il messaggio della foto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const photo = await import('../lib/dogPhoto')
    const { PhotoTooLargeError } = await import('../lib/photoCodec')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockRejectedValueOnce(new Error('no')).mockRejectedValueOnce(new PhotoTooLargeError())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.upload(screen.getByLabelText('Foto'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    expect(await screen.findByText('Foto non utilizzabile')).toBeInTheDocument()
    await user.upload(screen.getByLabelText('Foto'), new File([new Uint8Array([1])], 'b.png', { type: 'image/png' }))
    expect(await screen.findByText('La foto è troppo grande per essere salvata. Prova con un’altra immagine.')).toBeInTheDocument()
    expect(screen.queryByText('Foto non utilizzabile')).not.toBeInTheDocument()
    expect(listDogs(account.uid)[0].photo).toBeUndefined()
    spy.mockRestore()
  })

  it('una foto di galleria troppo grande lo dice con il messaggio della foto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const photo = await import('../lib/dogPhoto')
    const { PhotoTooLargeError } = await import('../lib/photoCodec')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockRejectedValue(new PhotoTooLargeError())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.upload(await screen.findByLabelText('Aggiungi alla galleria'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    expect(await screen.findByText('La foto è troppo grande per essere salvata. Prova con un’altra immagine.')).toBeInTheDocument()
    expect(screen.queryByText('Foto non utilizzabile')).not.toBeInTheDocument()
    expect(listDogs(account.uid)[0].gallery).toEqual([])
    spy.mockRestore()
  })

  it('una foto aggiunta da un altro telefono non finisce in removedPhotoIds se la scheda salva una galleria vecchia', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const takenAt = new Date('2026-03-01T09:30:00.000Z')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      photo: 'data:image/jpeg;base64,pro',
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,uno', takenAt }],
    }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    const map = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { gallery: unknown[] }>
    map[created.id].gallery.push({ id: 'g2', photo: 'file:altro', takenAt: takenAt.toISOString() })
    localStorage.setItem(storageKeys.dogs(account.uid), JSON.stringify(map))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(listDogs(account.uid)[0].removedPhotoIds ?? []).not.toContain('g2')
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

  it('Tornare agli animali abbandona una foto non salvata', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const photo = await import('../lib/dogPhoto')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockResolvedValue('data:image/jpeg;base64,abc')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.upload(screen.getByLabelText('Foto'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    await waitFor(() => expect(document.querySelector('img[src*="abc"]')).not.toBeNull())
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
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
    await user.click(within(await screen.findByRole('dialog', { name: 'Uscire da Groomly?' })).getByRole('button', { name: 'Esci' }))
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain('Bobi')
  })

  it('spezza l’avviso e toglie il cane insieme agli appuntamenti', async () => {
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
    const menu = screen.getByRole('dialog', { name: 'Scheda' })
    expect(within(menu).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(within(menu).getByRole('button', { name: 'Non più in cura' })).toHaveTextContent('Esce dagli attivi e resta in archivio')
    expect(within(menu).getByRole('button', { name: 'Deceduto' })).toHaveTextContent('Archivia la scheda e segna il decesso')
    expect(within(menu).getByRole('button', { name: 'Elimina definitivamente' })).toHaveTextContent('Cancella la scheda in modo permanente')
    await user.click(screen.getByRole('button', { name: 'Elimina definitivamente' }))
    const confirm = screen.getByRole('dialog', { name: 'Elimina definitivamente' })
    expect(within(confirm).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(within(confirm).getByText(/viene cancellato per sempre/)).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Annulla' }))
    expect(screen.getByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByText('Bobi')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain(created.id)
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Elimina definitivamente' }))
    await user.click(screen.getByRole('button', { name: 'Elimina definitivamente' }))
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).not.toContain(created.id)
    expect(localStorage.getItem(storageKeys.appointments(account.uid)) ?? '').not.toContain(created.id)
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Cane assente' })).not.toBeInTheDocument()
    expect(screen.queryByText('Bobi')).not.toBeInTheDocument()
  })

  it('un appuntamento rimasto di un cane già cancellato sparisce da home', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(10, 0, 0, 0)
    createAppointment(account.uid, {
      dogId: created.id,
      start,
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    deleteDog(account.uid, created.id)
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    await waitFor(() => {
      expect(localStorage.getItem(storageKeys.appointments(account.uid)) ?? '').not.toContain(created.id)
    })
    expect(screen.queryByRole('button', { name: 'Apri Cane assente' })).not.toBeInTheDocument()
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
    const menu = screen.getByRole('dialog', { name: 'Foto del profilo' })
    expect(within(menu).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(menu.parentElement?.getAttribute('style')).toContain('align-items: center')
    expect(menu.parentElement?.getAttribute('style')).not.toContain('align-items: flex-end')
    expect(within(menu).getByRole('img', { name: 'Anteprima foto del profilo' })).toHaveAttribute('src', 'data:image/jpeg;base64,abc')
    expect(within(menu).getByRole('button', { name: 'Cambia' })).toBeInTheDocument()
    expect(within(menu).getByRole('button', { name: 'Ingrandisci' })).toBeInTheDocument()
    await user.click(within(menu).getByRole('button', { name: 'Ingrandisci' }))
    const viewer = screen.getByRole('dialog', { name: (value) => value === 'Foto' })
    expect(within(viewer).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(viewer.parentElement?.getAttribute('style')).toContain('align-items: center')
    expect(viewer.getAttribute('style') ?? '').toMatch(/(^|[^-])height: calc\(100dvh - 32px\)/)
    const enlarged = within(viewer).getByRole('img', { name: 'Foto ingrandita' })
    expect(enlarged.getAttribute('style')).toContain('object-fit: contain')
    expect(enlarged).toHaveAttribute('src', 'data:image/jpeg;base64,abc')
    await user.click(within(viewer).getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog', { name: (value) => value === 'Foto' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Foto del cane' }))
    const input = screen.getByLabelText('Cambia foto')
    expect(input).not.toBeVisible()
    const spy = vi.spyOn(input, 'click')
    await user.click(screen.getByRole('button', { name: 'Cambia' }))
    expect(spy).toHaveBeenCalled()
    await user.upload(input, new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(await screen.findByText('Foto non utilizzabile')).toBeInTheDocument()
  })

  it('foto profilo e galleria dalla scheda si salvano senza riaprire la modifica', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      breed: 'Alano',
      contact: { name: 'Laura', phone: '333' },
    }))
    const photo = await import('../lib/dogPhoto')
    const spy = vi.spyOn(photo, 'prepareDogPhoto')
      .mockResolvedValueOnce('data:image/jpeg;base64,abc')
      .mockResolvedValueOnce('data:image/jpeg;base64,def')
      .mockResolvedValueOnce('data:image/jpeg;base64,gal')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('button', { name: 'Modifica' })).toBeInTheDocument()

    const portrait = document.querySelector('input[type="file"][aria-hidden="true"]') as HTMLInputElement
    await user.upload(portrait, new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)[created.id]
      expect(stored.photo).toBe('data:image/jpeg;base64,abc')
    })
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salva' })).not.toBeInTheDocument()
    expect(screen.getByText('Bobi')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Foto del cane' }))
    await user.upload(screen.getByLabelText('Cambia foto'), new File([new Uint8Array([2])], 'b.png', { type: 'image/png' }))
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)[created.id]
      expect(stored.photo).toBe('data:image/jpeg;base64,def')
      expect(stored.name).toBe('Bobi')
      expect(stored.breed).toBe('Alano')
    })
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()

    await user.upload(screen.getByLabelText('Aggiungi alla galleria'), new File([new Uint8Array([3])], 'c.png', { type: 'image/png' }))
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!)[created.id]
      expect(stored.gallery).toEqual([expect.objectContaining({ photo: 'data:image/jpeg;base64,gal' })])
      expect(stored.photo).toBe('data:image/jpeg;base64,def')
      expect(stored.contact).toEqual({ name: 'Laura', phone: '333' })
    })
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salva' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ingrandisci foto 1' }))
    const viewer = screen.getByRole('dialog', { name: (value) => value === 'Foto' })
    expect(within(viewer).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(viewer.parentElement?.getAttribute('style')).toContain('align-items: center')
    expect(viewer.parentElement?.getAttribute('style')).not.toContain('flex-end')
    const enlarged = within(viewer).getByRole('img', { name: 'Foto ingrandita' })
    expect(enlarged.getAttribute('style')).toContain('object-fit: contain')
    expect(enlarged).toHaveAttribute('src', 'data:image/jpeg;base64,gal')
    spy.mockRestore()
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
    await user.click(screen.getByRole('button', { name: 'Archivia e disdici i futuri' }))
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
    await user.click(screen.getByRole('button', { name: 'Archivia e disdici i futuri' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(writes).toBe(1)
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(dogs[created.id].status).toBe('non_in_cura')
    const raw = localStorage.getItem(storageKeys.appointments(account.uid))!
    expect(raw).toContain(first.id)
    expect(raw).toContain(second.id)
  })

  it('archivia e poi disdice, senza cancellare, solo i programmati futuri di quel cane', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Archivia e disdici i futuri' }))
    expect(await screen.findByText('Non più in cura')).toBeInTheDocument()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(dogs[created.id].status).toBe('non_in_cura')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; cancelReason?: string }>
    expect(stored[future.id]).toMatchObject({ status: 'disdetto', cancelReason: 'cliente' })
    expect(stored[past.id].status).toBe('programmato')
    expect(stored[done.id].status).toBe('completato')
    expect(stored[otherVisit.id].status).toBe('programmato')
  })

  it('Non più in cura offre ancora Archivia soltanto, che lascia gli appuntamenti come sono', async () => {
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
    const archive = screen.getByRole('dialog', { name: 'Non più in cura' })
    expect(within(archive).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(screen.getByText('1 appuntamento futuro.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archivia e disdici i futuri' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Archivia soltanto' }))
    expect(await screen.findByText('Non più in cura')).toBeInTheDocument()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(dogs[created.id].status).toBe('non_in_cura')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; cancelReason?: string }>
    expect(stored[future.id].status).toBe('programmato')
    expect(stored[future.id].cancelReason).toBeUndefined()
  })

  it('Deceduto dice quanti futuri sono, non offre Archivia soltanto e li disdice con il motivo deceduto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const line = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const first = createAppointment(account.uid, { dogId: created.id, start: new Date(2098, 0, 1, 10, 0, 0, 0), services: line })
    const second = createAppointment(account.uid, { dogId: created.id, start: new Date(2099, 0, 1, 10, 0, 0, 0), services: line })
    const past = createAppointment(account.uid, { dogId: created.id, start: new Date(2020, 0, 1, 10, 0, 0, 0), services: line })
    const done = createAppointment(account.uid, { dogId: created.id, start: new Date(2099, 5, 1, 10, 0, 0, 0), services: line })
    completeAppointment(account.uid, done.id)
    const before = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, unknown>
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Deceduto' }))
    expect(screen.getByText('2 appuntamenti futuri verranno disdetti.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /soltanto/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Annulla' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    const untouched = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(untouched[created.id].status).toBe('attivo')
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)).toEqual(before)
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Deceduto' }))
    await user.click(screen.getByRole('button', { name: 'Conferma' }))
    expect(await screen.findByText('Deceduto')).toBeInTheDocument()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(dogs[created.id].status).toBe('deceduto')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; cancelReason?: string }>
    expect(Object.keys(stored)).toHaveLength(4)
    expect(stored[first.id]).toMatchObject({ status: 'disdetto', cancelReason: 'deceduto' })
    expect(stored[second.id]).toMatchObject({ status: 'disdetto', cancelReason: 'deceduto' })
    expect(stored[done.id]).toEqual(before[done.id])
    expect(stored[past.id]).toEqual(before[past.id])
  })

  it('Deceduto senza futuri archivia subito', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Deceduto' }))
    expect(await screen.findByText('Deceduto')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conferma' })).not.toBeInTheDocument()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { status: string }>
    expect(dogs[created.id].status).toBe('deceduto')
  })

  it('un contatto aggiunto in modifica compare dopo Salva e entra nella searchKey', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', breed: 'Barboncino', contact: { name: 'Lea', phone: '333' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.click(screen.getByRole('button', { name: 'Aggiungi numero' }))
    const contatto = screen.getByRole('dialog', { name: 'Contatto' })
    expect(within(contatto).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(contatto.parentElement?.getAttribute('style')).toContain('align-items: center')
    expect(contatto.getAttribute('style') ?? '').toMatch(/border-radius:\s*18px(;|$)/)
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
    expect(screen.queryByRole('button', { name: 'Aggiungi numero' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Altri dettagli' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Prezzi personalizzati' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('radio', { name: 'Piccola' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Bravo' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Telefono')).toHaveAttribute('inputmode', 'tel')
    expect(screen.getByLabelText('Nome')).toHaveAttribute('autocapitalize', 'words')
    expect(document.querySelector('input[type="file"]')).not.toBeVisible()
    const pair = screen.getByLabelText('Razza').closest('[style*="grid-template-columns"]')!
    expect(pair.getAttribute('style')).toContain('minmax(0, 1fr) minmax(0, 1fr)')
    expect(pair).toContainElement(screen.getByLabelText('Nome'))
    expect(pair).not.toContainElement(screen.getByRole('radiogroup', { name: 'Taglia' }))
    expect(screen.getByLabelText('Proprietario').closest('[style*="grid-template-columns"]')).toContainElement(screen.getByLabelText('Telefono'))
    expect(screen.getByRole('link', { name: 'Torna agli animali' })).toBeInTheDocument()
    const salva = screen.getByRole('button', { name: 'Salva' })
    expect(salva.parentElement?.getAttribute('style')).toContain('position: sticky')
    expect(salva.parentElement?.getAttribute('style')).toContain('calc(72px + env(safe-area-inset-bottom, 0px))')
    expect(salva.parentElement?.getAttribute('style')).toContain(`padding: ${8}px ${12}px ${12}px`)
    expect(salva.parentElement?.getAttribute('style')).toContain('box-shadow: var(--sh-foot)')
  })

  it('mentre si scrive in un campo Salva non resta sopra i campi da compilare', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    const nome = await screen.findByLabelText('Nome')
    await user.click(nome)
    const salva = screen.getByRole('button', { name: 'Salva' })
    expect(salva.parentElement?.getAttribute('style')).toContain('position: static')
    expect(salva.parentElement?.getAttribute('style')).not.toContain('position: sticky')
    await user.click(screen.getByLabelText('Razza'))
    expect(salva.parentElement?.getAttribute('style')).not.toContain('position: sticky')
    await user.click(screen.getByRole('radio', { name: 'Media' }))
    await waitFor(() => expect(salva.parentElement?.getAttribute('style')).toContain('position: sticky'))
  })

  it('Salva resta sopra il ritorno alla lista anche in modifica', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    expect(screen.getByRole('link', { name: 'Torna agli animali' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salva' }).parentElement?.getAttribute('style')).toContain(
      'calc(72px + env(safe-area-inset-bottom, 0px))',
    )
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
    const bagno = screen.getByRole('group', { name: 'Bagno' })
    expect(bagno).toContainElement(price)
    expect(bagno.getAttribute('style')).toContain('grid-template-columns: 36px 1fr 76px 76px')
    expect(screen.queryByText('mostra nel profilo')).toBeNull()
    expect(within(bagno).getByText('Bagno').getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(within(bagno).getByText('Bagno').getAttribute('style') ?? '').not.toContain('ellipsis')
    await user.type(price, '25')
    await user.click(within(bagno).getByRole('switch', { name: 'mostra nel profilo' }))
    expect(price).not.toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const saved = listDogs(account.uid)[0]
    expect(saved.servicePrices).toEqual([{ serviceId: 'bagno', price: 25 }])
    expect(saved.hiddenServiceIds).toEqual(['bagno'])
  })

  it('un prezzo personalizzato già salvato si può cambiare e resta dopo aver lasciato la lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Fido',
      contact: { name: 'Usai', phone: '333' },
      hiddenServiceIds: ['bagno', 'dermatologico'],
      servicePrices: [
        { serviceId: 'bagno', price: 25 },
        { serviceId: 'dermatologico', price: 15 },
      ],
    }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByText('€ 25')).toBeInTheDocument()
    expect(screen.getByText('€ 15')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Prezzi personalizzati' }))
    const bagno = screen.getByLabelText('Prezzo Bagno')
    const derm = screen.getByLabelText('Prezzo Dermatologico')
    expect(bagno).toHaveValue('25')
    expect(derm).toHaveValue('15')
    await user.clear(bagno)
    await user.type(bagno, '40')
    await user.clear(derm)
    await user.type(derm, '22')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    expect(screen.getByText('€ 40')).toBeInTheDocument()
    expect(screen.getByText('€ 22')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
    await user.click(await screen.findByRole('link', { name: 'Home' }))
    await user.click(await screen.findByRole('link', { name: 'Animali' }))
    await user.click(await screen.findByRole('button', { name: 'Apri Fido' }))
    expect(await screen.findByText('€ 40')).toBeInTheDocument()
    expect(screen.getByText('€ 22')).toBeInTheDocument()
    const stored = listDogs(account.uid).find((dog) => dog.id === created.id)
    expect(stored?.servicePrices).toEqual([
      { serviceId: 'bagno', price: 40 },
      { serviceId: 'dermatologico', price: 22 },
    ])
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

  it('in scheda compaiono solo i servizi con lo switch acceso', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Tata',
      contact: { name: 'Roby', phone: '3336666' },
      hiddenServiceIds: ['bagno', 'nodi', 'scomparso'],
      servicePrices: [
        { serviceId: 'nodi', price: 8, durationMin: 25 },
        { serviceId: 'bagno', price: 25 },
        { serviceId: 'stripping', price: 40, durationMin: 90 },
      ],
    }))
    createDog(account.uid, write({ name: 'Nina', contact: { name: 'Lea', phone: '333' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Prezzi personalizzati' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Prezzi personalizzati' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual(['Bagno', 'Gestione nodi', 'scomparso'])
    expect(within(items[0]).getByText('€ 25')).toBeInTheDocument()
    expect(within(items[0]).getByText('—')).toBeInTheDocument()
    expect(within(items[1]).getByText('€ 8')).toBeInTheDocument()
    expect(within(items[1]).getByText('25 min')).toBeInTheDocument()
    expect(within(items[2]).getAllByText('—')).toHaveLength(2)
    expect(screen.queryByRole('listitem', { name: 'Stripping' })).toBeNull()
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
    await user.click(await screen.findByRole('button', { name: 'Apri Nina' }))
    expect(screen.queryByRole('heading', { name: 'Prezzi personalizzati' })).toBeNull()
  })

  it('i contatti in lettura sono righe compatte e Chiama sul nome', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Bobi',
      contact: { name: 'Lea', phone: '333' },
      contacts: [
        { id: 'a', name: 'Lea', role: 'Proprietaria', phone: '333', isPrimary: true },
        { id: 'b', name: 'Marco', role: 'Co-proprietario', phone: '444', isPrimary: false },
      ],
    }))
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    const primary = screen.getByText('333 · Proprietaria · Principale')
    expect(primary.getAttribute('style')).toContain('font-size: 11px')
    expect(primary.previousElementSibling?.getAttribute('style')).toContain('font-size: 12px')
    expect(screen.getByText('444 · Co-proprietario').getAttribute('style')).toContain('font-size: 11px')
    expect(screen.getByRole('link', { name: 'Chiama Lea' })).toHaveAttribute('href', 'tel:333')
    expect(screen.getByRole('link', { name: 'Chiama Marco' })).toHaveAttribute('href', 'tel:444')
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
    const down = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 9, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 18 }],
    })
    completeAppointment(account.uid, older.id)
    completeAppointment(account.uid, newer.id)
    completeAppointment(account.uid, down.id)
    const solo = createDog(account.uid, write({ name: 'Nina', contact: { name: 'Lea', phone: '333' } }))
    completeAppointment(account.uid, createAppointment(account.uid, {
      dogId: solo.id,
      start: new Date(2026, 8, 2, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    }).id)
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...settings,
      fieldLabels: { ...settings.fieldLabels, species: 'Tipo' },
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salva' })).toBeNull()
    const call = screen.getByRole('link', { name: 'Chiama' })
    const whats = screen.getByRole('button', { name: 'WhatsApp' })
    expect(call).toHaveAttribute('href', 'tel:333')
    expect(call.parentElement?.getAttribute('style')).toContain('grid-template-columns: 1fr 1fr')
    expect(call).toHaveTextContent('Chiama')
    expect(whats).toHaveTextContent('WhatsApp')
    expect(whats.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('Morde')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto del cane' }).getAttribute('style')).toContain('width: 92px')
    const book = screen.getByRole('button', { name: 'Fissa appuntamento' })
    expect(book.getAttribute('style')).toContain('background: var(--pri-s)')
    const facts = screen.getByRole('group', { name: 'Dati' })
    expect(facts.getAttribute('style')).toContain('display: grid')
    expect(facts.getAttribute('style')).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    expect(within(facts).getByText('Specie')).toBeInTheDocument()
    expect(within(facts).queryByText('Tipo')).not.toBeInTheDocument()
    expect(within(facts).getByText('Razza')).toBeInTheDocument()
    expect(within(facts).getByText('Barboncino')).toBeInTheDocument()
    expect(within(facts).getByText('Sesso')).toBeInTheDocument()
    expect(within(facts).getByText('Peso')).toBeInTheDocument()
    expect(within(facts).getByText('8,5 kg')).toBeInTheDocument()
    expect(within(facts).getByText('Taglia')).toBeInTheDocument()
    expect(within(facts).getByText('Cliente')).toBeInTheDocument()
    expect(within(facts).getByText('Occasionale')).toBeInTheDocument()
    expect(within(facts).getByText('Specie').getAttribute('style')).toContain('font-size: 9px')
    expect(within(facts).getByText('Specie').parentElement?.getAttribute('style') ?? '').not.toContain('flex-basis')
    expect(within(facts).getByText('Peso').parentElement?.getAttribute('style') ?? '').not.toContain('flex-basis')
    expect(within(facts).getByText('Razza').parentElement?.getAttribute('style') ?? '').not.toContain('flex-grow')
    const breed = within(facts).getByText('Barboncino')
    expect(breed.getAttribute('style')).toContain('font-size: 11px')
    expect(breed.getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(breed.getAttribute('style') ?? '').not.toContain('text-overflow')
    expect(breed.getAttribute('style') ?? '').not.toContain('nowrap')
    expect(breed.getAttribute('title')).toBeNull()
    expect(within(facts).getByText('Durata media')).toBeInTheDocument()
    expect(facts.compareDocumentPosition(screen.getByText('Morde')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Fissa appuntamento')).toBeInTheDocument()
    const historyTitle = screen.getByRole('heading', { name: /Storico/ })
    expect(within(historyTitle).getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('3 visite')).not.toBeInTheDocument()
    expect(screen.getByText('Altre 2 visite')).toBeInTheDocument()
    expect(screen.getByText('1 ott 2026')).toBeInTheDocument()
    expect(screen.getByText('Bagno')).toBeInTheDocument()
    expect(screen.queryByText('1 set 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('1 ago 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('▲ € 5')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Correggi prezzo/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Storico' }))
    expect(screen.getAllByText('1 ott 2026')).toHaveLength(1)
    expect(screen.getAllByText('Bagno')).toHaveLength(3)
    const up = screen.getByText('▲ € 5')
    expect(up).toHaveAccessibleName('Prezzo più alto del precedente')
    expect(up).toHaveTextContent('▲ € 5')
    const lower = screen.getByText('▼ € 7')
    expect(lower).toHaveAccessibleName('Prezzo più basso del precedente')
    expect(lower).toHaveTextContent('▼ € 7')
    expect(screen.queryByText('Rinomina Razza')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Dettagli' })).toBeNull()
    expect(screen.getByText('8,5 kg')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
    await user.click(await screen.findByRole('button', { name: 'Apri Nina' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByText('▲ € 5')).not.toBeInTheDocument()
    expect(screen.queryByText('▼', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByText('▲', { exact: false })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Torna agli animali' }))
    await user.click(await screen.findByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    expect(screen.getByRole('button', { name: 'Salva' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica' })).toBeNull()
  })

  it('lo storico in lettura mette le note sopra i prezzi e si apre in linea del tempo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Birba',
      notes: 'Ha paura del phon',
      hiddenServiceIds: ['bagno'],
    }))
    const recent = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 2, 12, 9),
      services: [{ serviceId: 'completo', name: 'Bagno e tosatura', durationMin: 60, price: 45 }],
    })
    const older = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 1, 28, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 32 }],
    })
    completeAppointment(account.uid, recent.id)
    completeAppointment(account.uid, older.id)
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { tools?: string[]; actualDurationMin?: number; photos?: { id: string; photo: string; kind: string }[] }>
    stored[recent.id].tools = ['Forbici']
    stored[recent.id].actualDurationMin = 55
    stored[recent.id].photos = [{ id: 'p1', photo: 'data:image/jpeg;base64,prima', kind: 'prima' }]
    localStorage.setItem(storageKeys.appointments(account.uid), JSON.stringify(stored))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    const page = await screen.findByRole('heading', { name: 'Scheda' })
    const root = page.closest('div')!.parentElement!.parentElement!.parentElement!
    const text = root.textContent ?? ''
    expect(text.indexOf('Note')).toBeLessThan(text.indexOf('Prezzi personalizzati'))
    expect(text.indexOf('Prezzi personalizzati')).toBeLessThan(text.indexOf('Storico'))
    const historyTitle = screen.getByRole('heading', { name: /Storico/ })
    expect(within(historyTitle).getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('2 visite')).not.toBeInTheDocument()
    expect(screen.getByText('Altra 1 visita')).toBeInTheDocument()
    expect(screen.getByText('Bagno e tosatura')).toBeInTheDocument()
    expect(screen.getByText('12 mar 2026')).toBeInTheDocument()
    expect(screen.queryByText('28 feb 2026')).not.toBeInTheDocument()
    const closed = screen.getByRole('button', { name: 'Storico' })
    expect(within(closed).queryByText('Bagno')).not.toBeInTheDocument()
    expect(within(closed).queryByRole('img', { name: 'Prima' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Correggi prezzo/ })).not.toBeInTheDocument()
    expect(screen.queryByText('▲', { exact: false })).not.toBeInTheDocument()
    await user.click(closed)
    const opened = root.textContent ?? ''
    expect(opened).toContain('Bagno e tosatura')
    expect(opened).toMatch(/€.*Forbici.*55m/)
    expect(opened.indexOf('12 mar 2026')).toBeLessThan(opened.indexOf('28 feb 2026'))
    expect(screen.getAllByText('Bagno e tosatura')).toHaveLength(1)
    expect(screen.getAllByText('12 mar 2026')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Prima' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Correggi prezzo 12 mar 2026' })).toBeInTheDocument()
  })

  it('un non venuto resta nello storico della scheda, senza cifra incassata né correzione', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Birba' }))
    const older = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 1, 28, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 40 }],
    })
    const missed = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 2, 5, 9),
      services: [{ serviceId: 'tosatura', name: 'Tosatura', durationMin: 45, price: 80 }],
    })
    const recent = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 2, 12, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 70 }],
    })
    completeAppointment(account.uid, older.id)
    setAppointmentStatus(account.uid, missed.id, 'non_venuto')
    completeAppointment(account.uid, recent.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: /Storico/ })).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: /Storico/ })).getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('2 visite · 1 non venuto')).not.toBeInTheDocument()
    expect(screen.getByText('Altre 2 visite')).toBeInTheDocument()
    expect(screen.getByText('12 mar 2026')).toBeInTheDocument()
    expect(screen.getAllByText('Bagno')).toHaveLength(1)
    expect(screen.queryByText('Tosatura')).not.toBeInTheDocument()
    expect(screen.queryByText('5 mar 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('Non venuto')).not.toBeInTheDocument()
    expect(screen.queryByText('▲', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Correggi prezzo/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Storico' }))
    const page = screen.getByRole('heading', { name: 'Scheda' })
    const root = page.closest('div')!.parentElement!.parentElement!.parentElement!
    const opened = root.textContent ?? ''
    expect(opened.indexOf('12 mar 2026')).toBeLessThan(opened.indexOf('5 mar 2026'))
    expect(opened.indexOf('5 mar 2026')).toBeLessThan(opened.indexOf('28 feb 2026'))
    expect(screen.getByText('Non venuto')).toBeInTheDocument()
    expect(screen.getByText('Tosatura')).toBeInTheDocument()
    expect(screen.queryByText('€ 80')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Correggi prezzo 5 mar 2026' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Correggi prezzo 12 mar 2026' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Prezzo più alto del precedente' })).toHaveTextContent('▲ € 30')
    expect(screen.getAllByText('12 mar 2026')).toHaveLength(1)
    expect(screen.getAllByText('Non venuto')).toHaveLength(1)
  })

  it('lo storico con solo un non venuto si apre', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Birba' }))
    const missed = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 2, 5, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 40 }],
    })
    setAppointmentStatus(account.uid, missed.id, 'non_venuto')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('button', { name: 'Storico' })).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: /Storico/ })).getByText('1')).toBeInTheDocument()
    expect(screen.queryByText('1 non venuto')).not.toBeInTheDocument()
    expect(screen.queryByText(/Altr/)).not.toBeInTheDocument()
    expect(screen.queryByText('Nessun trattamento')).not.toBeInTheDocument()
    expect(screen.getByText('5 mar 2026')).toBeInTheDocument()
    expect(screen.getByText('Bagno')).toBeInTheDocument()
    expect(screen.getByText('Non venuto')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Correggi prezzo 5 mar 2026' })).not.toBeInTheDocument()
    expect(screen.queryByText('€ 40')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Storico' }))
    expect(screen.getAllByText('Non venuto')).toHaveLength(1)
    expect(screen.getAllByText('Bagno')).toHaveLength(1)
    expect(screen.getAllByText('5 mar 2026')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Correggi prezzo 5 mar 2026' })).not.toBeInTheDocument()
    expect(screen.queryByText('€ 40')).not.toBeInTheDocument()
  })

  it('lo storico mostra la cifra incassata, la nota su una riga propria e la freccia sulle cifre incassate', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Birba' }))
    const older = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 1, 28, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 40 }],
    })
    const recent = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 2, 12, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 40 }],
    })
    completeAppointment(account.uid, older.id)
    completeAppointment(account.uid, recent.id)
    saveClose(account.uid, recent.id, { total: 70, actualDurationMin: 55, adjustmentNote: 'Pieno di nodi' }, false)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Storico' }))
    const note = screen.getByText('Pieno di nodi')
    const detail = screen.getByText(/^€ 70 · 55m/)
    expect(note).not.toBe(detail)
    expect(detail).not.toContainElement(note)
    expect(detail.textContent).not.toContain('Pieno di nodi')
    expect(screen.getByRole('img', { name: 'Prezzo più alto del precedente' })).toHaveTextContent('▲ € 30')
  })

  it('la matita dello storico apre Correggi, salva senza toccare il listino e chiede della scheda solo da lì', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Birba',
      servicePrices: [{ serviceId: 'bagno', price: 25 }],
    }))
    const visit = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 2, 12, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 40 }],
    })
    completeAppointment(account.uid, visit.id)
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[visit.id] as {
      total?: number
      adjustmentNote?: string
      services: { price: number }[]
    }
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Storico' }))
    await user.click(screen.getByRole('button', { name: 'Correggi prezzo 12 mar 2026' }))
    expect(screen.queryByLabelText('Prezzo appuntamento')).not.toBeInTheDocument()
    const dialog = screen.getByRole('dialog', { name: 'Correggi' })
    expect(within(dialog).getByLabelText('Prezzo')).toHaveValue('40')
    const price = within(dialog).getByLabelText('Prezzo')
    await user.clear(price)
    await user.type(price, '70')
    await user.type(within(dialog).getByLabelText('Nota'), 'Pieno di nodi')
    await user.click(within(dialog).getByRole('button', { name: 'POS' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Correggi' })).not.toBeInTheDocument())
    expect(stored()).toMatchObject({ total: 70, adjustmentNote: 'Pieno di nodi' })
    expect(stored().services[0].price).toBe(40)
    expect(listDogs(account.uid)[0].servicePrices).toEqual([{ serviceId: 'bagno', price: 25 }])
    expect(screen.getByRole('button', { name: 'Solo questo appuntamento' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aggiorna anche il prezzo in scheda' }))
    await waitFor(() => expect(listDogs(account.uid)[0].servicePrices.find((item) => item.serviceId === 'bagno')?.price).toBe(70))
    expect(stored().services[0].price).toBe(40)
    expect(screen.queryByRole('button', { name: 'Solo questo appuntamento' })).not.toBeInTheDocument()
  })

  it('«Solo questo appuntamento» lascia il prezzo in scheda e senza prezzo personale la domanda compare', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Birba' }))
    const visit = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 2, 12, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 40 }],
    })
    completeAppointment(account.uid, visit.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Storico' }))
    await user.click(screen.getByRole('button', { name: 'Correggi prezzo 12 mar 2026' }))
    const dialog = screen.getByRole('dialog', { name: 'Correggi' })
    const price = within(dialog).getByLabelText('Prezzo')
    await user.clear(price)
    await user.type(price, '55')
    await user.type(within(dialog).getByLabelText('Nota'), 'Pelo infeltrito')
    await user.click(within(dialog).getByRole('button', { name: 'POS' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    await user.click(await screen.findByRole('button', { name: 'Solo questo appuntamento' }))
    expect(screen.queryByRole('button', { name: 'Aggiorna anche il prezzo in scheda' })).not.toBeInTheDocument()
    expect(listDogs(account.uid)[0].servicePrices).toEqual([])
  })

  it('la matita dello storico non chiede della scheda se la cifra è uguale al prezzo del cane o i servizi sono più d\'uno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({
      name: 'Birba',
      servicePrices: [{ serviceId: 'bagno', price: 70 }],
    }))
    const same = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 2, 12, 9),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 40 }],
    })
    const many = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 1, 28, 9),
      services: [
        { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 },
        { serviceId: 'nodi', name: 'Gestione nodi', durationMin: 15, price: 10 },
      ],
    })
    completeAppointment(account.uid, same.id)
    completeAppointment(account.uid, many.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Storico' }))
    for (const [when, value] of [['12 mar 2026', '70'], ['28 feb 2026', '45']]) {
      await user.click(screen.getByRole('button', { name: `Correggi prezzo ${when}` }))
      const dialog = screen.getByRole('dialog', { name: 'Correggi' })
      const price = within(dialog).getByLabelText('Prezzo')
      await user.clear(price)
      await user.type(price, value)
      await user.type(within(dialog).getByLabelText('Nota'), 'Pelo infeltrito')
      await user.click(within(dialog).getByRole('button', { name: 'POS' }))
      await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Correggi' })).not.toBeInTheDocument())
      expect(screen.queryByRole('button', { name: 'Solo questo appuntamento' })).not.toBeInTheDocument()
    }
    expect(listDogs(account.uid)[0].servicePrices).toEqual([{ serviceId: 'bagno', price: 70 }])
  })

  it('lo storico senza visite non è un bottone', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Nina' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Storico' })).not.toBeInTheDocument()
    expect(screen.getByText('Nessun trattamento')).toBeInTheDocument()
    await user.click(screen.getByText('Storico'))
    expect(screen.queryByRole('button', { name: 'Storico' })).not.toBeInTheDocument()
    expect(screen.queryByText('Bagno')).not.toBeInTheDocument()
    expect(screen.queryByText('Bagno e tosatura')).not.toBeInTheDocument()
  })

  it('sul telefono WhatsApp apre l’app', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined)
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', contact: { name: 'Lea', phone: '333' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'WhatsApp' }))
    await user.click(await screen.findByRole('link', { name: 'Apri WhatsApp' }))
    expect(assign).toHaveBeenCalledWith(expect.stringMatching(/^whatsapp:\/\/send\?phone=39333&text=/))
    assign.mockImplementation(() => {
      throw new Error('manca')
    })
    await user.click(screen.getByRole('link', { name: 'Apri WhatsApp' }))
    expect(await screen.findByRole('status')).toHaveTextContent('WhatsApp non si apre')
  })

  it('un contatto nuovo parte senza ruolo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', contact: { name: 'Lea', phone: '333' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.click(screen.getByRole('button', { name: 'Aggiungi numero' }))
    expect(screen.getByRole('button', { name: 'Proprietaria' })).toHaveAttribute('aria-pressed', 'false')
    await user.type(screen.getByLabelText('Nome contatto'), 'Giulia')
    await user.type(screen.getByLabelText('Telefono contatto'), '555')
    await user.click(screen.getByRole('button', { name: 'Aggiungi contatto' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const saved = listDogs(account.uid)[0]
    expect(saved.contacts.find((contact) => contact.name === 'Giulia')?.role).toBe('')
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

  it('un proprietario di nome Roberto non viene segnato Proprietaria', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'QAtest2')
    await user.type(screen.getByLabelText('Proprietario'), 'Roberto QA')
    await user.type(screen.getByLabelText('Telefono'), '3331234567')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('QAtest2 salvato')).toBeInTheDocument()
    const saved = listDogs(account.uid)[0]
    expect(saved.contacts.find((contact) => contact.isPrimary)?.role).toBe('Proprietario')
    expect(screen.getByText('3331234567 · Proprietario · Principale')).toBeInTheDocument()
    expect(screen.queryByText(/Proprietaria/)).not.toBeInTheDocument()
  })

  it('un contatto aggiunto in creazione resta accanto al proprietario', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Fido')
    await user.type(screen.getByLabelText('Proprietario'), 'Usai')
    await user.type(screen.getByLabelText('Telefono'), '3452424242')
    await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
    await user.click(screen.getByRole('button', { name: 'Aggiungi numero' }))
    await user.type(screen.getByLabelText('Nome contatto'), 'Giulia')
    await user.type(screen.getByLabelText('Telefono contatto'), '555')
    await user.click(screen.getByRole('button', { name: 'Aggiungi contatto' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Fido salvato')).toBeInTheDocument()
    const saved = listDogs(account.uid)[0]
    expect(saved.contacts).toHaveLength(2)
    expect(saved.contacts.find((contact) => contact.isPrimary)).toMatchObject({ name: 'Usai', phone: '3452424242', role: 'Proprietario' })
    expect(saved.contacts.find((contact) => contact.name === 'Giulia')).toMatchObject({ phone: '555', role: '', isPrimary: false })
    expect(saved.contact).toMatchObject({ name: 'Usai', phone: '3452424242' })
  })

  it('la scheda in lettura non offre più Aggiungi nota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', criticalNote: 'Mordace' }))
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByText('Mordace')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aggiungi nota' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
  })

  it('il collaboratore non archivia, non segna deceduto e non elimina il cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()

    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    const menuButton = screen.queryByRole('button', { name: 'Menu' })
    if (menuButton) await user.click(menuButton)
    expect(screen.queryByRole('button', { name: 'Non più in cura' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deceduto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Elimina definitivamente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    expect(screen.getByRole('button', { name: 'Salva' })).toBeInTheDocument()

    cleanup()
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const ownerMenu = screen.getByRole('dialog', { name: 'Scheda' })
    expect(within(ownerMenu).getByRole('button', { name: 'Non più in cura' })).toBeInTheDocument()
    expect(within(ownerMenu).getByRole('button', { name: 'Deceduto' })).toBeInTheDocument()
    expect(within(ownerMenu).getByRole('button', { name: 'Elimina definitivamente' })).toBeInTheDocument()

    cleanup()
    writeJson(storageKeys.auth, { ...account, role: 'socio' })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const partnerMenu = screen.getByRole('dialog', { name: 'Scheda' })
    expect(within(partnerMenu).getByRole('button', { name: 'Non più in cura' })).toBeInTheDocument()
    expect(within(partnerMenu).getByRole('button', { name: 'Deceduto' })).toBeInTheDocument()
    expect(within(partnerMenu).getByRole('button', { name: 'Elimina definitivamente' })).toBeInTheDocument()

    archiveDog(account.uid, created.id, 'non_in_cura')
    cleanup()
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ripristina' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Elimina definitivamente' })).not.toBeInTheDocument()

    cleanup()
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ripristina' })).toBeInTheDocument()

    cleanup()
    writeJson(storageKeys.auth, { ...account, role: 'socio' })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ripristina' })).toBeInTheDocument()
  })

  it('in inglese il titolo, il vuoto e il pulsante cambiano e il nome del cane resta', async () => {
    localStorage.setItem('groomly.lingua', 'en')
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Luna' }))
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('heading', { name: 'Dogs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Luna' })).toBeInTheDocument()
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Animali' })).not.toBeInTheDocument()
    cleanup()
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'en')
    await createAccount('vuoto@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('button', { name: 'Add the first animal' })).toBeInTheDocument()
  })

  it('in inglese la scheda ha titolo e pulsante nuovi e il nome del cane resta', async () => {
    localStorage.setItem('groomly.lingua', 'en')
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Luna' }))
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Record' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.getByText('No appointments')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to dogs' })).toBeInTheDocument()
    expect(screen.getByText(/Owner/)).toBeInTheDocument()
    expect(screen.queryByText(/Proprietario/)).not.toBeInTheDocument()
    expect(screen.queryByText('Nessun appuntamento')).not.toBeInTheDocument()
    expect(screen.queryByText('Salvataggio non riuscito')).not.toBeInTheDocument()
    cleanup()
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'en')
    await createAccount('vuoto-scheda@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali/assente" />)
    expect(await screen.findByRole('heading', { name: 'Record' })).toBeInTheDocument()
    expect(screen.getByText('Dog missing')).toBeInTheDocument()
  })
})
