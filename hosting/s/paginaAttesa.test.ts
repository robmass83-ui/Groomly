import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { campiDaChiedere, mostraPulsante } from '../../src/lib/listaAttesaPagina'

const settimana = { inizio: '2026-11-02', fine: '2026-11-08' }
const prossima = { inizio: '2026-11-09', fine: '2026-11-15' }

describe('pulsante «Lista d’attesa» sulla riga della settimana', () => {
  it('una settimana senza giorni con orari mostra il pulsante', () => {
    expect(mostraPulsante([], settimana)).toBe(true)
  })

  it('una settimana che contiene un giorno con orari non lo mostra, un’altra settimana piena sì', () => {
    const giorni = ['2026-11-04']
    expect(mostraPulsante(giorni, settimana)).toBe(false)
    expect(mostraPulsante(giorni, prossima)).toBe(true)
  })
})

describe('campi della lista', () => {
  it('con nome ed email già scritti chiede solo cellulare e nome del cane, mai razza o foto', () => {
    const campi = campiDaChiedere({ nome: 'Anna', email: 'a@b.it' })
    expect(campi).toEqual(['phone', 'nomeCane'])
    expect(campi).not.toContain('razza' as never)
    expect(campi).not.toContain('foto' as never)
  })
})

// La pagina vera, in jsdom: lo script statico gira su un profilo finto e su un fetch finto.
const SCRIPT = readFileSync('hosting/s/pagina.js', 'utf8')
const TOKEN = 'ab'.repeat(16)
const CATALOGO = [{
  id: 'bagno',
  nome: 'Bagno',
  kind: 'principale',
  minuti: { piccola: 30, media: 45, grande: 60 },
  prezzo: { piccola: 20, media: 28, grande: 38 },
}]

type Corpo = Record<string, unknown>
type Risposte = Record<string, (corpo: Corpo) => unknown>

interface Pagina {
  chiamate: Array<{ funzione: string, corpo: Corpo }>
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function apri(opzioni: { attesa?: boolean, lang?: 'it' | 'en' | 'es', token?: string, risposte?: Risposte } = {}): Promise<Pagina> {
  const pagina: Pagina = { chiamate: [] }
  const risposte = opzioni.risposte ?? {}
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: { body: string }) => {
    const funzione = String(url).split('/').pop() as string
    const corpo = (JSON.parse(init.body) as { data: Corpo }).data
    pagina.chiamate.push({ funzione, corpo })
    const risposta = risposte[funzione]
    return { ok: true, json: async () => ({ result: risposta ? risposta(corpo) : { ok: false, errore: 'token' } }) }
  }))
  history.replaceState(null, '', opzioni.token ? `/?attesa=${opzioni.token}` : '/')
  const profilo = { lang: opzioni.lang ?? 'it', nome: 'I Pelosetti', prenotabile: true, attesa: opzioni.attesa ?? true, salonId: 's1', specie: ['cane', 'gatto', 'altro'] }
  document.body.innerHTML = '<main><section id="prenota"></section></main>'
  const dati = document.createElement('script')
  dati.type = 'application/json'
  dati.id = 'profilo'
  dati.textContent = JSON.stringify(profilo)
  const catalogo = document.createElement('script')
  catalogo.type = 'application/json'
  catalogo.id = 'catalogo'
  catalogo.textContent = JSON.stringify(CATALOGO)
  document.body.append(dati, catalogo)
  ;(0, eval)(SCRIPT)
  await flush()
  return pagina
}

function bottone(testo: string): HTMLButtonElement {
  const trovato = Array.from(document.querySelectorAll('button')).find((nodo) => nodo.textContent === testo)
  if (!trovato) throw new Error(`manca il pulsante «${testo}»`)
  return trovato
}

async function scegliServizio(): Promise<void> {
  bottone('Cane').click()
  bottone('Media').click()
  const radio = document.querySelector('input[name="principale"]') as HTMLInputElement
  radio.checked = true
  radio.dispatchEvent(new Event('change'))
  await flush()
}

function scrivi(id: string, valore: string): void {
  const campo = document.getElementById(id) as HTMLInputElement
  campo.value = valore
  campo.dispatchEvent(new Event('input'))
}

function invia(): void {
  const form = document.getElementById('lista-attesa') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { cancelable: true }))
}

const testoPagina = () => document.body.textContent ?? ''
const righeLista = () => Array.from(document.querySelectorAll('button.lista-riga')) as HTMLButtonElement[]

