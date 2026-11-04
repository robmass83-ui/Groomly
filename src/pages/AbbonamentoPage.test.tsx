// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'
import type { PianoValore } from '../hooks/usePiano'
import type { LivelloElenco } from '../lib/funzioniPiano'
import { statoDaLivello } from '../lib/funzioniPiano'
import { statoPiano } from '../lib/piano'
import { CONFIG_PIANI_DEFAULT } from '../lib/configPiani'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

vi.mock('../data/firebase/client', async () => ({ ...(await vi.importActual<object>('../data/firebase/client')), scriviInteresse: async () => undefined }))
vi.mock('../components/team/PersoneCollegate', () => ({
  PersoneCollegate: ({ salonId }: { salonId: string }) => <p>Persone collegate di {salonId ? '' : 'x'}salone</p>,
}))

function piano(livello: LivelloElenco, extra: Partial<PianoValore> = {}): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: true,
    tour: { acceso: false, dal: null },
    stato: statoDaLivello(livello, new Date(2026, 9, 31)),
    provaUsata: true,
    provaConcessa: false,
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall: () => undefined,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
    livelloNome: livello,
    ...extra,
  }
}

async function apri(path: string, livello: LivelloElenco, ruolo?: 'collaboratore', extra: Partial<PianoValore> = {}) {
  const account = await createAccount('ada@salone.it', 'segretissimo')
  if (ruolo) writeJson(storageKeys.auth, { ...account, role: ruolo })
  pianoForzato.valore = piano(livello, extra)
  render(<App memory isDev={false} initialPath={path} />)
}

