// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { storageKeys } from '../data/local/storage'

async function openServices(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Non hai un account? Crea account' }))
  await user.type(screen.getByLabelText('Nome'), 'Maria')
  await user.type(screen.getByLabelText('Cognome'), 'Rossi')
  await user.type(screen.getByLabelText('Nome della toelettatura'), 'Il Cane Felice')
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea account' }))
  await screen.findByRole('heading', { name: 'Groomly' })
  await user.click(screen.getByRole('link', { name: /Impostazioni/ }))
  await user.click(screen.getByRole('link', { name: /Servizi e durate/ }))
  await screen.findByRole('heading', { name: 'Servizi e durate' })
}

describe('servizi', () => {
  beforeEach(() => localStorage.clear())

  it('modifica un extra, aggiunge un servizio e non offre elimina', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await openServices(user)
    expect(screen.queryByRole('button', { name: /Elimina/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sposta su Bagno' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Riordina Bagno' })).toBeInTheDocument()
    const bagno = screen.getByRole('button', { name: 'Apri Bagno' })
    expect(bagno.getAttribute('style')).toContain('flex-grow: 1')
    expect(bagno.getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(bagno.getAttribute('style')).toContain('white-space: normal')
    expect(bagno.getAttribute('style') ?? '').not.toContain('ellipsis')
    expect(bagno.getAttribute('style') ?? '').not.toContain('nowrap')
    const line = bagno.parentElement as HTMLElement
    expect(line).toContainElement(screen.getByRole('button', { name: 'Riordina Bagno' }))
    expect(line).toContainElement(screen.getByTestId('icon-Bagno'))
    expect(line).toContainElement(screen.getByRole('switch', { name: 'Bagno' }))
    expect(within(line).queryByText('30–60m')).not.toBeInTheDocument()
    const row = bagno.closest('[data-service-row]') as HTMLElement
    const rowStyle = row.getAttribute('style') ?? ''
    expect(rowStyle).toContain('height: auto')
    expect(rowStyle.replace(/min-height:\s*\d+px/g, '')).not.toMatch(/height:\s*\d+px/)
    expect(within(row).getByText('30–60m')).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Bagno' }))
    expect(within(row).getByText('Disattivato')).toBeInTheDocument()
    expect(within(line).queryByText('Disattivato')).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Bagno' }))
    expect(within(row).queryByText('Disattivato')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apri Gestione nodi' }))
    const price = screen.getByLabelText('Prezzo')
    await user.clear(price)
    await user.type(price, '9')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const raw = localStorage.getItem(storageKeys.services(JSON.parse(localStorage.getItem(storageKeys.auth)!).uid))!
    const nodi = JSON.parse(raw).nodi
    expect(nodi.price).toEqual({ piccola: 9, media: 9, grande: 9 })
    await user.click(screen.getByRole('button', { name: 'Aggiungi servizio' }))
    await user.type(screen.getByLabelText('Nome'), 'Spazzolata')
    await user.click(screen.getByRole('radio', { name: 'Extra' }))
    await user.type(screen.getByLabelText('Durata'), '10')
    await user.type(screen.getByLabelText('Prezzo'), '5')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Spazzolata')).toBeInTheDocument()
    expect(within(screen.getByTestId('icon-Spazzolata')).getByTestId('service-fallback')).toBeInTheDocument()
  }, 20000)

  it('se la scrittura fallisce lascia il nome precedente', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await openServices(user)
    await user.click(screen.getByRole('button', { name: 'Apri Bagno' }))
    const name = screen.getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Bagno nuovo')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    const dialog = screen.getByRole('dialog', { name: 'Modifica servizio' })
    expect(within(dialog).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(dialog.parentElement?.getAttribute('style')).toContain('align-items: center')
    vi.restoreAllMocks()
    expect(screen.getByRole('button', { name: 'Apri Bagno' })).toBeInTheDocument()
  })

  it('ArrowDown su un principale non ultimo permuta il gruppo e non tocca gli extra', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await openServices(user)
    const handle = screen.getByRole('button', { name: 'Riordina Bagno' })
    handle.focus()
    await user.keyboard('{ArrowDown}')
    const uid = JSON.parse(localStorage.getItem(storageKeys.auth)!).uid as string
    const raw = JSON.parse(localStorage.getItem(storageKeys.services(uid))!) as Record<string, { id: string; kind: string; order: number }>
    const principali = Object.values(raw).filter((item) => item.kind === 'principale').sort((a, b) => a.order - b.order)
    expect(principali.map((item) => item.id)).toEqual(['taglio', 'bagno', 'bagno-taglio', 'stripping'])
    const extras = Object.values(raw).filter((item) => item.kind === 'extra')
    expect(extras.map((item) => item.order).sort((a, b) => a - b)).toEqual([4, 5, 6, 7])
  })
})