describe('la pagina pubblica con la lista d’attesa', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-04T08:00:00.000Z'))
    ;(window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  const giorni = (mappa: Record<string, string[]>): Risposte => ({ postiLiberi: () => ({ giorni: mappa }) })

  it('un pulsante su ogni riga Lun–Dom piena del mese, mai dentro una cella e mai sulla riga con un orario', async () => {
    await apri({ risposte: giorni({ '2026-11-04': ['10:00'], '2026-11-20': ['09:00'] }) })
    await scegliServizio()
    // Novembre 2026: la riga del 26 ott–1 nov è già passata, quella del 2–8 e quella del 16–22 hanno un orario.
    const righe = righeLista()
    expect(righe.map((nodo) => nodo.getAttribute('aria-label'))).toEqual([
      'Lista d’attesa, 9 novembre – 15 novembre',
      'Lista d’attesa, 23 novembre – 29 novembre',
      'Lista d’attesa, 30 novembre – 6 dicembre',
    ])
    expect(righe.every((nodo) => nodo.textContent === 'Lista d’attesa' && nodo.parentElement?.classList.contains('griglia'))).toBe(true)
    expect(document.querySelectorAll('.giorno .lista-riga')).toHaveLength(0)
    // Ogni pulsante chiude la sua riga: dopo la domenica o dopo l’ultimo giorno del mese.
    expect(righe.map((nodo) => nodo.previousElementSibling?.textContent)).toEqual(['15', '29', '30'])
  })

  it('un giorno con orari in un altro mese conta per la sua settimana: i giorni sono tutta la mappa', async () => {
    await apri({ risposte: giorni({ '2026-11-04': ['10:00'], '2026-12-01': ['09:00'] }) })
    await scegliServizio()
    // Il 30 nov–6 dic ha un orario il 1 dicembre, anche se la riga è quella di novembre.
    expect(righeLista().map((nodo) => nodo.getAttribute('aria-label'))).not.toContain('Lista d’attesa, 30 novembre – 6 dicembre')
    expect(righeLista()).toHaveLength(3)
  })

  it('senza giorni la frase resta e c’è un solo pulsante, che non chiede un giorno', async () => {
    await apri({ risposte: giorni({}) })
    await scegliServizio()
    expect(testoPagina()).toContain('In queste settimane non ci sono orari liberi.')
    expect(righeLista()).toHaveLength(1)
    expect(righeLista()[0].textContent).toBe('Lista d’attesa')
    righeLista()[0].click()
    expect(document.getElementById('lista-attesa')).not.toBeNull()
    expect(document.querySelector('.giorno')).toBeNull()
  })

  it('con la lista spenta non c’è nessun pulsante, né con giorni né senza', async () => {
    await apri({ attesa: false, risposte: giorni({ '2026-11-04': ['10:00'] }) })
    await scegliServizio()
    expect(righeLista()).toHaveLength(0)
    await apri({ attesa: false, risposte: giorni({}) })
    await scegliServizio()
    expect(righeLista()).toHaveLength(0)
    expect(testoPagina()).toContain('In queste settimane non ci sono orari liberi.')
  })

  it('lingue: il pulsante parla inglese e spagnolo', async () => {
    for (const [lang, voce, cane, media] of [['en', 'Waiting list', 'Dog', 'Medium'], ['es', 'Lista de espera', 'Perro', 'Mediano']] as const) {
      await apri({ lang, risposte: giorni({}) })
      bottone(cane).click()
      bottone(media).click()
      const radio = document.querySelector('input[name="principale"]') as HTMLInputElement
      radio.checked = true
      radio.dispatchEvent(new Event('change'))
      await flush()
      expect(righeLista()[0].textContent).toBe(voce)
    }
  })

  it('il modulo chiede quello che manca, senza consenso non invia, poi manda i dati senza razza né foto', async () => {
    const pagina = await apri({
      risposte: { ...giorni({}), iscrivitiAttesa: () => ({ ok: true, iscrittoId: 'x1' }) },
    })
    await scegliServizio()
    righeLista()[0].click()
    const campi = Array.from(document.querySelectorAll('#lista-attesa input')).map((nodo) => nodo.id)
    expect(campi).toEqual(['lista-nome', 'lista-telefono', 'lista-email', 'lista-cane', 'lista-consenso'])
    expect(document.getElementById('razza')).toBeNull()
    expect(document.querySelector('#lista-attesa input[type="file"]')).toBeNull()

    scrivi('lista-nome', 'Mario Rossi')
    scrivi('lista-email', 'mario@example.com')
    scrivi('lista-telefono', '333 1234567')
    scrivi('lista-cane', 'Rex')
    invia()
    await flush()
    expect(pagina.chiamate.some((chiamata) => chiamata.funzione === 'iscrivitiAttesa')).toBe(false)
    expect(testoPagina()).toContain('Serve il consenso per inviare la richiesta.')

    ;(document.getElementById('lista-consenso') as HTMLInputElement).click()
    invia()
    await flush()
    const invio = pagina.chiamate.filter((chiamata) => chiamata.funzione === 'iscrivitiAttesa')
    expect(invio).toHaveLength(1)
    expect(invio[0].corpo).toEqual({
      salonId: 's1',
      nome: 'Mario Rossi',
      phone: '333 1234567',
      email: 'mario@example.com',
      nomeCane: 'Rex',
      specie: 'cane',
      taglia: 'media',
      servizioIds: ['bagno'],
      consenso: true,
    })
    expect(testoPagina()).toContain('Sei in lista. Se si libera un posto ti arriva una mail.')
  })

  it('dopo aver scritto nome ed email il modulo chiede solo cellulare e nome del cane', async () => {
    await apri({ risposte: giorni({}) })
    await scegliServizio()
    righeLista()[0].click()
    scrivi('lista-nome', 'Mario Rossi')
    scrivi('lista-email', 'mario@example.com')
    invia()
    await flush()
    righeLista()[0].click()
    const campi = Array.from(document.querySelectorAll('#lista-attesa input')).map((nodo) => nodo.id)
    expect(campi).toEqual(['lista-telefono', 'lista-cane', 'lista-consenso'])
  })

  it('se il servizio è spento sul server, lo dice e non finge l’iscrizione', async () => {
    await apri({ risposte: { ...giorni({}), iscrivitiAttesa: () => ({ ok: false, errore: 'spento' }) } })
    await scegliServizio()
    righeLista()[0].click()
    scrivi('lista-nome', 'Mario Rossi')
    scrivi('lista-telefono', '333 1234567')
    scrivi('lista-email', 'mario@example.com')
    scrivi('lista-cane', 'Rex')
    ;(document.getElementById('lista-consenso') as HTMLInputElement).click()
    invia()
    await flush()
    expect(testoPagina()).toContain('La lista d’attesa non è attiva.')
    expect(testoPagina()).not.toContain('Sei in lista.')
  })
})