describe('Abbonamento', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('la scelta mostra Go gratis e attivo e i prezzi di Plus e Salone per un utente base', async () => {
    await apri('/impostazioni/abbonamento', 'base')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Groomly Go/ })).toHaveAttribute('href', '/impostazioni/abbonamento/go')
    expect(screen.getByRole('link', { name: /Groomly Plus/ })).toHaveTextContent(/9,99 €\s*al mese/)
    expect(screen.getByRole('link', { name: /Groomly Salon/ })).toHaveTextContent(/19,99 €\s*al mese/)
    expect(screen.getAllByText('Attivo')).toHaveLength(1)
  })

  it('il titolare senza piano Salone vede le persone ancora collegate', async () => {
    await apri('/impostazioni/abbonamento', 'pro')
    expect(await screen.findByText('Persone collegate di salone')).toBeInTheDocument()
  })

  it('il titolare con piano ancora in caricamento non vede le persone collegate', async () => {
    await apri('/impostazioni/abbonamento', 'pro', undefined, { pronto: false })
    await screen.findByRole('heading', { name: 'Abbonamento' })
    expect(screen.queryByText('Persone collegate di salone')).not.toBeInTheDocument()
  })

  it('il titolare con piano Salone non le vede', async () => {
    await apri('/impostazioni/abbonamento', 'salone')
    await screen.findByRole('heading', { name: 'Abbonamento' })
    expect(screen.queryByText('Persone collegate di salone')).not.toBeInTheDocument()
  })

  it('il collaboratore non le vede', async () => {
    await apri('/impostazioni/abbonamento', 'base', 'collaboratore')
    await screen.findByRole('heading', { name: 'Abbonamento' })
    expect(screen.queryByText('Persone collegate di salone')).not.toBeInTheDocument()
  })

  it('vip vede tutti e tre i piani attivi nella scelta', async () => {
    await apri('/impostazioni/abbonamento', 'vip')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
    expect(screen.getAllByText('Attivo')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Groomly Salon/ })).toHaveTextContent('Attivo')
  })

  it('con Plus attivo: Go Gratis, Plus Attivo, Salone il prezzo', async () => {
    await apri('/impostazioni/abbonamento', 'pro')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Groomly Go/ })).toHaveTextContent('Gratis')
    expect(screen.getByRole('link', { name: /Groomly Plus/ })).toHaveTextContent('Attivo')
    expect(screen.getByRole('link', { name: /Groomly Salon/ })).toHaveTextContent(/19,99 €\s*al mese/)
    expect(screen.getAllByText('Attivo')).toHaveLength(1)
  })

  it('con Salone attivo: Go Gratis, Plus il prezzo, Salone Attivo', async () => {
    await apri('/impostazioni/abbonamento', 'salone')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Groomly Go/ })).toHaveTextContent('Gratis')
    expect(screen.getByRole('link', { name: /Groomly Plus/ })).toHaveTextContent(/9,99 €\s*al mese/)
    expect(screen.getByRole('link', { name: /Groomly Salon/ })).toHaveTextContent('Attivo')
    expect(screen.getAllByText('Attivo')).toHaveLength(1)
  })

  it('con Go attivo: Go Attivo e gli altri due con il prezzo', async () => {
    await apri('/impostazioni/abbonamento', 'base')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Groomly Go/ })).toHaveTextContent('Attivo')
    expect(screen.getByRole('link', { name: /Groomly Plus/ })).toHaveTextContent(/9,99 €\s*al mese/)
    expect(screen.getByRole('link', { name: /Groomly Salon/ })).toHaveTextContent(/19,99 €\s*al mese/)
    expect(screen.getAllByText('Attivo')).toHaveLength(1)
  })

  it('base su Plus vede la vetrina senza interruttori', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base')
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.getByText('9,99 €')).toBeInTheDocument()
    expect(screen.getByText('Prenotazioni online')).toBeInTheDocument()
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })

  it('la pagina Plus elenca le nove funzioni nell’ordine giusto e non le vecchie', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base')
    await screen.findByRole('button', { name: 'Abbonati' })
    const attese = [
      'Prenotazioni online',
      'Lista d’attesa',
      'Promemoria email automatici ai clienti',
      'Messaggi WhatsApp per categoria',
      'Avviso «il tuo cane è pronto»',
      'Tessera fedeltà',
      'Richiesta di recensioni',
      'Esporta il report degli incassi',
      'Backup automatico e Google Drive',
    ]
    const voci = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(voci.filter((voce) => attese.includes(voce ?? ''))).toEqual(attese)
    for (const vecchia of ['Auguri di compleanno', 'Statistiche del salone', 'Report dei mesi passati', 'Copie nel cloud']) {
      expect(screen.queryByText(vecchia)).not.toBeInTheDocument()
    }
  })

  it('con gli abbonamenti spenti Avvisami conferma «Ti avviseremo appena disponibile»', async () => {
    const user = userEvent.setup()
    await apri('/impostazioni/abbonamento/salone', 'base', undefined, { abbonamentiAttivi: false })
    await user.click(await screen.findByRole('button', { name: 'Avvisami' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ti avviseremo appena disponibile')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('un abbonato Plus vede Attivo e gli interruttori Plus', async () => {
    await apri('/impostazioni/abbonamento/plus', 'pro')
    expect(await screen.findByRole('switch', { name: 'Prenotazioni online' })).toBeInTheDocument()
    expect(screen.getByText('Attivo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abbonati' })).not.toBeInTheDocument()
  })

  it('un abbonato Plus su Salone vede la vetrina e non Collaboratori', async () => {
    await apri('/impostazioni/abbonamento/salone', 'pro')
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByText('Collaboratori')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })

  it('un abbonato Salone vede Plus e Collaboratori', async () => {
    await apri('/impostazioni/abbonamento/salone', 'salone')
    expect(await screen.findByRole('switch', { name: 'Prenotazioni online' })).toBeInTheDocument()
    expect(screen.getByText('Collaboratori')).toBeInTheDocument()
  })

  it('Go mostra subito gli interruttori base', async () => {
    await apri('/impostazioni/abbonamento/go', 'base')
    expect(await screen.findByRole('switch', { name: 'Messaggi WhatsApp' })).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Prenotazioni online' })).not.toBeInTheDocument()
  })

  it('il collaboratore sulla vetrina legge che lo accende il titolare', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base', 'collaboratore')
    expect(await screen.findByText('Lo accende il titolare.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abbonati' })).not.toBeInTheDocument()
  })

  it('un piano sconosciuto rimanda alla scelta', async () => {
    await apri('/impostazioni/abbonamento/xyz', 'base')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
  })
})

describe('Abbonamento nelle Impostazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('la scorciatoia Abbonamento sostituisce Controlli avanzati e la pillola del piano', async () => {
    await apri('/impostazioni', 'base')
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Abbonamento/ })).toHaveAttribute('href', '/impostazioni/abbonamento')
    expect(screen.queryByText('Controlli avanzati')).not.toBeInTheDocument()
    expect(screen.queryByText(/Piano ·/)).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '44')
  })

  it('anche il collaboratore vede la scorciatoia', async () => {
    await apri('/impostazioni', 'pro', 'collaboratore')
    expect(await screen.findByRole('link', { name: /^Abbonamento/ })).toBeInTheDocument()
  })

  it('il vecchio indirizzo di Controlli avanzati porta ad Abbonamento', async () => {
    await apri('/impostazioni/strumenti', 'base')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
  })
})

