// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import { loadPushPrefs } from '../data/pushPrefs'
import type { DogWrite } from '../types/models'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...extra,
  }
}

function seedDueMensili(uid: string) {
  const rex = createDog(uid, dog('Rex', { clientType: 'mensile' }))
  const luna = createDog(uid, dog('Luna', { clientType: 'mensile' }))
  for (const item of [rex, luna]) {
    const appt = createAppointment(uid, {
      dogId: item.id,
      start: new Date(2026, 7, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(uid, appt.id)
  }
}

describe('pagina notifiche', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('mostra promemoria mensili e lo stato attuale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedDueMensili(account.uid)
    render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    expect(await screen.findByRole('heading', { name: 'Notifiche' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Promemoria mensili' })).toBeInTheDocument()
    expect(screen.getByText(/Alle 18:30 il telefono avvisa/)).toBeInTheDocument()
    expect(screen.getByText(/2 mensili da programmare: Rex, Luna/)).toBeInTheDocument()
    expect(screen.getByText(/Adesso direbbe:/)).toBeInTheDocument()
    expect(screen.getByText('Il riquadro in Home resta anche con la notifica spenta.')).toBeInTheDocument()
    expect(screen.getByText('Vale per la notifica e per il riquadro in Home.')).toBeInTheDocument()
  })

  it('salva toggle e giorni di anticipo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile' }))
    const done = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 7, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, done.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    await screen.findByRole('heading', { name: 'Notifiche' })
    expect(screen.getByText('Notifica sul telefono')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Notifica sul telefono' })).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Notifica sul telefono' }))
    expect(getSettings(account.uid).monthlyReminder.enabled).toBe(false)
    await user.clear(screen.getByLabelText('Giorni di anticipo'))
    await user.type(screen.getByLabelText('Giorni di anticipo'), '3')
    expect(getSettings(account.uid).monthlyReminder.daysBefore).toBe(3)
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('region', { name: 'Mensili da programmare' })).toBeInTheDocument()
    expect(screen.getByText('scadono entro 3 gg')).toBeInTheDocument()
  })

  it('sceglie quali notifiche push ricevere e quando completare', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    await screen.findByRole('heading', { name: 'Notifiche' })

    expect(screen.getByRole('heading', { name: 'Notifiche push' })).toBeInTheDocument()
    expect(screen.getByText('Arrivano sul telefono, anche con Groomly chiusa. Non spostano i riquadri in Home.')).toBeInTheDocument()
    expect(screen.getByText('Aggiornamenti')).toBeInTheDocument()
    expect(screen.getByText('Da completare')).toBeInTheDocument()
    expect(screen.getByLabelText('Minuti dopo la fine')).toHaveValue(60)
    expect(screen.getByText('Vale solo per questa push. In Home, Da chiudere resta un’ora dopo la fine.')).toBeInTheDocument()
    expect(screen.getByText('Da questo browser non partono.')).toBeInTheDocument()
    expect(screen.getByText('Notifica sul telefono')).toBeInTheDocument()

    const master = screen.getByRole('switch', { name: 'Notifiche push' })
    const updates = screen.getByRole('switch', { name: 'Aggiornamenti' })
    const complete = screen.getByRole('switch', { name: 'Da completare' })
    expect(master).toHaveAttribute('aria-checked', 'false')
    expect(updates).toHaveAttribute('aria-disabled', 'true')
    expect(complete).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByLabelText('Minuti dopo la fine')).toBeDisabled()

    await user.click(updates)
    expect(loadPushPrefs(account.uid).updates).toBe(true)
    await user.click(master)
    expect(updates).not.toHaveAttribute('aria-disabled')
    expect(complete).not.toHaveAttribute('aria-disabled')
    await user.click(updates)
    await user.click(complete)
    expect(loadPushPrefs(account.uid)).toMatchObject({ enabled: true, updates: false, complete: false })

    const minutes = screen.getByLabelText('Minuti dopo la fine')
    await user.clear(minutes)
    await user.type(minutes, '15')
    expect(loadPushPrefs(account.uid).completeAfterMin).toBe(15)
    view.rerender(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    expect(screen.getByLabelText('Minuti dopo la fine')).toHaveValue(15)

    localStorage.removeItem(`groomly.pushPrefs.${account.uid}`)
    view.unmount()
    render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    const defaultMinutes = await screen.findByLabelText('Minuti dopo la fine')
    await user.click(screen.getByRole('switch', { name: 'Notifiche push' }))
    await user.clear(defaultMinutes)
    await user.type(defaultMinutes, 'a')
    expect(defaultMinutes).toHaveValue(60)
    expect(loadPushPrefs(account.uid).completeAfterMin).toBe(60)
    expect(screen.getByText('Sul telefono: «È pronta la versione 1.2.0».')).toBeInTheDocument()
    expect(screen.getByText('Sul telefono: «C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento».')).toBeInTheDocument()
  })

  it('senza mensili in scadenza spiega che non parte la notifica', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    expect(await screen.findByRole('heading', { name: 'Notifiche' })).toBeInTheDocument()
    expect(
      screen.getByText('Adesso non parte nessuna notifica, perché non c’è un mensile in ritardo o in scadenza.'),
    ).toBeInTheDocument()
  })
})

describe('notifiche in impostazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('mostra la riga Notifiche al posto del blocco promemoria', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedDueMensili(account.uid)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Promemoria mensili' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Promemoria mensili' })).not.toBeInTheDocument()
    expect(screen.getByText('Notifiche')).toBeInTheDocument()
    expect(screen.getByText('Promemoria mensile alle 18:30 · Push spente')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Notifiche/ }))
    await screen.findByRole('heading', { name: 'Notifiche' })
    await user.click(screen.getByRole('switch', { name: 'Notifica sul telefono' }))
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByText('Promemoria mensile spento · Push spente')).toBeInTheDocument()
  })
})
