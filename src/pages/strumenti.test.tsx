// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAppointment, setAppointmentStatus } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'

describe('strumenti gratuiti', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sono spenti e non aggiungono pulsanti sulla home', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const impostazioni = render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Il tuo piano' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Strumenti' }))
    expect(await screen.findByRole('heading', { name: 'Strumenti' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Messaggi WhatsApp' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Affidabilità' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Note vocali' })).toHaveAttribute('aria-checked', 'false')
    impostazioni.unmount()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Promemoria WhatsApp' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).strumenti).toBeUndefined()
  })

  it('con i messaggi accesi il link ha il numero e la lingua dei clienti', async () => {
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
    writeJson(storageKeys.settings(account.uid), { ...settings, linguaClienti: 'en', strumenti: { messaggi: true } })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${dog.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Messaggi WhatsApp' }))
    const link = await screen.findByRole('link', { name: 'Apri WhatsApp' })
    const href = link.getAttribute('href') ?? ''
    expect(href.startsWith('https://wa.me/393331234567?text=')).toBe(true)
    const testo = decodeURIComponent(href.slice(href.indexOf('text=') + 5))
    expect(testo).toContain('Hello Giulia')
    expect(testo).toContain('Made with Groomly')
    expect(testo).not.toContain('Fatto con')
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
