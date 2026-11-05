// @vitest-environment happy-dom
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { createAccount, getAccount } from '../../data/local/auth'
import { storageKeys, writeJson } from '../../data/local/storage'
import type { InvitoBeta } from '../../lib/betaInvito'
import type { FeedbackLetto, InvitoAdmin } from '../../lib/adminManager'
import { CONFIG_PIANI_DEFAULT } from '../../lib/configPiani'

const GIORNO = 86_400_000
const tra = (giorni: number) => new Date(Date.now() + giorni * GIORNO).toISOString()

const admin = vi.hoisted(() => ({
  contatori: vi.fn(async (): Promise<unknown> => ({})),
  inviti: vi.fn(async (): Promise<InvitoAdmin[]> => []),
  feedback: vi.fn(async (): Promise<FeedbackLetto[]> => []),
  avvia: vi.fn(async (): Promise<string> => '2026-01-01T00:00:00.000Z'),
  storico: vi.fn(async (_id: string): Promise<InvitoBeta[]> => []),
  invita: vi.fn(async (_input: unknown) => ({ invitati: [] as string[], saltati: [] as { salonId: string; motivo: 'vip' }[] })),
  revoca: vi.fn(async (_input: unknown) => ({ ok: true as const, emailStato: null })),
  estendi: vi.fn(async (_input: unknown) => ({ ok: true as const, scadeIl: '' })),
  early: vi.fn(async (_input: unknown) => undefined),
  mostra: vi.fn(async (_valore: boolean) => undefined),
  config: null as unknown as { mostraPiani: boolean; abbonamentiAttivi: boolean; piani: typeof CONFIG_PIANI_DEFAULT },
}))
vi.mock('../../data/firebase/adminClient', async () => {
  const actual = await vi.importActual<typeof import('../../data/firebase/adminClient')>('../../data/firebase/adminClient')
  const { contatoriDi } = await vi.importActual<typeof import('../../lib/adminManager')>('../../lib/adminManager')
  return {
    ...actual,
    callContatoriAdmin: async () => contatoriDi(await admin.contatori()),
    elencoInvitiBeta: () => admin.inviti(),
    elencoFeedbackBeta: () => admin.feedback(),
    callAvviaAssistenza: () => admin.avvia(),
    elencoAssistenza: async () => ({}),
    storicoInvitoBeta: (id: string) => admin.storico(id),
    callInvitaBeta: (input: unknown) => admin.invita(input),
    callRevocaBeta: (input: unknown) => admin.revoca(input),
    callEstendiBeta: (input: unknown) => admin.estendi(input),
    callSegnaEarlyAdopter: (input: unknown) => admin.early(input),
    callImpostaMostraPiani: (valore: boolean) => admin.mostra(valore),
    listenConfigGlobale: async (onData: (c: typeof admin.config) => void) => {
      onData(admin.config)
      return () => undefined
    },
  }
})

const client = vi.hoisted(() => ({
  directory: vi.fn(async (): Promise<unknown> => ({ accountCount: 0, salonCount: 0, entries: [], pro: [] })),
  imposta: vi.fn(async (_salonId: string, _azione: string) => ({ ok: true as const, emailStato: null })),
  config: vi.fn(async (_modifiche: unknown): Promise<unknown> => null),
}))
vi.mock('../../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../../data/firebase/client')>('../../data/firebase/client')
  return {
    ...actual,
    listSalonDirectory: () => client.directory(),
    callImpostaPiano: (salonId: string, azione: string) => client.imposta(salonId, azione),
    callImpostaConfigPiani: (modifiche: unknown) => client.config(modifiche),
    elencoSuggerimenti: async () => [],
  }
})

const scarica = vi.hoisted(() => vi.fn((_blob: Blob, _nome: string) => undefined))
vi.mock('../../data/firebase/abbonamentiClient', () => ({
  controlloAccensione: vi.fn(async () => ({ voci: [], pronti: 0, tuttoVerde: false, attivi: false })),
  confermaPartitaIva: vi.fn(async () => undefined),
  accendiAbbonamenti: vi.fn(async () => undefined),
  spegniAbbonamenti: vi.fn(async () => undefined),
}))
vi.mock('../../lib/shareFile', async () => {
  const actual = await vi.importActual<typeof import('../../lib/shareFile')>('../../lib/shareFile')
  return { ...actual, downloadAnchor: (blob: Blob, nome: string) => scarica(blob, nome) }
})

