// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { Providers } from '../app/providers'
import { createAppointment, setAppointmentStatus } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { PianoValore } from '../hooks/usePiano'
import { statoPiano } from '../lib/piano'
import { StrumentiPage } from './PianoPagine'
import type { DogWrite } from '../types/models'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

function pianoPro(): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: false,
    stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, new Date(2026, 9, 27)),
    funzioni: {},
    provaUsata: true,
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall: () => undefined,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
  }
}

describe('strumenti gratuiti', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('sono spenti e non aggiungono pulsanti sulla home', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const impostazioni = render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Il tuo piano' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Strumenti/ }))
    expect(await screen.findByRole('heading', { name: 'Strumenti' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Messaggi WhatsApp' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('WhatsApp automatico')).toBeInTheDocument()
    expect(screen.getAllByText('In sviluppo')).toHaveLength(2)
    expect(screen.getByText('WhatsApp automatico').closest('button')).toBeNull()
    expect(screen.getByText('Richiamo').closest('button')).toBeNull()
    expect(screen.getByRole('switch', { name: 'Affidabilità' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Note vocali' })).toHaveAttribute('aria-checked', 'false')
    impostazioni.unmount()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Promemoria WhatsApp' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).strumenti).toBeUndefined()
  })

  it('con i messaggi accesi si sceglie la lingua del messaggio per quel numero', async () => {
    const account = await createAccount('giulia@salone.it', 'segretissimo')
    const cane: DogWrite = {
      name: 'Luna',
      species: 'cane',
      breed: 'Barbone',
      ageCategory: 'adulto',
      size: 'piccola',
      temperament: 'bravo',
      clientType: 'occasionale',
      contact: { name: 'Giulia', phone: '333 1234567' },
    }
    const dog = createDog(account.uid, cane)
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, strumenti: { messaggi: true } })
    const user = userEvent.setup()
    const prima = render(<App memory isDev={false} initialPath={`/animali/${dog.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'WhatsApp' }))
    const link = await screen.findByRole('link', { name: 'Apri WhatsApp' })
    const href = link.getAttribute('href') ?? ''
    expect(href.startsWith('https://wa.me/393331234567?text=')).toBe(true)
    const testo = decodeURIComponent(href.slice(href.indexOf('text=') + 5))
    expect(testo).toContain('Ciao Giulia')
    expect(screen.getByRole('radiogroup', { name: 'Lingua del messaggio' })).toBeInTheDocument()
    expect(screen.getByText('Puoi scriverlo nella lingua di questo cliente, anche se è un turista.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Italiano' })).toHaveAttribute('aria-checked', 'true')
    const area = screen.getByRole('textbox', { name: 'Messaggi WhatsApp' })
    await user.clear(area)
    await user.type(area, 'Testo mio')
    await user.click(screen.getByRole('radio', { name: 'English' }))
    const dopo = screen.getByRole('link', { name: 'Apri WhatsApp' }).getAttribute('href') ?? ''
    const testoInglese = decodeURIComponent(dopo.slice(dopo.indexOf('text=') + 5))
    expect(dopo.startsWith('https://wa.me/393331234567?text=')).toBe(true)
    expect(testoInglese).toContain('Hi Giulia')
    expect(testoInglese).toContain('just a reminder')
    expect(testoInglese).not.toContain('Made with Groomly')
    expect(testoInglese).not.toContain('Fatto con')
    expect(testoInglese).not.toContain('Testo mio')
    const scelta = screen.getByRole('radio', { name: 'English' })
    expect(scelta).toHaveAttribute('aria-checked', 'true')
    expect(scelta.getAttribute('style')).toContain('background: var(--pri-s)')
    expect(scelta.getAttribute('style')).toContain('border-color: var(--pri)')
    expect(scelta.getAttribute('style')).toContain('min-height: 48px')
    expect(scelta.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    const aperto = screen.getByRole('link', { name: 'Apri WhatsApp' })
    expect(aperto.getAttribute('style')).toContain('background: var(--pri-solid)')
    expect(aperto.getAttribute('style')).toContain('color: var(--on-pri)')
    expect(aperto.getAttribute('style')).toContain('text-decoration: none')
    expect(aperto.getAttribute('style')).toContain('min-height: 48px')
    expect(aperto.getAttribute('style')).toContain('width: 100%')
    expect(screen.getByRole('radio', { name: 'Promemoria' }).getAttribute('style')).toContain('min-height: 44px')
    expect(screen.getByRole('dialog', { name: 'Messaggi WhatsApp' })).toBeInTheDocument()
    expect(localStorage.getItem('groomly.linguaMessaggio.393331234567')).toBe('en')
    expect(getSettings(account.uid).linguaClienti).toBeUndefined()
    prima.unmount()

    render(<App memory isDev={false} initialPath={`/animali/${dog.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'WhatsApp' }))
    expect(await screen.findByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
    const riaperto = screen.getByRole('link', { name: 'Apri WhatsApp' }).getAttribute('href') ?? ''
    const testoRicordato = decodeURIComponent(riaperto.slice(riaperto.indexOf('text=') + 5))
    expect(testoRicordato).toContain('Hi Giulia')
    expect(testoRicordato).toContain('just a reminder')
    expect(testoRicordato).not.toContain('Made with Groomly')
  })

  it('con l’affidabilità accesa mostra la frase e senza note vocali non c’è il microfono', async () => {
    localStorage.setItem('groomly.lingua', 'en')
    const account = await createAccount('ada@salone.it', 'segretissimo')
    const dog = createDog(account.uid, {
      name: 'Luna',
      species: 'cane',
      breed: '',
      ageCategory: 'adulto',
      size: 'piccola',
      temperament: 'bravo',
      clientType: 'occasionale',
      contact: { name: 'Giulia', phone: '333 1234567' },
    })
    const inizio = new Date()
    inizio.setMonth(inizio.getMonth() - 1)
    for (let indice = 0; indice < 3; indice += 1) {
      const visita = createAppointment(account.uid, {
        dogId: dog.id,
        start: new Date(inizio.getTime() - indice * 86400000),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 10 }],
      })
      setAppointmentStatus(account.uid, visita.id, 'non_venuto')
    }
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, strumenti: { affidabilita: true } })
    render(<App memory isDev={false} initialPath={`/animali/${dog.id}`} />)
    expect(await screen.findByText('Often does not come')).toBeInTheDocument()
    expect(screen.queryByText('Spesso non viene')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Voice notes' })).not.toBeInTheDocument()
  })

  it('con le note vocali accese e un microfono compare il pulsante', async () => {
    vi.stubGlobal('MediaRecorder', class MediaRecorder {})
    const account = await createAccount('nino@salone.it', 'segretissimo')
    const dog = createDog(account.uid, {
      name: 'Luna',
      species: 'cane',
      breed: '',
      ageCategory: 'adulto',
      size: 'piccola',
      temperament: 'bravo',
      clientType: 'occasionale',
      contact: { name: 'Giulia', phone: '333' },
    })
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, strumenti: { noteVocali: true } })
    render(<App memory isDev={false} initialPath={`/animali/${dog.id}`} />)
    expect(await screen.findByRole('button', { name: 'Note vocali' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('controlli Pro', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('la pagina Strumenti non mostra la Pagella', async () => {
    await createAccount('paola@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/strumenti" />)
    expect(await screen.findByRole('heading', { name: 'Strumenti' })).toBeInTheDocument()
    expect(screen.queryByText('Pagella')).not.toBeInTheDocument()
    expect(screen.queryByText('Statistiche')).not.toBeInTheDocument()
    expect(screen.queryByText('Email')).not.toBeInTheDocument()
    expect(screen.queryByText('Copie delle foto')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Cane pronto' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('button', { name: 'Informazioni su Promemoria' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Prenotazioni online' })).toHaveAttribute('aria-checked', 'false')
    // WhatsApp automatico ora sta tra i servizi Pro, come riga in sviluppo.
    expect(screen.getByText('WhatsApp automatico')).toBeInTheDocument()
  })

  it('il collaboratore vede il chip e il tocco non apre il foglio', async () => {
    const account = await createAccount('leo@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/strumenti" />)
    expect(await screen.findByRole('heading', { name: 'Strumenti' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Promemoria' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByRole('switch')[0]).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('switch', { name: 'Promemoria' }))
    expect(screen.queryByRole('dialog', { name: 'Promemoria' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).serviziEmail?.promemoria).toBeUndefined()
  })

  it('il titolare accende il servizio e la fedeltà scrive anche il flag della scheda', async () => {
    const account = await createAccount('ada@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    pianoForzato.valore = pianoPro()
    const user = userEvent.setup()
    render(
      <Providers>
        <MemoryRouter>
          <StrumentiPage />
        </MemoryRouter>
      </Providers>,
    )
    expect(await screen.findByRole('heading', { name: 'Strumenti' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Informazioni su Promemoria' }))
    expect(await screen.findByRole('dialog', { name: 'Promemoria' })).toHaveTextContent('Manda da solo un promemoria alla proprietaria prima dell’appuntamento.')
    await user.click(screen.getByRole('button', { name: 'Ho capito' }))
    await user.click(screen.getByRole('switch', { name: 'Promemoria' }))
    expect(getSettings(account.uid).serviziEmail?.promemoria).toEqual({ modo: 'automatico', anticipoGiorni: 1, ora: '18:00' })
    expect(screen.getByRole('radio', { name: 'Due giorni prima' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ora')).toHaveAttribute('type', 'time')
    await user.click(screen.getByRole('radio', { name: 'Due giorni prima' }))
    expect(getSettings(account.uid).serviziEmail?.promemoria).toEqual({ modo: 'automatico', anticipoGiorni: 2, ora: '18:00' })
    await user.click(screen.getByRole('switch', { name: 'Cane pronto' }))
    await user.click(await screen.findByRole('button', { name: 'Automatico. La mail parte da sola.' }))
    expect(getSettings(account.uid).serviziEmail?.pronto).toEqual({ modo: 'automatico' })
    expect(screen.getByRole('button', { name: 'Automatico' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Automatico' }))
    expect(screen.getByRole('button', { name: 'Manuale. Te lo chiede quando premi Completato.' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Manuale' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Tessera fedeltà' }))
    expect(getSettings(account.uid).fedeltaAccesa).toBe(true)
    expect(getSettings(account.uid).serviziEmail?.fedelta).toEqual({ modo: 'manuale' })
    await user.click(screen.getByRole('switch', { name: 'Tessera fedeltà' }))
    expect(getSettings(account.uid).fedeltaAccesa).toBe(false)
    expect(getSettings(account.uid).serviziEmail?.fedelta).toEqual({ modo: 'spento' })
  })
})