function inProva(giorni: number): Partial<PianoValore> {
  const adesso = new Date()
  return { stato: statoPiano({ piano: 'pro', stato: 'prova', fonte: 'prova', provaUsata: true, scadeIl: new Date(adesso.getTime() + giorni * 86400000 - 60000).toISOString() }, adesso) }
}

describe('scheda Abbonamento in Impostazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  const scheda = () => screen.findByRole('link', { name: /^Abbonamento/ })

  it('Go con la prova mai usata: Gratis, Passa a Plus e il bollino dei 30 giorni', async () => {
    await apri('/impostazioni', 'base', undefined, { provaConcessa: true })
    const link = await scheda()
    expect(link).toHaveAttribute('href', '/impostazioni/abbonamento')
    expect(link).toHaveTextContent('Go · Gratis')
    expect(link).toHaveTextContent('Passa a Plus')
    expect(link).toHaveTextContent('30 GIORNI GRATIS')
    expect(link).toHaveAttribute('data-riflesso', 'si')
  })

  it('Go con la prova già usata: niente bollino, resta l’invito', async () => {
    await apri('/impostazioni', 'base')
    const link = await scheda()
    expect(link).toHaveTextContent('Passa a Plus')
    expect(link).not.toHaveTextContent('30 GIORNI GRATIS')
    expect(link).toHaveAttribute('data-riflesso', 'si')
  })

  it('il collaboratore non vede i 30 giorni: la prova la avvia il titolare', async () => {
    await apri('/impostazioni', 'base', 'collaboratore', { provaConcessa: true })
    expect(await scheda()).not.toHaveTextContent('30 GIORNI GRATIS')
  })

  it('in prova mostra i giorni rimasti, senza riflesso', async () => {
    await apri('/impostazioni', 'pro', undefined, inProva(12))
    const link = await scheda()
    expect(link).toHaveTextContent('Prova Plus')
    expect(link).toHaveTextContent('ancora 12 giorni')
    expect(link).toHaveAttribute('data-riflesso', 'no')
  })

  it('all’ultimo giorno di prova scrive «ancora 1 giorno»', async () => {
    await apri('/impostazioni', 'pro', undefined, inProva(1))
    expect(await scheda()).toHaveTextContent('ancora 1 giorno')
  })

  it('Plus, Salone e VIP mostrano il loro piano', async () => {
    await apri('/impostazioni', 'pro')
    expect(await scheda()).toHaveTextContent('Groomly Plus')
    cleanup()
    localStorage.clear()
    await apri('/impostazioni', 'salone')
    expect(await scheda()).toHaveTextContent('Groomly Salon')
    cleanup()
    localStorage.clear()
    await apri('/impostazioni', 'vip')
    const vip = await scheda()
    expect(vip).toHaveTextContent('Il tuo piano')
    expect(vip).toHaveTextContent('Groomly VIP')
    expect(vip).toHaveAttribute('data-riflesso', 'no')
  })

  it('finché il piano non è arrivato non mostra un piano sbagliato', async () => {
    await apri('/impostazioni', 'base', undefined, { pronto: false, provaConcessa: true })
    const link = await scheda()
    expect(link).not.toHaveTextContent('Gratis')
    expect(link).not.toHaveTextContent('30 GIORNI GRATIS')
  })
})

describe('prova gratuita dalla pagina Plus', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('il titolare con la prova mai usata la avvia da qui', async () => {
    const prova = vi.fn(async () => undefined)
    const user = userEvent.setup()
    await apri('/impostazioni/abbonamento/plus', 'base', undefined, { provaConcessa: true, prova })
    await user.click(await screen.findByRole('button', { name: 'Prova Plus gratis per 30 giorni' }))
    expect(prova).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
  })

  it('con la prova già usata resta solo Abbonati', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base')
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).not.toBeInTheDocument()
  })

  it('la pagina Salone non offre la prova, che è di Plus', async () => {
    await apri('/impostazioni/abbonamento/salone', 'base', undefined, { provaConcessa: true })
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).not.toBeInTheDocument()
  })
})

