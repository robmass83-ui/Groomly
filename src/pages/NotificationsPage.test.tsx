// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('mostra i tre avvisi in una card, senza paragrafi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedDueMensili(account.uid)
    render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    expect(await screen.findByRole('heading', { name: 'Notifiche' })).toBeInTheDocument()
    expect(screen.getByText('Mensili in scadenza')).toBeInTheDocument()
    expect(screen.getByText('Nuova versione')).toBeInTheDocument()
    expect(screen.getByText('Da chiudere')).toBeInTheDocument()
    expect(screen.getByLabelText('Orario')).toHaveValue('18:30')
    expect(screen.getByText('7 giorni prima')).toBeInTheDocument()
    expect(screen.getByText('60 min dopo')).toBeInTheDocument()
    expect(screen.getByText('1 ora')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Promemoria mensili' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Notifiche push' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Alle 18:30 il telefono avvisa/)).not.toBeInTheDocument()
    expect(screen.queryByText(/2 mensili da programmare/)).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Notifiche push' })).not.toBeInTheDocument()
  })

  it('apre la spiegazione e la chiude con Ho capito o fuori dal popup', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    await screen.findByRole('heading', { name: 'Notifiche' })

    await user.click(screen.getByRole('button', { name: 'Informazioni su Mensili in scadenza' }))
    const mensili = await screen.findByRole('dialog', { name: 'Mensili in scadenza' })
    expect(mensili).toHaveTextContent('Ricevi una notifica push per i cani con abbonamento mensile che non hanno ancora un appuntamento fissato e il cui periodo mensile sta per scadere. Puoi impostare l\'orario e con quanti giorni di anticipo ricevere l\'avviso.')
    await user.click(screen.getByRole('button', { name: 'Ho capito' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Informazioni su Nuova versione' }))
    const versione = await screen.findByRole('dialog', { name: 'Nuova versione' })
    expect(versione).toHaveTextContent('Ricevi una notifica push quando è disponibile un nuovo aggiornamento dell\'app.')
    await user.click(screen.getByTestId('dialog-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Informazioni su Da chiudere' }))
    const chiudere = await screen.findByRole('dialog', { name: 'Da chiudere' })
    expect(chiudere).toHaveTextContent('Ricevi una notifica push che ti ricorda di chiudere un appuntamento quando l\'orario fissato è già passato. Puoi impostare dopo quanto tempo ricevere il promemoria.')
    await user.click(screen.getByRole('button', { name: 'Ho capito' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('salva l\'avviso mensile e i giorni, anche con l\'avviso spento', async () => {
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
    fireEvent.change(screen.getByLabelText('Orario'), { target: { value: '09:15' } })
    expect(getSettings(account.uid).monthlyReminder.time).toBe('09:15')
    await user.click(screen.getByRole('switch', { name: 'Mensili in scadenza' }))
    expect(getSettings(account.uid).monthlyReminder.enabled).toBe(false)
    expect(screen.getByLabelText('Orario')).toBeDisabled()
    for (let step = 0; step < 4; step += 1) await user.click(screen.getByRole('button', { name: 'Meno giorni' }))
    expect(getSettings(account.uid).monthlyReminder.daysBefore).toBe(3)
    expect(screen.getByText('3 giorni prima')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Più giorni' }))
    expect(getSettings(account.uid).monthlyReminder.daysBefore).toBe(4)
    await user.click(screen.getByRole('button', { name: 'Meno giorni' }))
    expect(getSettings(account.uid).monthlyReminder.daysBefore).toBe(3)
    expect(screen.getByRole('button', { name: 'Meno giorni' })).toBeEnabled()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('region', { name: 'Mensili da programmare' })).toBeInTheDocument()
    expect(screen.getByText('scadono entro 3 gg')).toBeInTheDocument()
  })

  it('accende versione e da chiudere da soli e tiene i minuti tra 0 e 1440', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    await screen.findByRole('heading', { name: 'Notifiche' })

    const updates = screen.getByRole('switch', { name: 'Nuova versione' })
    const complete = screen.getByRole('switch', { name: 'Da chiudere' })
    expect(updates).toHaveAttribute('aria-checked', 'false')
    expect(complete).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('button', { name: 'Più minuti' })).toBeDisabled()

    await user.click(updates)
    expect(loadPushPrefs(account.uid)).toMatchObject({ enabled: true, updates: true, complete: false })
    expect(complete).toHaveAttribute('aria-checked', 'false')
    await user.click(complete)
    expect(loadPushPrefs(account.uid)).toMatchObject({ enabled: true, updates: true, complete: true, completeAfterMin: 60 })
    expect(screen.getByRole('button', { name: 'Più minuti' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Meno minuti' }))
    expect(loadPushPrefs(account.uid).completeAfterMin).toBe(59)
    expect(screen.getByText('59 min dopo')).toBeInTheDocument()
    view.rerender(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    expect(screen.getByText('59 min dopo')).toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'Da chiudere' }))
    await user.click(screen.getByRole('switch', { name: 'Nuova versione' }))
    expect(loadPushPrefs(account.uid)).toMatchObject({ enabled: false, updates: false, complete: false })
  })

  it('i minuti non scendono sotto 0 e non superano 1440', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    localStorage.setItem(`groomly.pushPrefs.${account.uid}`, JSON.stringify({
      enabled: true,
      updates: false,
      complete: true,
      completeAfterMin: 1440,
    }))
    const view = render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    await screen.findByRole('heading', { name: 'Notifiche' })
    expect(screen.getByText('1440 min dopo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Più minuti' }))
    expect(loadPushPrefs(account.uid).completeAfterMin).toBe(1440)

    view.unmount()
    localStorage.setItem(`groomly.pushPrefs.${account.uid}`, JSON.stringify({
      enabled: true,
      updates: false,
      complete: true,
      completeAfterMin: 0,
    }))
    render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    expect(await screen.findByText('0 min dopo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Meno minuti' }))
    expect(loadPushPrefs(account.uid).completeAfterMin).toBe(0)
  })

  it('senza mensili in scadenza non aggiunge una frase di spiegazione', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/notifiche" />)
    expect(await screen.findByRole('heading', { name: 'Notifiche' })).toBeInTheDocument()
    expect(screen.queryByText(/Adesso non parte nessuna notifica/)).not.toBeInTheDocument()
    expect(screen.getByText('Mensili in scadenza')).toBeInTheDocument()
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
    await user.click(screen.getByRole('switch', { name: 'Mensili in scadenza' }))
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByText('Promemoria mensile spento · Push spente')).toBeInTheDocument()
  })
})
