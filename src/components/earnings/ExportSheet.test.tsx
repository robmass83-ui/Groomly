// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { share, writeFile } = vi.hoisted(() => ({
  share: vi.fn(async () => undefined),
  writeFile: vi.fn(async (_options: { directory: string }) => ({ uri: 'file:///docs/Groomly/incassi.pdf' })),
}))

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(async () => ({ remove: vi.fn() })), exitApp: vi.fn() },
}))
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
    cancel: vi.fn(),
    createChannel: vi.fn(),
    schedule: vi.fn(),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
  },
}))
vi.mock('@capacitor/share', () => ({ Share: { share } }))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE', Documents: 'DOCUMENTS' },
  Filesystem: { writeFile },
}))

import { App } from '../../app/App'
import { ToastProvider } from '../layout/Toast'
import { createAccount } from '../../data/local/auth'
import { blankSettings, getSettings, type ExportPrefs, type SettingsMain } from '../../data/local/settings'
import type { Appointment } from '../../types/models'
import { ExportSheet } from './ExportSheet'

function visit(id: string, start: Date, price: number, extra: Partial<Appointment> = {}): Appointment {
  return {
    id,
    dogId: 'zeus',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }],
    status: 'completato',
    createdAt: start,
    updatedAt: start,
    ...extra,
  }
}

function septemberPaid(): Appointment[] {
  return [
    visit('a', new Date(2026, 8, 2, 9, 30), 40),
    visit('b', new Date(2026, 8, 3, 11, 0), 25),
  ]
}

function baseSettings(extra: Partial<SettingsMain> = {}): SettingsMain {
  const base = blankSettings('auto', '2026-10-13T12:00:00.000Z')
  return {
    ...base,
    ...extra,
    business: {
      name: 'I Pelosetti',
      vatNumber: '123',
      phone: '06',
      address: 'Via Roma',
      ...extra.business,
    },
  }
}

function renderSheet(
  appointments: Appointment[] = septemberPaid(),
  settings: SettingsMain = baseSettings(),
  onRemember: (prefs: ExportPrefs) => void = () => {},
) {
  return render(
    <ToastProvider>
      <ExportSheet
        open
        onClose={() => {}}
        appointments={appointments}
        dogs={[]}
        services={[]}
        settings={settings}
        onRemember={onRemember}
      />
    </ToastProvider>,
  )
}