describe('footer fisso della pagina del piano', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('Plus con la prova: prezzo, riga della prova, Prova, poi Abbonati come link e Disdici', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base', undefined, { provaConcessa: true })
    const footer = await screen.findByRole('contentinfo')
    expect(within(footer).getByText('9,99 €')).toBeInTheDocument()
    expect(within(footer).getByText('/ mese')).toBeInTheDocument()
    expect(within(footer).getByText('30 giorni gratis, poi 9,99 €/mese')).toBeInTheDocument()
    const bottoni = within(footer).getAllByRole('button')
    expect(bottoni.map((b) => b.textContent)).toEqual(['Prova Plus gratis per 30 giorni', 'Abbonati'])
    expect(bottoni[1].getAttribute('style')).toContain('text-decoration: underline')
    expect(within(footer).getByText('Disdici quando vuoi')).toBeInTheDocument()
    // Il prezzo grande sotto lo slogan non c'è più: il prezzo sta solo nel footer.
    expect(screen.getAllByText('/ mese')).toHaveLength(1)
  })

  it('Plus con la prova già usata: Abbonati torna il pulsante principale, senza la riga della prova', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base')
    const footer = await screen.findByRole('contentinfo')
    expect(within(footer).queryByText('30 giorni gratis, poi 9,99 €/mese')).not.toBeInTheDocument()
    expect(within(footer).getAllByRole('button').map((b) => b.textContent)).toEqual(['Abbonati'])
  })

  it('Salone: 19,99 €, solo Abbonati, e i posti del team con il loro numero', async () => {
    await apri('/impostazioni/abbonamento/salone', 'base', undefined, { provaConcessa: true })
    const footer = await screen.findByRole('contentinfo')
    expect(within(footer).getByText('19,99 €')).toBeInTheDocument()
    expect(within(footer).getAllByRole('button').map((b) => b.textContent)).toEqual(['Abbonati'])
    expect(screen.getByText('Fino a 3 tra collaboratori e soci')).toBeInTheDocument()
    expect(screen.queryByText('Posti extra per il team')).not.toBeInTheDocument()
  })

  it('le funzioni scorrono sopra il footer, con la sfumatura in fondo', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base')
    const lista = await screen.findByTestId('vetrina-scorre')
    expect(lista.getAttribute('style')).toContain('overflow-y: auto')
    expect(screen.getByTestId('vetrina-sfumatura')).toBeInTheDocument()
    expect(lista.contains(screen.getByRole('contentinfo'))).toBe(false)
  })

  it('in grazia il titolare vede l’avviso con il link al Play Store', async () => {
    const stato = statoPiano({ piano: 'salone', stato: 'grazia', fonte: 'play', scadeIl: new Date(2026, 11, 20).toISOString() }, new Date(2026, 10, 2))
    await apri('/impostazioni/abbonamento', 'salone', undefined, { stato })
    expect(await screen.findByText(/Pagamento non riuscito/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Aggiorna il pagamento su Google Play/ })).toHaveAttribute('href', 'https://play.google.com/store/account/subscriptions')
  })

  it('disdetto mostra fino a quando il piano resta attivo', async () => {
    const stato = statoPiano({ piano: 'pro', stato: 'disdetto', fonte: 'play', scadeIl: new Date(2099, 11, 20).toISOString() }, new Date(2026, 10, 2))
    await apri('/impostazioni/abbonamento', 'pro', undefined, { stato })
    expect(await screen.findByText(/Disdetto · attivo fino al/)).toHaveTextContent('20/12/2099')
  })

  it('al collaboratore non compare l’avviso', async () => {
    const stato = statoPiano({ piano: 'salone', stato: 'grazia', fonte: 'play', scadeIl: new Date(2026, 11, 20).toISOString() }, new Date(2026, 10, 2))
    await apri('/impostazioni/abbonamento', 'salone', 'collaboratore', { stato })
    await screen.findByRole('heading', { name: 'Abbonamento' })
    expect(screen.queryByText(/Pagamento non riuscito/)).toBeNull()
  })
})