function invito(salonId: string, parziale: Partial<InvitoBeta> = {}): InvitoBeta {
  return {
    salonId, piano: 'pro', giorni: 60, messaggio: null, stato: 'invitato', invitatoIl: tra(-2), scadeInvitoIl: tra(12),
    rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null, invitatoDa: 'op', aggiornatoIl: tra(-2), ...parziale,
  }
}

function feedback(id: string, salonId: string, parziale: Partial<FeedbackLetto> = {}): FeedbackLetto {
  return {
    id, salonId, uid: 'u', piano: 'pro', voto: 5, funzioni: { prenotazioni: 'utile' }, nonVa: 'Lento', manca: 'Stampa', pagheresti: 'si',
    quanto: '5-10', ricontatto: true, fineBeta: false, versioneApp: '1.1.188', creatoIl: tra(-1), ...parziale,
  }
}

const TRE_SALONI = {
  accountCount: 3,
  salonCount: 3,
  entries: [
    { uid: 'ada', ownerName: 'Ada Neri', salonName: 'Bauci' },
    { uid: 'leo', ownerName: 'Leo Verdi', salonName: 'Pelo' },
    { uid: 'eva', ownerName: 'Eva Blu', salonName: 'Zampa' },
  ],
  pro: [
    { uid: 'ada', salonId: 'ada', enabled: false, livello: 'base' },
    { uid: 'leo', salonId: 'leo', enabled: true, livello: 'vip' },
    {
      uid: 'eva', salonId: 'eva', enabled: true, livello: 'pro', piano: 'pro', fonte: 'beta', stato: 'attivo', scadeIl: tra(3),
      traccia: { exBeta: true, betaPiano: 'pro', betaDal: tra(-57), betaFinoAl: tra(3), earlyAdopter: true },
    },
  ],
}

async function apriSenzaAttesa(percorso: string) {
  await createAccount('masala.roberto@hotmail.it', 'segretissimo')
  const account = getAccount()
  if (!account) throw new Error('account assente')
  writeJson(storageKeys.auth, { ...account, admin: true })
  render(<App memory isDev={false} initialPath={percorso} />)
}

async function apri(percorso = '/admin') {
  await apriSenzaAttesa(percorso)
  await screen.findAllByRole('heading', { name: /Panoramica|Saloni|Beta|Assistenza|Piani|Bauci|Pelo|Zampa/ })
}

