import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LINGUE, NOMI_LINGUA } from '../src/i18n/lingua'

const POLICY = ['privacy', 'termini', 'dpa', 'elimina-account']
const RIGA_ITALIANO: Record<string, string> = {
  en: 'If in doubt, the Italian text prevails.',
  es: 'En caso de duda, prevalece el texto italiano.',
  fr: 'En cas de doute, le texte italien fait foi.',
  de: 'Im Zweifel gilt der italienische Text.',
}
// I codici della sezione «Pagine pubbliche e prenotazione» del contratto di T5 che arrivano a pagina.js.
const CODICI = [
  'prenotazioni_spente', 'orario_non_disponibile', 'servizio_non_valido', 'foto_non_valida', 'razza_obbligatoria',
  'animale_non_accettato', 'consenso_mancante', 'nome_non_valido', 'telefono_non_valido', 'email_obbligatoria',
  'richiesta_non_valida', 'troppe_richieste',
]

type Tabella = Record<string, Record<string, unknown>>

function htmlIn(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) htmlIn(full, acc)
    else if (name.endsWith('.html')) acc.push(full)
  }
  return acc
}

/** La tabella delle frasi così com'è scritta nella pagina: da `inizio` alla graffa che chiude prima di `fine`. */
function tabellaDi(sorgente: string, inizio: string, fine: string): Tabella {
  const da = sorgente.indexOf(inizio) + inizio.length - 1
  const a = sorgente.indexOf(fine, da)
  return new Function(`return ${sorgente.slice(da, a + fine.indexOf('}') + 1)}`)() as Tabella
}

function chiaviUguali(tabella: Tabella): void {
  const segnaposto = (valore: unknown) => (JSON.stringify(valore).match(/\{\{\w+\}\}/g) ?? []).sort()
  expect(Object.keys(tabella).sort()).toEqual([...LINGUE].sort())
  const base = Object.keys(tabella.it).sort()
  for (const lingua of LINGUE) {
    expect(Object.keys(tabella[lingua]).sort(), lingua).toEqual(base)
    for (const chiave of base) {
      expect(tabella[lingua][chiave], `${lingua}.${chiave}`).toBeTruthy()
      expect(segnaposto(tabella[lingua][chiave]), `${lingua}.${chiave}`).toEqual(segnaposto(tabella.it[chiave]))
    }
  }
}

describe('tabelle delle pagine', () => {
  const pagina = readFileSync('hosting/s/pagina.js', 'utf8')

  it('pagina.js ha le stesse chiavi e gli stessi segnaposto in cinque lingue', () => {
    chiaviUguali(tabellaDi(pagina, 'var t = {', '\n  }[lang]'))
  })

  it('la disiscrizione dice che anche i promemoria si fermano', () => {
    const pagina = readFileSync('hosting/azione/index.html', 'utf8')
    expect(pagina).toContain('Non riceverai più promemoria né altre mail da questo salone')
    expect(pagina).not.toContain('legate a una tua prenotazione')
  })

  it('chi si disiscrive può tornare dalla stessa pagina', () => {
    const pagina = readFileSync('hosting/azione/index.html', 'utf8')
    expect(pagina).toContain("'riattivaEmail'")
    expect(pagina).toContain('Ho cambiato idea')
  })

  it('azione ha le stesse chiavi in cinque lingue', () => {
    chiaviUguali(tabellaDi(readFileSync('hosting/azione/index.html', 'utf8'), 'const COPY = {', '\n    }[LANG]'))
  })

  it('ogni codice di errore del server ha la sua frase', () => {
    const tabella = tabellaDi(pagina, 'var t = {', '\n  }[lang]')
    const errori = new Function(`return ${(pagina.match(/var ERRORI = (\{[\s\S]*?\n {2}\})/) as RegExpMatchArray)[1]}`)() as Record<string, string>
    expect(Object.keys(errori).sort()).toEqual([...CODICI].sort())
    for (const chiave of Object.values(errori)) expect(tabella.de[chiave], chiave).toBeTruthy()
  })
})

describe('pagine statiche', () => {
  const pagine = htmlIn('hosting')

  it('hanno la riga delle lingue e un blocco per ogni lingua', () => {
    expect(pagine.length).toBeGreaterThan(8)
    for (const file of pagine) {
      const html = readFileSync(file, 'utf8')
      for (const lingua of LINGUE) {
        expect(html, `${file} ${lingua}`).toContain(`<a href="?lang=${lingua}">${NOMI_LINGUA[lingua]}</a>`)
        expect(html, `${file} ${lingua}`).toContain(`data-lang="${lingua}"`)
      }
      expect(html, file).toContain('lingua-pagina.js')
    }
  })

  it('il titolo della scheda esiste in ogni lingua', () => {
    for (const file of pagine) {
      if (file.includes('azione')) continue
      const html = readFileSync(file, 'utf8')
      for (const lingua of LINGUE.filter((voce) => voce !== 'it')) expect(html, `${file} ${lingua}`).toContain(`data-titolo-${lingua}="`)
    }
  })

  it('i link interni portano a pagine che esistono', () => {
    for (const file of pagine) {
      const html = readFileSync(file, 'utf8')
      for (const [, percorso] of html.matchAll(/href="\/([a-z-]+(?:\.html|\/))[#"?]/g)) {
        const pubblicata = percorso.endsWith('/') ? `hosting/${percorso}index.html` : `hosting/${percorso}`
        expect(existsSync(pubblicata), `${file} → ${percorso}`).toBe(true)
      }
    }
  })
})

