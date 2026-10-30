// @vitest-environment happy-dom
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../src/app/App'
import { createAppointment } from '../src/data/local/appointments'
import { createAccount } from '../src/data/local/auth'
import { createDog, listDogs } from '../src/data/local/dogs'
import { getSettings } from '../src/data/local/settings'
import { storageKeys, writeJson } from '../src/data/local/storage'
import { en } from '../src/i18n/en'
import { es } from '../src/i18n/es'
import { it as frasiIt } from '../src/i18n/it'
import type { DogWrite } from '../src/types/models'

type Voce = Record<string, unknown>
const voci: Voce[] = []

const ROUTES = [
  '/',
  '/animali',
  '/animali/nuovo',
  '/calendario',
  '/mensili',
  '/incassi',
  '/incassi/report',
  '/incassi/statistiche',
  '/listino',
  '/listino/vedi',
  '/listino/prezzi',
  '/listino/gestione',
  '/listino/stampa',
  '/impostazioni',
  '/impostazioni/account',
  '/impostazioni/suggerimenti',
  '/impostazioni/legale',
  '/impostazioni/licenze',
  '/impostazioni/info',
  '/impostazioni/servizi',
  '/impostazioni/archivio',
  '/impostazioni/pro',
  '/impostazioni/piano',
  '/impostazioni/team',
  '/impostazioni/messaggi',
  '/impostazioni/strumenti',
  '/impostazioni/notifiche',
  '/impostazioni/aggiornamenti',
  '/impostazioni/utenti',
  '/impostazioni/privacy',
  '/impostazioni/account/elimina',
]

function cane(nome: string, telefono: string): DogWrite {
  return {
    name: nome,
    species: 'cane',
    breed: 'Barbone',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Giulia', phone: telefono },
  }
}

function frasiDiverse(pagina: string, lingua: 'en' | 'es'): string[] {
  const altro = lingua === 'en' ? en : es
  const viste = new Set<string>()
  for (const [chiave, valore] of Object.entries(frasiIt) as [keyof typeof frasiIt, string][]) {
    if (typeof valore !== 'string' || valore.length < 12 || valore.includes('{{')) continue
    if (valore === altro[chiave]) continue
    if (pagina.includes(valore)) viste.add(valore)
  }
  return [...viste]
}

function testiVisibili(): string {
  return document.body.innerText.replace(/\s+/g, ' ').trim()
}

function dialoghi(): { nome: string; fisso: boolean; nelGuscio: boolean }[] {
  return [...document.querySelectorAll('[role="dialog"]')].map((nodo) => {
    const stile = (nodo as HTMLElement).getAttribute('style') ?? ''
    const guscio = nodo.closest('[data-testid="phone-shell"]')
    return {
      nome: nodo.getAttribute('aria-label') ?? '',
      fisso: stile.includes('position: fixed') || stile.includes('position:fixed'),
      nelGuscio: guscio !== null,
    }
  })
}

function indietro(): string[] {
  return [...document.querySelectorAll('a, button')]
    .map((nodo) => (nodo.getAttribute('aria-label') || nodo.textContent || '').replace(/\s+/g, ' ').trim())
    .filter((nome) => /indietro|back|atrás|atras|impostazioni|settings|ajustes/i.test(nome))
}

async function apri(percorso: string, lingua: 'it' | 'en' | 'es') {
  localStorage.setItem('groomly.lingua', lingua)
  let errore = ''
  let vista
  try {
    vista = render(<App memory isDev={false} initialPath={percorso} />)
    await screen.findByRole('heading', {}, { timeout: 4000 }).catch(() => null)
  } catch (error) {
    errore = error instanceof Error ? error.message : String(error)
  }
  const testo = testiVisibili()
  const voce: Voce = {
    percorso,
    lingua,
    errore,
    titolo: document.querySelector('h1')?.textContent?.trim() ?? '',
    indietro: indietro(),
    dialoghi: dialoghi(),
    italiano: lingua === 'it' ? [] : frasiDiverse(testo, lingua),
    caratteri: testo.length,
  }
  voci.push(voce)
  vista?.unmount()
  return voce
}

