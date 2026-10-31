// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  const { statoPiano } = await import('../lib/piano')
  return {
    ...actual,
    usePiano: () => ({ ...actual.usePiano(), stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, new Date()) }),
  }
})

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

  it('con l’affidabilità accesa mostra il riquadro con il numero di assenze', async () => {
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
    const avviso = await screen.findByRole('alert')
    expect(avviso).toHaveTextContent('Often does not come')
    expect(avviso).toHaveTextContent('Missed 3 visits in the last 6 months')
    expect(screen.queryByText('Spesso non viene')).not.toBeInTheDocument()
  })
})