describe('Admin Manager: beta', () => {
  beforeEach(() => {
    localStorage.clear()
    for (const f of [admin.contatori, admin.inviti, admin.feedback, admin.storico, admin.invita, admin.revoca, admin.estendi, admin.early, admin.mostra, client.directory, client.imposta, client.config, scarica]) f.mockClear()
    admin.avvia.mockReset()
    admin.avvia.mockResolvedValue('2026-01-01T00:00:00.000Z')
    admin.contatori.mockResolvedValue({})
    admin.inviti.mockResolvedValue([])
    admin.feedback.mockResolvedValue([])
    admin.storico.mockResolvedValue([])
    client.directory.mockResolvedValue(TRE_SALONI)
    client.config.mockResolvedValue({ ...CONFIG_PIANI_DEFAULT })
    admin.config = { mostraPiani: false, abbonamentiAttivi: false, piani: CONFIG_PIANI_DEFAULT }
  })

  it('la barra del telefono ha cinque voci e i link vecchi portano alla pagina giusta', async () => {
    await apri('/impostazioni/utenti?zona=saloni')
    const barra = await screen.findByRole('navigation', { name: 'Menu della Console' })
    expect(within(barra).getAllByRole('link').map((l) => l.textContent?.replace(/\d+.*$/, ''))).toEqual(['Panoramica', 'Saloni', 'Assistenza', 'Beta', 'Altro'])
    expect(within(barra).getByRole('link', { name: /Saloni/ })).toHaveAttribute('aria-current', 'page')
    const user = userEvent.setup()
    await user.click(within(barra).getByRole('link', { name: 'Altro' }))
    await user.click(await screen.findByRole('link', { name: 'Piani' }))
    expect(await screen.findByRole('heading', { name: 'Abbonamenti spenti' })).toBeInTheDocument()
  })

  it('Panoramica: numeri della beta, Da fare oggi con +30 gg e numeri non disponibili con Riprova', async () => {
    admin.contatori.mockResolvedValue({ saloni: { totali: 3, attivi7: 2, attivi30: 3 }, perPiano: { base: 1, pro: 1, vip: 1 }, inviti: { invitato: 1, accettato: 1 }, feedback: { totali: 4, pagheresti: { si: 2 } }, avvisami: { prenotazioni: 3, 'piano-salone': 1 } })
    admin.inviti.mockResolvedValue([invito('ada', { scadeInvitoIl: tra(2) }), invito('eva', { stato: 'accettato', rispostoIl: tra(-57) })])
    const user = userEvent.setup()
    await apri()
    expect(await screen.findByRole('button', { name: 'Pagherebbero: 2' })).toBeInTheDocument()
    expect(screen.getByText('Bauci non ha risposto')).toBeInTheDocument()
    expect(screen.getByText('L’invito scade tra 2 giorni')).toBeInTheDocument()
    expect(screen.getByText(/Zampa finisce il/)).toBeInTheDocument()
    expect(screen.getByText('Vetrina Salon')).toBeInTheDocument()
    expect(screen.getByText('3 account creati · 3 toelettature create')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+30 gg' }))
    expect(admin.estendi).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Conferma' }))
    expect(admin.estendi).toHaveBeenCalledWith({ salonId: 'eva', giorni: 30 })

    await user.click(screen.getByRole('button', { name: 'In beta: 1' }))
    expect(await screen.findByRole('link', { name: /Beta/, current: 'page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zampa, Eva Blu' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bauci, Ada Neri' })).not.toBeInTheDocument()
  })

  it('un link diretto alla scheda aspetta i dati prima di dire che il salone non c’è', async () => {
    let finisci: (valore: unknown) => void = () => undefined
    client.directory.mockImplementation(() => new Promise((ok) => { finisci = ok }))
    await apriSenzaAttesa('/admin/saloni/ada')
    expect(await screen.findByText('Caricamento…')).toBeInTheDocument()
    expect(screen.queryByText('Nessuna toelettatura')).not.toBeInTheDocument()
    await act(async () => { finisci(TRE_SALONI) })
    expect(await screen.findByRole('heading', { name: 'Bauci' })).toBeInTheDocument()
  })

  it('Panoramica: dice quante email sono partite oggi e i saloni nuovi, senza il tour', async () => {
    admin.contatori.mockResolvedValue({ emailOggi: 120, nuoviSaloni: ['ada'] })
    await apri()
    expect(await screen.findByText('Email oggi: 120 su 300')).toBeInTheDocument()
    expect(await screen.findByText('Un salone nuovo questa settimana')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Tour di benvenuto per i nuovi iscritti' })).not.toBeInTheDocument()
  })

  it('l’Annuncio pagamenti non sta più in Piani', async () => {
    await apri('/admin/piani')
    expect(await screen.findByRole('heading', { name: 'Abbonamenti spenti' })).toBeInTheDocument()
    expect(screen.queryByText('Annuncio pagamenti')).not.toBeInTheDocument()
  })

  it('Assistenza: finché il taglio non arriva nessuna richiesta vale nuova', async () => {
    let finisci: (dal: string) => void = () => undefined
    admin.avvia.mockImplementation(() => new Promise((ok) => { finisci = ok }))
    admin.feedback.mockResolvedValue([feedback('f1', 'eva', { creatoIl: '2026-01-01T00:00:00.000Z' })])
    await apri('/admin/assistenza')
    expect(screen.queryByText('Lento')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('1 nuovi')).not.toBeInTheDocument()
    await act(async () => { finisci('2026-11-01T00:00:00.000Z') })
    expect(await screen.findByText('Nessuna richiesta')).toBeInTheDocument()
  })

  it('Assistenza: se il taglio non si legge lo dice, non mostra tutto come nuovo', async () => {
    admin.avvia.mockRejectedValue(new Error('internal'))
    admin.feedback.mockResolvedValue([feedback('f1', 'eva', { creatoIl: '2026-01-01T00:00:00.000Z' })])
    await apri('/admin/assistenza')
    expect(await screen.findByText('Richieste non disponibili')).toBeInTheDocument()
    expect(screen.queryByLabelText('1 nuovi')).not.toBeInTheDocument()
  })

  it('se i numeri non arrivano lo dice e Riprova li richiede', async () => {
    admin.contatori.mockRejectedValueOnce(new Error('internal'))
    const user = userEvent.setup()
    await apri()
    expect(await screen.findByText('Numeri non disponibili.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    await waitFor(() => expect(admin.contatori).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: 'Invitati: 0' })).toBeInTheDocument()
  })

  it('Saloni: filtra chi ha toccato Avvisami e lo seleziona per la beta', async () => {
    admin.contatori.mockResolvedValue({ ultimoAccesso: { ada: null, leo: null, eva: null }, interesse: { ada: ['piano-plus'], eva: ['piano-salone'] } })
    const user = userEvent.setup()
    await apri('/admin?tab=saloni')
    await screen.findByRole('button', { name: 'Bauci, Ada Neri' })
    await user.click(await screen.findByRole('button', { name: /^Avvisami Plus 1/ }))
    expect(screen.getByRole('button', { name: 'Bauci, Ada Neri' })).toHaveTextContent('Avvisami Plus')
    expect(screen.queryByRole('button', { name: 'Zampa, Eva Blu' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seleziona tutti' }))
    expect(screen.getByRole('checkbox', { name: 'Bauci' })).toHaveAttribute('aria-checked', 'true')
  })

  it('Saloni: filtra, seleziona più saloni e invita insieme con i saltati spiegati', async () => {
    admin.invita.mockResolvedValue({ invitati: ['ada'], saltati: [{ salonId: 'leo', motivo: 'vip' }] })
    const user = userEvent.setup()
    await apri('/admin?tab=saloni')
    await screen.findByRole('button', { name: 'Bauci, Ada Neri' })
    await user.click(screen.getByRole('button', { name: /^VIP 1/ }))
    expect(screen.queryByRole('button', { name: 'Bauci, Ada Neri' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^VIP 1/ }))
    await user.type(screen.getByPlaceholderText('Cerca salone, titolare o città'), 'eva')
    expect(screen.getByText('1 salone')).toBeInTheDocument()
    await user.clear(screen.getByPlaceholderText('Cerca salone, titolare o città'))

    await user.click(screen.getByRole('button', { name: 'Seleziona' }))
    expect(screen.getByRole('heading', { name: '0 selezionati' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Bauci' }))
    await user.click(screen.getByRole('button', { name: 'Pelo, Leo Verdi' }))
    expect(screen.getByRole('checkbox', { name: 'Bauci' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'Pelo' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('heading', { name: '2 selezionati' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Beta Plus' }))
    const foglio = screen.getByRole('dialog', { name: 'Invita alla beta' })
    expect(within(foglio).getByText('Bauci, Pelo')).toBeInTheDocument()
    expect(within(foglio).getByRole('radio', { name: '60 giorni' })).toHaveAttribute('aria-checked', 'true')
    await user.click(within(foglio).getByRole('radio', { name: 'Altro' }))
    const giorni = within(foglio).getByLabelText('Giorni (da 1 a 365)')
    const invia = within(foglio).getByRole('button', { name: 'Invia 2 inviti' })
    await user.type(giorni, '0')
    expect(invia).toBeDisabled()
    await user.clear(giorni)
    await user.type(giorni, '366')
    expect(invia).toBeDisabled()
    await user.clear(giorni)
    await user.type(giorni, '45')
    await user.type(within(foglio).getByLabelText(/Messaggio/), 'Ciao!')
    await user.click(invia)
    expect(admin.invita).toHaveBeenCalledWith({ salonIds: ['ada', 'leo'], piano: 'pro', giorni: 45, messaggio: 'Ciao!' })
    expect(await screen.findByText('1 inviti inviati · 1 saltati')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Saltati' }))
    expect(within(screen.getByRole('dialog', { name: 'Saltati' })).getByText('Pelo · VIP')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Saloni' })).toBeInTheDocument()
  })

  it('con ultimoAccesso di B1 compaiono i filtri di attività e la pillola nel dettaglio', async () => {
    admin.contatori.mockResolvedValue({ inBeta: 7, ultimoAccesso: { ada: tra(0), leo: tra(-45), eva: null } })
    const user = userEvent.setup()
    await apri()
    expect(await screen.findByRole('button', { name: 'In beta: 7' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Saloni/ }))
    await user.click(await screen.findByRole('button', { name: /^Attivi 7 gg 1/ }))
    expect(screen.getByRole('button', { name: 'Bauci, Ada Neri' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pelo, Leo Verdi' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bauci, Ada Neri' }))
    expect(await screen.findByText('Attivo oggi')).toBeInTheDocument()
  })

  it('Regala 30 giorni a tutti i selezionati dopo la conferma', async () => {
    const user = userEvent.setup()
    await apri('/admin?tab=saloni')
    await user.click(await screen.findByRole('button', { name: 'Seleziona tutti' }))
    expect(screen.getByRole('heading', { name: '3 selezionati' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Altre azioni' }))
    await user.click(screen.getByRole('button', { name: 'Regala 30 giorni a tutti' }))
    expect(client.imposta).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog', { name: 'Regala 30 giorni a tutti' })).getByRole('button', { name: 'Conferma' }))
    await waitFor(() => expect(client.imposta).toHaveBeenCalledTimes(3))
    expect(client.imposta).toHaveBeenCalledWith('ada', 'prova')
    expect(await screen.findByText('3 prove regalate')).toBeInTheDocument()
  })

  it('Dettaglio: perché, estendi, revoca, early adopter e storico', async () => {
    admin.inviti.mockResolvedValue([{ ...invito('eva', { stato: 'accettato', rispostoIl: tra(-57) }), estensioni: [{ il: tra(-10), giorni: 30, scadeIl: tra(3) }] }])
    admin.storico.mockResolvedValue([invito('eva', { stato: 'rifiutato', invitatoIl: tra(-90), rispostoIl: tra(-88), motivoRifiuto: 'complicato' })])
    const user = userEvent.setup()
    await apri('/admin?tab=saloni&id=eva')
    expect(await screen.findByText('Plus · in beta')).toBeInTheDocument()
    expect(screen.getByText('BETA')).toBeInTheDocument()
    expect(screen.getByText(/Beta accettata il/)).toBeInTheDocument()
    expect(screen.getByText('3 gg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Estendi' }))
    await user.click(screen.getByRole('radio', { name: '+15' }))
    expect(screen.getByText(/Nuova fine:/)).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Conferma' }))
    expect(admin.estendi).toHaveBeenCalledWith({ salonId: 'eva', giorni: 15 })

    await user.click(screen.getByRole('button', { name: 'Revoca' }))
    expect(screen.getByText('Zampa torna a Go subito. I dati restano. Gli mandiamo un avviso.')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Conferma' }))
    expect(admin.revoca).toHaveBeenCalledWith({ salonId: 'eva' })

    const early = screen.getByRole('switch', { name: 'Early adopter' })
    expect(early).toHaveAttribute('aria-checked', 'true')
    await user.click(early)
    expect(admin.early).toHaveBeenCalledWith({ salonId: 'eva', valore: false })

    await user.click(screen.getByRole('radio', { name: 'Storico' }))
    expect(await screen.findByText('Ha accettato')).toBeInTheDocument()
    expect(screen.getByText('Ha rifiutato: È troppo complicato')).toBeInTheDocument()
    expect(screen.getByText(/^Beta estesa di 30 giorni, fino al/)).toBeInTheDocument()
    expect(admin.storico).toHaveBeenCalledWith('eva')
  })

  it('Dettaglio: un salone mai invitato si invita da solo', async () => {
    const user = userEvent.setup()
    await apri('/admin?tab=saloni&id=ada')
    await user.click(await screen.findByRole('button', { name: 'Invita alla beta Salon' }))
    const foglio = screen.getByRole('dialog', { name: 'Invita alla beta' })
    expect(within(foglio).getByRole('radio', { name: 'Salon' })).toHaveAttribute('aria-checked', 'true')
    await user.click(within(foglio).getByRole('button', { name: 'Invia 1 invito' }))
    expect(admin.invita).toHaveBeenCalledWith({ salonIds: ['ada'], piano: 'salone', giorni: 60, messaggio: '' })
  })

  it('Dettaglio: un invito aperto si revoca dopo la conferma', async () => {
    admin.inviti.mockResolvedValue([invito('ada')])
    const user = userEvent.setup()
    await apri('/admin?tab=saloni&id=ada')
    await user.click(await screen.findByRole('button', { name: 'Revoca invito' }))
    expect(admin.revoca).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog', { name: 'Revocare l’invito?' })).getByRole('button', { name: 'Conferma' }))
    expect(admin.revoca).toHaveBeenCalledWith({ salonId: 'ada' })
  })

  it('Feedback: riepilogo, filtro per piano, righe ed esportazione Excel', async () => {
    admin.feedback.mockResolvedValue([
      feedback('f1', 'eva'),
      feedback('f2', 'ada', { piano: 'salone', voto: 3, pagheresti: 'no', quanto: null, nonVa: '', manca: '', ricontatto: false }),
    ])
    const user = userEvent.setup()
    await apri('/admin/assistenza?fonte=feedback&stato=tutte')
    expect(await screen.findByLabelText('Voto medio: 4')).toBeInTheDocument()
    expect(screen.getByText('Sì 1 · Forse 0 · No 1')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Plus 1' }))
    expect(screen.queryByText('Sì 1 · Forse 0 · No 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Esporta PDF o Excel' }))
    const finestra = screen.getByRole('dialog', { name: 'Esporta PDF o Excel' })
    expect(within(finestra).getByText('1 feedback')).toBeInTheDocument()
    await user.click(within(finestra).getByRole('button', { name: 'Esporta' }))
    await waitFor(() => expect(scarica).toHaveBeenCalledTimes(1))
    expect(scarica.mock.calls[0][1]).toMatch(/^Groomly_FeedbackBeta_\d{4}-\d{2}-\d{2}\.xlsx$/)
  }, 20_000)

  it('Piani: interruttori ottimistici con rollback, mostraPiani e offerta early adopter', async () => {
    client.config.mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    await apri('/admin?tab=piani')
    const prova = await screen.findByRole('switch', { name: 'Prova gratis self-service' })
    await user.click(prova)
    expect(client.config).toHaveBeenCalledWith({ provaSelfService: true })
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(prova).toHaveAttribute('aria-checked', 'false')

    client.config.mockResolvedValueOnce({ ...CONFIG_PIANI_DEFAULT, showPrezziInBeta: true })
    await user.click(screen.getByRole('switch', { name: 'Prezzi durante la beta' }))
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Prezzi durante la beta' })).toHaveAttribute('aria-checked', 'true'))

    await user.click(screen.getByRole('switch', { name: 'Mostra i piani' }))
    expect(admin.mostra).toHaveBeenCalledWith(true)

    await user.type(screen.getByLabelText('Offerta early adopter (it)'), 'Prezzo fondatori')
    await user.click(screen.getByRole('radio', { name: 'en' }))
    expect(screen.getByText('Vuoto: si usa l’italiano')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Salva' })[0])
    expect(client.config).toHaveBeenLastCalledWith({ offertaEarlyAdopter: { it: 'Prezzo fondatori', en: '', es: '', fr: '', de: '' } })
  })
})