describe('Abbonamento durante la beta', () => {
  const GIORNO = 24 * 60 * 60 * 1000
  const tra = (giorni: number) => new Date(Date.now() + giorni * GIORNO).toISOString()
  const inBeta = (extra: Partial<PianoValore> = {}): Partial<PianoValore> => ({
    abbonamentiAttivi: false,
    stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: tra(10) }, new Date()),
    traccia: { exBeta: true, betaPiano: 'pro', betaDal: tra(-20), betaFinoAl: tra(10) },
    ...extra,
  })

  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('testata con BETA e giorni, date, barra, feedback e il piano segnato «in beta»', async () => {
    await apri('/impostazioni/abbonamento', 'pro', undefined, inBeta())
    expect(await screen.findByText('BETA · 10 giorni')).toBeInTheDocument()
    expect(screen.getByText(/^Beta gratuita dal .+ al .+\. Nessun rinnovo: poi torni a Go con tutti i tuoi dati\.$/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '10 giorni rimasti' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Invia feedback beta/ })).toHaveAttribute('href', '/impostazioni/beta/feedback')
    expect(screen.getByRole('link', { name: /Groomly Plus/ })).toHaveTextContent('Il tuo piano ora · in beta')
    expect(screen.queryByText('Offerta fondatori')).not.toBeInTheDocument()
  })

  it("con gli abbonamenti spenti i prezzi non si vedono, salvo l'interruttore della beta", async () => {
    await apri('/impostazioni/abbonamento', 'pro', undefined, inBeta())
    expect(await screen.findByRole('link', { name: /Groomly Salon/ })).toHaveTextContent('In arrivo')
    expect(screen.queryByText(/19,99 €/)).not.toBeInTheDocument()
    cleanup()
    localStorage.clear()
    await apri('/impostazioni/abbonamento', 'pro', undefined, inBeta({ configPiani: { ...CONFIG_PIANI_DEFAULT, showPrezziInBeta: true } }))
    expect(await screen.findByRole('link', { name: /Groomly Salon/ })).toHaveTextContent(/19,99 €/)
  })

  it("l'offerta fondatori solo per gli early adopter e con il testo", async () => {
    await apri('/impostazioni/abbonamento', 'pro', undefined, inBeta({
      traccia: { exBeta: true, betaPiano: 'pro', betaDal: tra(-20), betaFinoAl: tra(10), earlyAdopter: true },
      configPiani: { ...CONFIG_PIANI_DEFAULT, offertaEarlyAdopter: { it: '−30% per il primo anno', en: '', es: '' } },
    }))
    expect(await screen.findByText('Offerta fondatori')).toBeInTheDocument()
    expect(screen.getByText('−30% per il primo anno')).toBeInTheDocument()
  })

  it('la scheda «Il tuo piano» delle Impostazioni mostra BETA, la data e la barra; sotto, il feedback', async () => {
    await apri('/impostazioni', 'pro', undefined, inBeta())
    const scheda = await screen.findByRole('link', { name: /^Abbonamento, Il tuo piano, BETA, Beta gratuita · fino al / })
    expect(within(scheda).getByText('BETA')).toBeInTheDocument()
    expect(within(scheda).getByText('10 gg')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Invia feedback beta/ })).toBeInTheDocument()
  })

  it('il collaboratore vede la scheda in beta ma non la riga feedback', async () => {
    await apri('/impostazioni', 'pro', 'collaboratore', inBeta())
    expect(await screen.findByRole('link', { name: /^Abbonamento, Il tuo piano, BETA/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Invia feedback beta/ })).not.toBeInTheDocument()
  })

  it('un ex beta da 10 giorni vede ancora la riga feedback, da 31 no', async () => {
    const finita = (giorni: number): Partial<PianoValore> => ({
      abbonamentiAttivi: false,
      stato: statoPiano({ piano: 'pro', stato: 'scaduto', fonte: 'beta', scadeIl: tra(-giorni) }, new Date()),
      traccia: { exBeta: true, betaPiano: 'pro', betaDal: tra(-giorni - 30), betaFinoAl: tra(-giorni) },
    })
    await apri('/impostazioni', 'base', undefined, finita(10))
    expect(await screen.findByRole('link', { name: /Invia feedback beta/ })).toBeInTheDocument()
    cleanup()
    localStorage.clear()
    await apri('/impostazioni', 'base', undefined, finita(31))
    await screen.findByRole('link', { name: /^Abbonamento/ })
    expect(screen.queryByRole('link', { name: /Invia feedback beta/ })).not.toBeInTheDocument()
  })
})