describe('la pagina del link ?attesa=', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-04T08:00:00.000Z'))
    ;(window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    history.replaceState(null, '', '/')
  })

  const visto = (motivo: string) => ({ ok: true, esito: 'visto', motivo, giorno: '2026-12-02', ora: '10:00' })

  it('con il posto libero chiede se confermare, e Conferma porta in agenda', async () => {
    const pagina = await apri({
      token: TOKEN,
      risposte: { confermaAttesa: (corpo) => (corpo.azione === 'leggi' ? visto('libero') : { ok: true, esito: 'confermato', appointmentId: 'a', dogId: 'd' }) },
    })
    expect(pagina.chiamate[0]).toEqual({ funzione: 'confermaAttesa', corpo: { salonId: 's1', token: TOKEN, azione: 'leggi' } })
    const blocco = document.getElementById('attesa-link')!
    expect(blocco.textContent).toContain('Il posto è ancora libero. Vuoi confermare?')
    expect(Array.from(blocco.querySelectorAll('button')).map((nodo) => nodo.textContent)).toEqual(['Conferma', 'Rifiuta'])
    expect(blocco.textContent).toContain('10:00')
    bottone('Conferma').click()
    await flush()
    expect(pagina.chiamate[1].corpo.azione).toBe('conferma')
    expect(blocco.textContent).toContain('Sei in agenda. Il salone ti aspetta.')
    expect(blocco.querySelector('button')).toBeNull()
  })

  it('Rifiuta lascia in lista', async () => {
    const pagina = await apri({
      token: TOKEN,
      risposte: { confermaAttesa: (corpo) => (corpo.azione === 'leggi' ? visto('libero') : { ok: true, esito: 'rifiutato' }) },
    })
    bottone('Rifiuta').click()
    await flush()
    expect(pagina.chiamate[1].corpo.azione).toBe('rifiuta')
    expect(document.getElementById('attesa-link')!.textContent).toContain('Resti in lista.')
  })

  it('se mentre si guarda il posto è stato preso, Conferma porta alla proposta di restare', async () => {
    await apri({
      token: TOKEN,
      risposte: { confermaAttesa: (corpo) => (corpo.azione === 'leggi' ? visto('libero') : { ok: true, esito: 'occupato' }) },
    })
    bottone('Conferma').click()
    await flush()
    const blocco = document.getElementById('attesa-link')!
    expect(blocco.textContent).toContain('Il posto è già stato occupato.')
    expect(Array.from(blocco.querySelectorAll('button')).map((nodo) => nodo.textContent)).toEqual(['Sì, resto', 'No'])
  })

  it.each(['occupato', 'non_ci_sta', 'passato'])('con motivo %s dice occupato e propone di restare, Sì resto e No funzionano', async (motivo) => {
    const pagina = await apri({
      token: TOKEN,
      risposte: {
        confermaAttesa: (corpo) => {
          if (corpo.azione === 'leggi') return visto(motivo)
          // Sul posto già preso «resta» risponde «visto» e non scrive: l’iscritto era già in lista.
          return corpo.azione === 'resta' ? visto(motivo) : { ok: true, esito: 'uscito' }
        },
      },
    })
    const blocco = document.getElementById('attesa-link')!
    expect(blocco.textContent).toContain('Il posto è già stato occupato.')
    expect(blocco.textContent).toContain('Vuoi restare in lista d’attesa per un possibile prossimo buco?')
    expect(blocco.textContent).not.toContain('Vuoi confermare?')
    expect(Array.from(blocco.querySelectorAll('button')).map((nodo) => nodo.textContent)).toEqual(['Sì, resto', 'No'])
    bottone('Sì, resto').click()
    await flush()
    expect(pagina.chiamate[1].corpo.azione).toBe('resta')
    expect(blocco.textContent).toContain('Resti in lista.')
  })

  it('No esce dalla lista', async () => {
    const pagina = await apri({
      token: TOKEN,
      risposte: { confermaAttesa: (corpo) => (corpo.azione === 'leggi' ? visto('occupato') : { ok: true, esito: 'uscito' }) },
    })
    bottone('No').click()
    await flush()
    expect(pagina.chiamate[1].corpo.azione).toBe('esci')
    expect(document.getElementById('attesa-link')!.textContent).toContain('Sei uscito dalla lista.')
  })

  it('il calendario si apre sul mese e sul giorno dell’offerta', async () => {
    await apri({
      token: TOKEN,
      risposte: {
        confermaAttesa: () => visto('libero'),
        postiLiberi: () => ({ giorni: { '2026-11-04': ['10:00'], '2026-12-02': ['10:00', '11:00'] } }),
      },
    })
    await scegliServizio()
    expect(document.querySelector('.cal-nav p')!.textContent).toBe('dicembre 2026')
    const premuto = Array.from(document.querySelectorAll('.giorno[aria-pressed="true"]'))
    expect(premuto.map((nodo) => nodo.textContent)).toEqual(['02'])
  })

  it('token cattivo o servizio spento sul server: frasi dedicate, senza pulsanti', async () => {
    await apri({ token: TOKEN, risposte: { confermaAttesa: () => ({ ok: false, errore: 'token' }) } })
    expect(document.getElementById('attesa-link')!.textContent).toContain('Questo link non è più valido.')
    expect(document.querySelector('#attesa-link button')).toBeNull()
    await apri({ token: TOKEN, risposte: { confermaAttesa: () => ({ ok: false, errore: 'spento' }) } })
    expect(document.getElementById('attesa-link')!.textContent).toContain('La lista d’attesa non è attiva.')
    const corto = await apri({ token: 'corto' })
    expect(document.getElementById('attesa-link')!.textContent).toContain('Questo link non è più valido.')
    expect(corto.chiamate).toHaveLength(0)
  })

  it('con la lista spenta nel profilo il link non offre la conferma e non chiama il server', async () => {
    const pagina = await apri({ attesa: false, token: TOKEN, risposte: { confermaAttesa: () => visto('libero') } })
    expect(pagina.chiamate).toHaveLength(0)
    expect(document.getElementById('attesa-link')!.textContent).toContain('La lista d’attesa non è attiva.')
    expect(document.getElementById('attesa-link')!.textContent).not.toContain('Conferma')
  })

  it('lingue: inglese e spagnolo sul link', async () => {
    await apri({ lang: 'en', token: TOKEN, risposte: { confermaAttesa: () => visto('libero') } })
    expect(document.getElementById('attesa-link')!.textContent).toContain('The place is still free. Do you want to confirm?')
    expect(bottone('Decline')).toBeTruthy()
    await apri({ lang: 'es', token: TOKEN, risposte: { confermaAttesa: () => visto('occupato') } })
    expect(document.getElementById('attesa-link')!.textContent).toContain('El sitio ya está ocupado.')
    expect(bottone('Sí, me quedo')).toBeTruthy()
  })
})