describe('policy', () => {
  function blocco(html: string, lingua: string): string {
    const inizio = html.indexOf(`<div data-lang="${lingua}"`)
    const prossimo = html.slice(inizio + 1).search(/<div data-lang="/)
    return html.slice(inizio, prossimo === -1 ? undefined : inizio + 1 + prossimo)
  }

  it('in testa, fuori dall’italiano, dicono che fa fede il testo italiano', () => {
    for (const nome of POLICY) {
      const html = readFileSync(`hosting/${nome}/index.html`, 'utf8')
      for (const [lingua, riga] of Object.entries(RIGA_ITALIANO)) {
        const testo = blocco(html, lingua)
        expect(testo.indexOf(riga), `${nome} ${lingua}`).toBeGreaterThan(-1)
        expect(testo.indexOf(riga), `${nome} ${lingua}`).toBeLessThan(testo.indexOf('<h1>'))
      }
    }
  })

  it('hanno la stessa struttura in ogni lingua', () => {
    for (const nome of POLICY) {
      const html = readFileSync(`hosting/${nome}/index.html`, 'utf8')
      const conta = (lingua: string) => ['h2', 'h3', 'li', 'tr', 'table'].map((tag) => (blocco(html, lingua).match(new RegExp(`<${tag}[ >]`, 'g')) ?? []).length)
      for (const lingua of LINGUE) expect(conta(lingua), `${nome} ${lingua}`).toEqual(conta('it'))
    }
  })

  it('le copie restano uguali alle pagine pubblicate', () => {
    for (const nome of POLICY) {
      expect(readFileSync(`docs/legal/${nome}.html`, 'utf8'), nome).toBe(readFileSync(`hosting/${nome}/index.html`, 'utf8'))
    }
    expect(readFileSync('hosting/privacy.html', 'utf8')).toBe(readFileSync('hosting/privacy/index.html', 'utf8'))
  })
})

describe('regola di lingua di lingua-pagina.js', () => {
  const SCRIPT = readFileSync('hosting/lingua-pagina.js', 'utf8')

  afterEach(() => {
    vi.unstubAllGlobals()
    document.title = ''
    document.documentElement.removeAttribute('data-titolo-fr')
  })

  function apri(query: string, browser: string): string {
    vi.stubGlobal('navigator', { language: browser })
    history.replaceState(null, '', `/${query}`)
    document.body.innerHTML = LINGUE.map((lingua) => `<div data-lang="${lingua}"></div>`).join('')
    ;(0, eval)(SCRIPT)
    return document.documentElement.lang
  }

  it('?lang=, poi browser, poi inglese', () => {
    expect(apri('?lang=fr', 'it-IT')).toBe('fr')
    expect(apri('?lang=de', 'en-GB')).toBe('de')
    expect(apri('?lang=it', 'de-DE')).toBe('it')
    expect(apri('', 'fr-CH')).toBe('fr')
    expect(apri('', 'de')).toBe('de')
    expect(apri('?lang=pt', 'es-ES')).toBe('es')
    expect(apri('', 'pt-BR')).toBe('en')
    expect(apri('?lang=pt', 'sv')).toBe('en')
    expect(apri('', '')).toBe('en')
  })

  it('mostra solo il blocco della lingua e cambia il titolo', () => {
    document.documentElement.setAttribute('data-titolo-fr', 'Fiche — Groomly')
    apri('?lang=fr', 'it-IT')
    const visibili = Array.from(document.querySelectorAll<HTMLElement>('[data-lang]')).filter((nodo) => !nodo.hidden)
    expect(visibili.map((nodo) => nodo.dataset.lang)).toEqual(['fr'])
    expect(document.title).toBe('Fiche — Groomly')
  })

  it('i link del sito tengono lingua e parametri', () => {
    vi.stubGlobal('navigator', { language: 'de-DE' })
    history.replaceState(null, '', '/azione?mode=resetPassword&oobCode=abc')
    document.body.innerHTML = '<a id="fr" href="?lang=fr">Français</a><a id="dpa" href="/dpa/#modello-de">AVV</a>'
    ;(0, eval)(SCRIPT)
    expect(document.getElementById('fr')?.getAttribute('href')).toBe('/azione?lang=fr&mode=resetPassword&oobCode=abc')
    expect(document.getElementById('dpa')?.getAttribute('href')).toContain('lang=de')
    expect(document.getElementById('dpa')?.getAttribute('href')).toContain('#modello-de')
  })
})