describe('audit 360', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('isola venti saloni e percorre route, strumenti, suggerimenti e backup', async () => {
    const account = await createAccount('audit@salone.it', 'segretissimo', { firstName: 'Ada', lastName: 'Neri' })
    const nomi: string[] = []
    for (let indice = 0; indice < 20; indice += 1) {
      const uid = indice === 7 ? account.uid : `salon-${indice}`
      const nome = `CaneSalone${indice}`
      nomi.push(nome)
      const dog = createDog(uid, cane(nome, `33300000${indice}`))
      createAppointment(uid, {
        dogId: dog.id,
        start: new Date('2026-10-26T09:00:00'),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 10 + indice }],
      })
      const settings = getSettings(uid)
      writeJson(storageKeys.settings(uid), {
        ...settings,
        business: { ...settings.business, salonName: `Toelettatura ${indice}` },
      })
    }
    expect(listDogs(account.uid).map((dog) => dog.name)).toEqual(['CaneSalone7'])
    expect(listDogs('salon-0').map((dog) => dog.name)).toEqual(['CaneSalone0'])
    expect(listDogs('salon-19').map((dog) => dog.name)).toEqual(['CaneSalone19'])

    localStorage.setItem('groomly.lingua', 'it')
    const animali = render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByText('CaneSalone7')).toBeInTheDocument()
    const testoAnimali = testiVisibili()
    const estranei = nomi.filter((nome) => nome !== 'CaneSalone7' && testoAnimali.includes(nome))
    const saloniEstranei = Array.from({ length: 20 }, (_, indice) => `Toelettatura ${indice}`).filter((nome) => nome !== 'Toelettatura 7' && testoAnimali.includes(nome))
    voci.push({ tipo: 'isolamento', estranei, saloniEstranei, mio: 'CaneSalone7' })
    animali.unmount()

    for (const lingua of ['it', 'en', 'es'] as const) {
      for (const percorso of ROUTES) {
        await apri(percorso, lingua)
      }
    }

    const user = userEvent.setup()
    localStorage.setItem('groomly.lingua', 'it')
    const strumenti = render(<App memory isDev={false} initialPath="/impostazioni/strumenti" />)
    expect(await screen.findByRole('heading', { name: 'Strumenti' })).toBeInTheDocument()
    const esiti: Voce[] = []
    const prova = screen.queryByRole('button', { name: 'Prova Pro gratis per 30 giorni' })
    if (prova) {
      await user.click(prova)
      esiti.push({ controllo: 'Prova Pro gratis', dialoghi: dialoghi(), testo: testiVisibili().slice(0, 500) })
      const chiudi = screen.queryByRole('button', { name: 'Chiudi' })
      if (chiudi) await user.click(chiudi)
    } else {
      esiti.push({ controllo: 'Prova Pro gratis', assente: true })
    }
    for (const nome of ['Promemoria', 'Cane pronto', 'Richiamo', 'Auguri', 'Pagella', 'Tessera fedeltà', 'Prenotazioni online', 'Lista d’attesa', 'Recensione Google', 'Statistiche', 'Email', 'Copie delle foto']) {
      const bottone = screen.queryByRole('button', { name: new RegExp(nome) })
      if (!bottone) {
        esiti.push({ controllo: nome, assente: true })
        continue
      }
      await user.click(bottone)
      esiti.push({ controllo: nome, dialoghi: dialoghi(), fisso: dialoghi().some((d) => d.fisso) })
      const chiudi = screen.queryByRole('button', { name: 'Chiudi' })
      if (chiudi) await user.click(chiudi)
    }
    for (const nome of ['Messaggi WhatsApp', 'Affidabilità']) {
      const interruttore = screen.getByRole('switch', { name: nome })
      const prima = interruttore.getAttribute('aria-checked')
      await user.click(interruttore)
      esiti.push({ controllo: nome, prima, dopo: interruttore.getAttribute('aria-checked') })
    }
    esiti.push({ controllo: 'WhatsApp automatico', testo: screen.queryByText('Da sviluppare') ? 'Da sviluppare' : 'manca' })
    voci.push({ tipo: 'strumenti', esiti })
    strumenti.unmount()

    localStorage.setItem('groomly.lingua', 'en')
    const messaggi = render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    const linkMessaggi = screen.queryByRole('link', { name: /Reminders and messages/ })
    if (linkMessaggi) await user.click(linkMessaggi)
    voci.push({
      tipo: 'promemoria-messaggi',
      titolo: document.querySelector('h1')?.textContent?.trim() ?? '',
      indietro: indietro(),
      guscio: document.querySelector('[data-testid="phone-shell"]') !== null,
      italiano: frasiDiverse(testiVisibili(), 'en'),
    })
    messaggi.unmount()

    localStorage.setItem('groomly.lingua', 'en')
    const suggerimenti = render(<App memory isDev={false} initialPath="/impostazioni/suggerimenti" />)
    await screen.findByRole('heading', {}, { timeout: 4000 }).catch(() => null)
    voci.push({
      tipo: 'suggerimenti',
      titolo: document.querySelector('h1')?.textContent?.trim() ?? '',
      aree: document.querySelectorAll('textarea').length,
      categorie: [...document.querySelectorAll('button')].map((nodo) => nodo.textContent?.trim()).filter(Boolean),
      italiano: frasiDiverse(testiVisibili(), 'en'),
      testo: testiVisibili().slice(0, 800),
    })
    suggerimenti.unmount()

    localStorage.setItem('groomly.lingua', 'en')
    const backup = render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    const tastoBackup = screen.getByRole('button', { name: /^Backup/ })
    await user.click(tastoBackup)
    const foglio = await screen.findByRole('dialog')
    voci.push({
      tipo: 'backup',
      nomeDialogo: foglio.getAttribute('aria-label'),
      bottoni: [...foglio.querySelectorAll('button')].map((nodo) => (nodo.getAttribute('aria-label') || nodo.textContent || '').replace(/\s+/g, ' ').trim()),
      italiano: frasiDiverse(foglio.textContent ?? '', 'en'),
      testo: (foglio.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 1200),
    })
    backup.unmount()

    const letterali: { file: string; testo: string }[] = []
    const radice = join(process.cwd(), 'src')
    const pile = [radice]
    const valoriIt = new Set(
      Object.entries(frasiIt)
        .filter(([chiave, valore]) => typeof valore === 'string' && valore.length >= 14 && valore !== (en as Record<string, string>)[chiave] && !valore.includes('{{'))
        .map(([, valore]) => valore as string),
    )
    while (pile.length > 0) {
      const dir = pile.pop()!
      for (const nome of readdirSync(dir)) {
        const pieno = join(dir, nome)
        if (statSync(pieno).isDirectory()) {
          pile.push(pieno)
          continue
        }
        if (!pieno.endsWith('.tsx') || pieno.includes('.test.')) continue
        const sorgente = readFileSync(pieno, 'utf8')
        for (const valore of valoriIt) {
          if (sorgente.includes(`'${valore}'`) || sorgente.includes(`"${valore}"`) || sorgente.includes(`\`${valore}\``)) {
            letterali.push({ file: pieno.slice(radice.length + 1).replaceAll('\\', '/'), testo: valore })
          }
        }
      }
    }
    voci.push({ tipo: 'italiano-nel-codice', letterali })

    expect(voci.length).toBeGreaterThan(10)
  }, 180_000)
})

afterEach(() => {
  try {
    mkdirSync(join(process.cwd(), 'docs'), { recursive: true })
    writeFileSync(join(process.cwd(), 'docs', 'audit-360-macchina.json'), JSON.stringify(voci, null, 2))
  } catch {
    // il rapporto si scrive anche se un controllo si interrompe
  }
})