describe('foglio Esporta', () => {
  beforeEach(() => {
    localStorage.clear()
    share.mockClear()
    share.mockResolvedValue(undefined)
    writeFile.mockClear()
    writeFile.mockImplementation(async () => ({ uri: 'file:///docs/Groomly/incassi.pdf' }))
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 15, 5))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('apre sul mese scorso con l’incassato e i mancati spenti', () => {
    renderSheet()
    expect(screen.getByText(/Settembre 2026/)).toBeInTheDocument()
    expect(screen.getByText('Incassato')).toBeInTheDocument()
    expect(screen.getByText('€ 65')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Mancati incassi' })).not.toBeChecked()
  })

  it('nasconde solo l’incassato in anteprima quando gli importi sono nascosti', () => {
    renderSheet(septemberPaid(), baseSettings({ ui: { hideAmounts: true } }))
    expect(screen.getByText('Incassato').nextElementSibling).toHaveTextContent('•••')
    expect(screen.queryByText('€ 65')).not.toBeInTheDocument()
    expect(screen.getByText('Appuntamenti').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Giorni lavorati').nextElementSibling).toHaveTextContent('2')
  })

  it('non spegne insieme riepilogo e dettaglio', async () => {
    const user = userEvent.setup()
    const onRemember = vi.fn()
    renderSheet(septemberPaid(), baseSettings(), onRemember)
    await user.click(screen.getByRole('switch', { name: 'Riepilogo' }))
    expect(onRemember).toHaveBeenCalledTimes(1)
    onRemember.mockClear()
    await user.click(screen.getByRole('switch', { name: 'Dettaglio appuntamenti' }))
    expect(screen.getByRole('switch', { name: 'Dettaglio appuntamenti' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Riepilogo' })).not.toBeChecked()
    expect(onRemember).not.toHaveBeenCalled()
  })

  it('senza incassi Salva e Invia sono spenti', () => {
    renderSheet([])
    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Invia al commercialista' })).toBeDisabled()
    expect(screen.getByText('Nessun incasso in questo periodo')).toBeInTheDocument()
  })

  it('un appuntamento di agosto non chiuso resta fuori dal file', async () => {
    const user = userEvent.setup()
    renderSheet([visit('aperto', new Date(2026, 7, 4, 10, 0), 30, { status: 'programmato' })])
    await user.click(screen.getByRole('button', { name: 'Mese precedente' }))
    expect(screen.getByText('1 appuntamento di agosto non è chiuso: non sarà nel file')).toBeInTheDocument()
  })

  it('ricorda formato, periodo e inclusioni, non il mese, l’anno o le date', async () => {
    const user = userEvent.setup()
    const onRemember = vi.fn()
    renderSheet(
      [...septemberPaid(), visit('vecchio', new Date(2025, 3, 2, 9, 0), 15)],
      baseSettings(),
      onRemember,
    )
    await user.click(screen.getByRole('button', { name: 'Mese precedente' }))
    expect(onRemember).not.toHaveBeenCalled()
    await user.click(screen.getByRole('radio', { name: 'Anno' }))
    expect(onRemember).toHaveBeenLastCalledWith(expect.objectContaining({
      formato: 'pdf',
      periodo: 'anno',
      include: { riepilogo: true, dettaglio: true, attivita: true, mancati: false, pagamento: true },
    }))
    onRemember.mockClear()
    await user.click(screen.getByRole('button', { name: '2025' }))
    expect(onRemember).not.toHaveBeenCalled()
    await user.click(screen.getByRole('radio', { name: 'Da… a…' }))
    expect(onRemember).toHaveBeenCalledWith(expect.objectContaining({ periodo: 'intervallo' }))
    onRemember.mockClear()
    fireEvent.change(screen.getByLabelText('Da'), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText('A'), { target: { value: '2026-09-15' } })
    expect(onRemember).not.toHaveBeenCalled()
    await user.click(screen.getByRole('radio', { name: 'Excel' }))
    expect(onRemember).toHaveBeenCalledWith(expect.objectContaining({ formato: 'csv', periodo: 'intervallo' }))
    onRemember.mockClear()
    await user.click(screen.getByRole('switch', { name: 'Mancati incassi' }))
    expect(onRemember).toHaveBeenCalledWith(expect.objectContaining({
      formato: 'csv',
      periodo: 'intervallo',
      include: expect.objectContaining({ mancati: true }),
    }))
  })

  it('il file usa la ragione sociale e l’interruttore toglie il tipo di pagamento', async () => {
    const user = userEvent.setup()
    const onRemember = vi.fn()
    renderSheet(septemberPaid(), baseSettings(), onRemember)
    expect(screen.getByRole('switch', { name: 'Tipo di pagamento' })).toBeChecked()
    expect(screen.getByText('Colonna nel dettaglio e riga POS / contanti nel PDF')).toBeInTheDocument()
    expect(screen.getByText('Data, ora, cane, proprietario, servizi, importo')).toBeInTheDocument()
    expect(screen.queryByText('Data, ora, cane, proprietario, servizi, importo, pagamento')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Excel' }))
    await user.click(screen.getByRole('switch', { name: 'Tipo di pagamento' }))
    expect(onRemember).toHaveBeenLastCalledWith(expect.objectContaining({
      formato: 'csv',
      periodo: 'mese',
      include: expect.objectContaining({ dettaglio: true, pagamento: false }),
    }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({
      path: 'Groomly/I_Pelosetti_Incassi_2026-09.csv',
    }))
    expect(share).not.toHaveBeenCalled()
  })

  it('avvisa se manca la P. IVA e accorcia oltre 24 mesi', () => {
    renderSheet(septemberPaid(), baseSettings({ business: { name: 'I Pelosetti', vatNumber: '', phone: '', address: '' } }))
    expect(screen.getByText('Manca la P. IVA')).toBeInTheDocument()
  })

  it('l’anteprima usa l’intervallo accorciato a 24 mesi', async () => {
    const user = userEvent.setup()
    renderSheet([
      visit('dentro', new Date(2024, 5, 15, 10, 0), 10),
      visit('fuori', new Date(2026, 2, 2, 10, 0), 80),
    ])
    await user.click(screen.getByRole('radio', { name: 'Da… a…' }))
    fireEvent.change(screen.getByLabelText('Da'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('A'), { target: { value: '2026-06-01' } })
    expect(screen.getByText('Massimo 24 mesi')).toBeInTheDocument()
    expect(screen.getByText('€ 10')).toBeInTheDocument()
    expect(screen.queryByText('€ 80')).not.toBeInTheDocument()
    expect(screen.queryByText('€ 90')).not.toBeInTheDocument()
  })

  async function chooseExcel() {
    renderSheet()
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: 'Excel' }))
    return user
  }

  it('su telefono Salva scrive in Documenti e Invia usa il titolo Incassi Groomly', async () => {
    const user = await chooseExcel()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Salvato in Documenti/Groomly')).toBeInTheDocument()
    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({
      directory: 'DOCUMENTS',
      path: expect.stringMatching(/^Groomly\//),
    }))
    expect(share).not.toHaveBeenCalled()
    share.mockClear()
    writeFile.mockClear()
    await user.click(screen.getByRole('button', { name: 'Invia al commercialista' }))
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Incassi Groomly' })))
  })

  it('se Documenti rifiuta, Salva apre la condivisione con titolo Incassi Groomly', async () => {
    writeFile.mockImplementation(async (options: { directory: string }) => {
      if (options.directory === 'DOCUMENTS') throw new Error('denied')
      return { uri: 'file:///cache/incassi.csv' }
    })
    const user = await chooseExcel()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Scegli dove salvarlo')).toBeInTheDocument()
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Incassi Groomly' }))
    expect(screen.queryByText('Esportazione non riuscita')).not.toBeInTheDocument()
  })

  it('annullare la condivisione non mostra un errore', async () => {
    share.mockRejectedValueOnce(new Error('Share canceled'))
    const user = await chooseExcel()
    await user.click(screen.getByRole('button', { name: 'Invia al commercialista' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia al commercialista' })).toBeEnabled())
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Incassi Groomly' }))
    expect(screen.queryByText('Esportazione non riuscita')).not.toBeInTheDocument()
  })

  it('un errore di condivisione diverso dall’annullamento dice che l’esportazione non è riuscita', async () => {
    share.mockRejectedValueOnce(new Error('activity not found'))
    const user = await chooseExcel()
    await user.click(screen.getByRole('button', { name: 'Invia al commercialista' }))
    expect(await screen.findByText('Esportazione non riuscita')).toBeInTheDocument()
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Incassi Groomly' }))
  })

  it('Esporta monta il foglio e salva le preferenze', async () => {
    const user = userEvent.setup()
    const account = await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/incassi/report" />)
    expect(screen.queryByRole('dialog', { name: 'Esporta per il commercialista' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Esporta' }))
    expect(screen.getByRole('dialog', { name: 'Esporta per il commercialista' })).toBeInTheDocument()
    expect(screen.getByText(/Settembre 2026/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mese precedente' }))
    expect(getSettings(account.uid).exportPrefs).toBeUndefined()
    await user.click(screen.getByRole('radio', { name: 'Excel' }))
    expect(getSettings(account.uid).exportPrefs).toMatchObject({ formato: 'csv', periodo: 'mese' })
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog', { name: 'Esporta per il commercialista' })).not.toBeInTheDocument()
  })
})
